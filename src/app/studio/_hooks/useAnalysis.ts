"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";

/**
 * Extract frames from a video element using canvas (client-side).
 * Used for uploaded videos to avoid Vercel's 4.5MB payload limit.
 */
function extractFramesClientSide(
  videoUrl: string,
  maxFrames = 30
): Promise<{ frames: string[]; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || duration <= 0) {
        reject(new Error("Could not read video duration"));
        return;
      }

      const canvas = document.createElement("canvas");
      // Small thumbnails for preview (same as server generates)
      canvas.width = 120;
      canvas.height = Math.round(120 * (video.videoHeight / video.videoWidth));
      const ctx = canvas.getContext("2d")!;

      const interval = duration / maxFrames;
      const frames: string[] = [];
      let currentTime = 0;

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.5));

        currentTime += interval;
        if (currentTime < duration && frames.length < maxFrames) {
          video.currentTime = currentTime;
        } else {
          resolve({ frames, duration });
        }
      };

      video.currentTime = 0;
    };

    video.onerror = () => reject(new Error("Failed to load video"));
    video.src = videoUrl;
  });
}

/**
 * Extract audio from a video as base64-encoded WAV.
 * Accepts a File object OR a video URL (blob: or remote https:).
 * Uses Web Audio API to decode the video's audio track.
 * Returns undefined if the video has no audio or extraction fails.
 */
async function extractAudioBase64(source: File | string): Promise<string | undefined> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (source instanceof File) {
      arrayBuffer = await source.arrayBuffer();
    } else {
      // Fetch from URL (blob: or remote)
      const res = await fetch(source);
      if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);
      arrayBuffer = await res.arrayBuffer();
    }

    const audioCtx = new AudioContext({ sampleRate: 16000 }); // 16kHz mono for speech
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    // Convert to mono WAV — cap at 90 seconds to stay within payload limits
    const channelData = audioBuffer.getChannelData(0);
    const maxSamples = 16000 * 90; // 90s at 16kHz
    const trimmedData = channelData.length > maxSamples
      ? channelData.slice(0, maxSamples)
      : channelData;
    const wavBuffer = encodeWav(trimmedData, 16000);

    // Convert to base64
    const bytes = new Uint8Array(wavBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn("[useAnalysis] Audio extraction failed (video may have no audio track):", err);
    return undefined;
  }
}

/**
 * Encode raw PCM float32 samples into a WAV file ArrayBuffer.
 */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // PCM samples (float32 -> int16)
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function useAnalysis() {
  const { s, dispatch } = useStudio();

  const extractFrames = useCallback(async () => {
    dispatch({ type: "SET_ANALYZING", v: true });
    dispatch({ type: "SET_AUDIO_EXTRACTED", v: null });

    try {
      if (s.sourceType === "upload" && s.uploadedVideoUrl) {
        // ── Uploaded video: extract thumbnails client-side, analyze via URL ──
        // 1. Extract small thumbnails client-side for preview strip
        const { frames: thumbs, duration } = await extractFramesClientSide(
          s.uploadedVideoUrl, 30
        );
        dispatch({ type: "SET_FRAMES", frames: thumbs });

        // 2. Extract hi-res frames + audio client-side for analysis
        // Use File object if available, otherwise fetch from URL (blob: or remote)
        const audioSource = s.uploadedVideoFile || s.uploadedVideoUrl;
        const [hiResFrames, audioBase64] = await Promise.all([
          extractFramesHiRes(s.uploadedVideoUrl, 30),
          audioSource
            ? extractAudioBase64(audioSource)
            : Promise.resolve(undefined),
        ]);

        dispatch({ type: "SET_AUDIO_EXTRACTED", v: !!audioBase64 });

        // 3. Check AI provider — if Claude, transcribe audio separately first
        //    This splits audio and frames into two requests to stay within Vercel's 4.5MB body limit
        let transcript: string | undefined;
        let sendAudio = audioBase64;

        try {
          const settingsRes = await fetch("/api/settings");
          const settings = await settingsRes.json();
          if (settings.aiProvider === "claude" && audioBase64) {
            // Transcribe audio via Groq Whisper in a separate request
            const transcribeRes = await fetch("/api/studio/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: audioBase64 }),
            });
            if (transcribeRes.ok) {
              const { transcript: t } = await transcribeRes.json();
              transcript = t;
            }
            // Don't send audio to analyze — send transcript instead
            sendAudio = undefined;
          }
        } catch {
          // Settings fetch failed — fall through with audio as-is
        }

        const analyzeRes = await fetch("/api/studio/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frames: hiResFrames,
            fps: hiResFrames.length / Math.max(duration, 1),
            duration,
            audio: sendAudio,
            transcript,
          }),
        });

        if (!analyzeRes.ok) {
          const err = await analyzeRes.json();
          throw new Error(err.error || "Analysis failed");
        }
        const analysis = await analyzeRes.json();
        dispatch({ type: "SET_ANALYSIS", analysis });
        dispatch({ type: "SET_ANALYZING", v: false });
        return;

      } else if (s.sourceType === "db" && s.selectedAdVideoUrl) {
        // ── DB video: server handles everything via URL ──
        const extractRes = await fetch("/api/studio/extract-frames", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: s.selectedAdVideoUrl, analyze: true }),
        });
        if (!extractRes.ok) {
          const err = await extractRes.json();
          throw new Error(err.error || "Frame extraction failed");
        }
        const data = await extractRes.json();
        dispatch({ type: "SET_FRAMES", frames: data.frames });

        if (data.analysis) {
          dispatch({ type: "SET_ANALYSIS", analysis: data.analysis });
          dispatch({ type: "SET_ANALYZING", v: false });
        } else if (data.analysisError) {
          dispatch({ type: "SET_ANALYZE_ERROR", error: data.analysisError });
        } else {
          dispatch({ type: "SET_ANALYZE_ERROR", error: "No analysis returned" });
        }

      } else {
        throw new Error("No video source selected");
      }
    } catch (err) {
      dispatch({
        type: "SET_ANALYZE_ERROR",
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }, [s.sourceType, s.selectedAdVideoUrl, s.uploadedVideoUrl, s.uploadedVideoFile, dispatch]);

  return { extractFrames };
}

/**
 * Extract higher-resolution frames client-side for direct Gemini analysis.
 * Used as fallback when video is too large to upload through Vercel.
 * Frames are 480px wide — good enough for Gemini, small enough for API payload.
 */
function extractFramesHiRes(
  videoUrl: string,
  maxFrames = 30
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = Math.round(480 * (video.videoHeight / video.videoWidth));
      const ctx = canvas.getContext("2d")!;

      const interval = duration / maxFrames;
      const frames: string[] = [];
      let currentTime = 0;

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.6));

        currentTime += interval;
        if (currentTime < duration && frames.length < maxFrames) {
          video.currentTime = currentTime;
        } else {
          resolve(frames);
        }
      };

      video.currentTime = 0;
    };

    video.onerror = () => reject(new Error("Failed to load video"));
    video.src = videoUrl;
  });
}
