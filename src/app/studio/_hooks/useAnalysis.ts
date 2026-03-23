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

export function useAnalysis() {
  const { s, dispatch } = useStudio();

  const extractFrames = useCallback(async () => {
    dispatch({ type: "SET_ANALYZING", v: true });

    try {
      if (s.sourceType === "upload" && s.uploadedVideoUrl) {
        // ── Uploaded video: extract thumbnails client-side, analyze via URL ──
        // 1. Extract small thumbnails client-side for preview strip
        const { frames: thumbs, duration } = await extractFramesClientSide(
          s.uploadedVideoUrl, 30
        );
        dispatch({ type: "SET_FRAMES", frames: thumbs });

        // 2. Extract hi-res frames client-side and analyze via Gemini
        // (works on Vercel — no FFmpeg dependency)
        const hiResFrames = await extractFramesHiRes(s.uploadedVideoUrl, 30);

        const analyzeRes = await fetch("/api/studio/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frames: hiResFrames,
            fps: hiResFrames.length / Math.max(duration, 1),
            duration,
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
