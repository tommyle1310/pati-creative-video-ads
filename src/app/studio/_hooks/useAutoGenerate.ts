"use client";

import { useState, useCallback, useRef } from "react";
import { useStudio } from "../_state/context";
import type { VideoAnalysis, StoryboardScene, ScriptScene } from "@/lib/studio/types";
import { pollJob, pollKieJob, pcmToWav, resizeImageForApi } from "../_utils/helpers";

// ── Phase types ──────────────────────────────────────────────

export type AutoPhase =
  | "idle"
  | "analyzing"
  | "scripting"
  | "storyboarding"
  | "uploading-refs"
  | "generating-images"
  | "generating-audio"
  | "generating-videos"
  | "complete"
  | "error";

const PHASE_LABELS: Record<AutoPhase, string> = {
  idle: "Ready",
  analyzing: "Analyzing video",
  scripting: "Generating script",
  storyboarding: "Creating storyboard",
  "uploading-refs": "Uploading references",
  "generating-images": "Generating images",
  "generating-audio": "Generating audio",
  "generating-videos": "Generating videos",
  complete: "Complete",
  error: "Error",
};

const PHASE_ORDER: AutoPhase[] = [
  "analyzing",
  "scripting",
  "storyboarding",
  "uploading-refs",
  "generating-images",
  "generating-audio",
  "generating-videos",
  "complete",
];

export interface AutoProgress {
  phase: AutoPhase;
  phaseLabel: string;
  stepIndex: number;
  totalSteps: number;
  detail: string;
}

// ── Client-side frame extraction ─────────────────────────────

function extractFramesThumbnails(
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

function extractFramesHiRes(
  videoUrl: string,
  maxFrames = 20
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const canvas = document.createElement("canvas");
      // Keep frames under Claude's 5MB per-image limit: 360px wide, 0.5 quality
      canvas.width = 360;
      canvas.height = Math.round(360 * (video.videoHeight / video.videoWidth));
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
          resolve(frames);
        }
      };
      video.currentTime = 0;
    };
    video.onerror = () => reject(new Error("Failed to load video"));
    video.src = videoUrl;
  });
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

async function extractAudioBase64(
  videoFile: File
): Promise<string | undefined> {
  try {
    const arrayBuffer = await videoFile.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();
    const channelData = audioBuffer.getChannelData(0);
    const maxSamples = 16000 * 90;
    const trimmedData =
      channelData.length > maxSamples
        ? channelData.slice(0, maxSamples)
        : channelData;
    const wavBuffer = encodeWav(trimmedData, 16000);
    const bytes = new Uint8Array(wavBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return undefined;
  }
}

// ── Strategy auto-detection ──────────────────────────────────

const MOTIVATOR_KEYWORDS: Record<string, string[]> = {
  "pain-point": ["pain", "frustrat", "struggle", "problem", "agitat", "tired of"],
  aspiration: ["aspir", "transform", "dream", "desire", "pleasure", "imagin", "result"],
  "social-proof": ["social proof", "everyone", "people", "reviews", "testimonial", "million"],
  curiosity: ["curiosity", "secret", "didn't know", "information gap"],
  urgency: ["urgen", "scarci", "fear", "fomo", "limited", "last chance"],
  identity: ["identity", "persona", "who you are", "tribe", "community"],
  "feature-led": ["feature", "attribute", "specification", "ingredient", "formula"],
  "problem-solution": ["problem.?solution", "before.?after", "PAS", "bridge"],
  authority: ["authority", "expert", "doctor", "scientist", "credib", "research"],
  comparison: ["comparison", "versus", "vs\\.?", "competitor", "better than"],
};

const TONE_KEYWORDS: Record<string, string[]> = {
  inspirational: ["inspir", "transform", "aspir", "motivat", "empower"],
  relatable: ["relat", "pain", "problem", "frustrat", "struggle", "empathy"],
  urgent: ["urgen", "scarci", "limited", "countdown", "fomo"],
  calm: ["calm", "reassur", "trust", "premium", "serene"],
  humorous: ["humor", "funny", "satir", "comedy", "laugh"],
  educational: ["educat", "inform", "learn", "explain", "science"],
  emotional: ["emotion", "heartfelt", "sentimental", "touching"],
};

const STORYLINE_KEYWORDS: Record<string, string[]> = {
  "founder-story": ["founder", "origin", "why.?creat", "started"],
  "day-in-the-life": ["day.?in", "routine", "lifestyle", "daily"],
  "problem-solution": ["problem.?solution", "before.?after", "PAS", "AIDA"],
  "things-you-didnt-know": ["didn't know", "surprising", "fact", "myth"],
  "behind-the-scenes": ["behind.?the", "how it's made", "BTS"],
  testimonial: ["testimonial", "review", "UGC", "customer.?story"],
  unboxing: ["unboxing", "first impression", "discovery", "reveal"],
};

function detectMatch(
  text: string,
  keywords: Record<string, string[]>
): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  let bestMatch = "";
  let bestScore = 0;
  for (const [value, patterns] of Object.entries(keywords)) {
    let score = 0;
    for (const pattern of patterns) {
      if (new RegExp(pattern, "i").test(lower)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = value;
    }
  }
  return bestMatch;
}

function detectStrategy(analysis: VideoAnalysis) {
  const ad = analysis.adAnalysis;
  if (!ad) return { motivator: "", emotionalTone: "", storylineType: "" };
  const combined = [ad.hookType, ad.primaryAngle, ad.psychology, ad.hook, ad.concept].join(" ");
  return {
    motivator: detectMatch(combined, MOTIVATOR_KEYWORDS),
    emotionalTone: detectMatch(combined, TONE_KEYWORDS),
    storylineType: detectMatch(
      [ad.frameworkName, ad.creativePattern, ad.scriptBreakdown].join(" "),
      STORYLINE_KEYWORDS
    ),
  };
}

// ── Gender detection from analysis ───────────────────────────

const MALE_KEYWORDS = /\b(man|male|guy|him|his|he|boy|bro|dude|gentleman|husband|father|dad|muscular man)\b/i;
const FEMALE_KEYWORDS = /\b(woman|female|girl|her|she|lady|wife|mother|mom|sister)\b/i;

function detectGender(analysis: VideoAnalysis): "male" | "female" | "unknown" {
  // Check scene breakdowns for character descriptions
  const text = (analysis.sceneBreakdown || [])
    .map((s) => `${s.visual || ""} ${s.speech || ""}`)
    .join(" ");
  const allText = `${text} ${analysis.musicAndPacing || ""}`;
  const maleCount = (allText.match(MALE_KEYWORDS) || []).length;
  const femaleCount = (allText.match(FEMALE_KEYWORDS) || []).length;
  if (maleCount > femaleCount) return "male";
  if (femaleCount > maleCount) return "female";
  return "unknown";
}

// Default voice picks by gender (Gemini voices)
const VOICE_BY_GENDER: Record<string, { voice: string; name: string }> = {
  male: { voice: "Puck", name: "Puck" },
  female: { voice: "Kore", name: "Kore" },
  unknown: { voice: "Zephyr", name: "Zephyr" },
};

// ── Clothing variation per scene ─────────────────────────────

const OUTFIT_POOL = [
  "casual white t-shirt and jeans",
  "fitted black tank top and joggers",
  "light blue button-up shirt, sleeves rolled up",
  "cozy cream sweater and dark pants",
  "athletic wear, compression top",
  "olive green hoodie, relaxed fit",
  "grey henley shirt and khakis",
  "navy polo and chinos",
  "denim jacket over plain tee",
  "linen shirt, relaxed summer look",
  "striped casual shirt and shorts",
  "workout tank and leggings",
  "soft pink blouse and dark jeans",
  "oversized knit sweater, cozy vibes",
  "sporty zip-up jacket, athleisure",
];

function getOutfitForScene(sceneIndex: number): string {
  return OUTFIT_POOL[sceneIndex % OUTFIT_POOL.length];
}

// ── Concurrency helper ───────────────────────────────────────

async function runConcurrent<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  maxConcurrent: number
) {
  const queue = [...items];
  const running = new Set<Promise<void>>();
  while (queue.length > 0 || running.size > 0) {
    while (queue.length > 0 && running.size < maxConcurrent) {
      const item = queue.shift()!;
      const p = fn(item).finally(() => running.delete(p));
      running.add(p);
    }
    if (running.size > 0) await Promise.race(running);
  }
}

// ── Main hook ────────────────────────────────────────────────

export function useAutoGenerate() {
  const { s, dispatch } = useStudio();
  const [phase, setPhase] = useState<AutoPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const abortRef = useRef(false);

  const isRunning =
    phase !== "idle" && phase !== "complete" && phase !== "error";

  const progress: AutoProgress = {
    phase,
    phaseLabel: PHASE_LABELS[phase],
    stepIndex: PHASE_ORDER.indexOf(phase),
    totalSteps: PHASE_ORDER.length,
    detail,
  };

  const startAutoGenerate = useCallback(async () => {
    abortRef.current = false;
    setError(null);
    setDetail("");

    // Snapshot state at start (these won't change during pipeline)
    const videoUrl = s.uploadedVideoUrl;
    const videoFile = s.uploadedVideoFile;
    // Resize images to stay under Claude's 5MB per-image limit
    const productImage = s.productImage
      ? await resizeImageForApi(s.productImage)
      : null;
    const creatorImage = s.creatorImage
      ? await resizeImageForApi(s.creatorImage)
      : null;
    // All product images for reference (KIE image_input)
    const allProductImages = s.productImages || [];
    const productInfo = s.productInfo;
    const bigIdea = s.bigIdea;
    const targetAudience = s.targetAudience;
    const aspectRatio = s.aspectRatio;
    let voice = s.voice;
    let voiceSource = s.voiceSource;
    const imageModel = s.imageModel;
    const videoModel = s.videoModel;
    let motivator = s.motivator;
    let emotionalTone = s.emotionalTone;
    let storylineType = s.storylineType;

    if (!videoUrl) {
      setError("Upload a video first");
      setPhase("error");
      return;
    }
    if (!productImage) {
      setError("Select a product image first");
      setPhase("error");
      return;
    }
    if (!bigIdea) {
      setError("Enter a Big Idea / Core Message first");
      setPhase("error");
      return;
    }

    try {
      // ═══════════════════════════════════════════════════════
      // PHASE 1: ANALYZE VIDEO
      // ═══════════════════════════════════════════════════════
      setPhase("analyzing");
      setDetail("Extracting frames from video...");
      dispatch({ type: "SET_ANALYZING", v: true });

      const [thumbResult, hiResFrames, audioBase64] = await Promise.all([
        extractFramesThumbnails(videoUrl, 20),
        extractFramesHiRes(videoUrl, 20),
        videoFile ? extractAudioBase64(videoFile) : Promise.resolve(undefined),
      ]);
      dispatch({ type: "SET_FRAMES", frames: thumbResult.frames });
      if (abortRef.current) { dispatch({ type: "SET_ANALYZING", v: false }); return; }

      setDetail("AI analyzing video structure...");

      // Transcribe audio separately if needed
      let transcript: string | undefined;
      let sendAudio = audioBase64;
      try {
        const settingsRes = await fetch("/api/settings");
        const settings = await settingsRes.json();
        if (settings.aiProvider === "claude" && audioBase64) {
          const transcribeRes = await fetch("/api/studio/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: audioBase64 }),
          });
          if (transcribeRes.ok) {
            transcript = (await transcribeRes.json()).transcript;
          }
          sendAudio = undefined;
        }
      } catch { /* fall through */ }

      const analyzeRes = await fetch("/api/studio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frames: hiResFrames,
          fps: hiResFrames.length / Math.max(thumbResult.duration, 1),
          duration: thumbResult.duration,
          audio: sendAudio,
          transcript,
        }),
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({}));
        throw new Error(err.error || `Analysis failed (${analyzeRes.status})`);
      }
      const analysis: VideoAnalysis = await analyzeRes.json();
      dispatch({ type: "SET_ANALYSIS", analysis });
      dispatch({ type: "SET_ANALYZING", v: false });
      if (abortRef.current) return;

      // Auto-detect creative strategy
      const detected = detectStrategy(analysis);
      if (detected.motivator && !motivator) {
        motivator = detected.motivator;
        dispatch({ type: "SET_FIELD", field: "motivator", value: motivator });
      }
      if (detected.emotionalTone && !emotionalTone) {
        emotionalTone = detected.emotionalTone;
        dispatch({ type: "SET_FIELD", field: "emotionalTone", value: emotionalTone });
      }
      if (detected.storylineType && !storylineType) {
        storylineType = detected.storylineType;
        dispatch({ type: "SET_FIELD", field: "storylineType", value: storylineType });
      }

      // Auto-detect character gender → pick matching voice
      const detectedGender = detectGender(analysis);
      if (voiceSource === "gemini") {
        const genderVoice = VOICE_BY_GENDER[detectedGender];
        voice = genderVoice.voice;
        voiceSource = "gemini";
        dispatch({ type: "SET_FIELD", field: "voice", value: voice });
        dispatch({ type: "SET_FIELD", field: "voiceName", value: genderVoice.name });
      }

      // ═══════════════════════════════════════════════════════
      // PHASE 2: GENERATE SCRIPT
      // ═══════════════════════════════════════════════════════
      setPhase("scripting");
      setDetail("AI writing adapted script...");

      const scriptRes = await fetch("/api/studio/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          bigIdea,
          productImage,
          productInfo,
          targetAudience,
          creatorImage,
          motivator,
          emotionalTone,
          storylineType,
        }),
      });
      if (!scriptRes.ok) {
        const err = await scriptRes.json().catch(() => ({}));
        throw new Error(err.error || `Script generation failed (${scriptRes.status})`);
      }
      const { scenes: scriptScenes } = (await scriptRes.json()) as {
        scenes: ScriptScene[];
      };
      dispatch({ type: "SET_SCRIPT_SCENES", scriptScenes });
      if (abortRef.current) return;

      // ═══════════════════════════════════════════════════════
      // PHASE 3: GENERATE STORYBOARD
      // ═══════════════════════════════════════════════════════
      setPhase("storyboarding");
      setDetail("AI creating storyboard with prompts...");

      const scriptText = scriptScenes
        .map((sc, i) => `Scene ${i + 1} [${sc.sceneType}]: ${sc.dialogue}`)
        .join("\n");

      const storyboardRes = await fetch("/api/studio/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          script: scriptText,
          productImage,
          productInfo,
          targetAudience,
          creatorImage,
          motivator,
          emotionalTone,
          storylineType,
        }),
      });
      if (!storyboardRes.ok) {
        const err = await storyboardRes.json().catch(() => ({}));
        throw new Error(err.error || `Storyboard failed (${storyboardRes.status})`);
      }
      const { scenes: storyboardScenes } = (await storyboardRes.json()) as {
        scenes: StoryboardScene[];
      };
      dispatch({ type: "SET_SCENES", scenes: storyboardScenes });
      if (abortRef.current) return;

      // ═══════════════════════════════════════════════════════
      // PHASE 4: UPLOAD REFERENCE IMAGES
      // ═══════════════════════════════════════════════════════
      setPhase("uploading-refs");
      setDetail("Uploading product & creator references...");

      let productUrl: string | null = null;
      let creatorUrl: string | null = null;

      // Upload primary product image
      if (productImage) {
        const res = await fetch("/api/studio/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: productImage }),
        });
        if (res.ok) {
          productUrl = (await res.json()).url;
          dispatch({ type: "SET_VIDTORY_URLS", product: productUrl || undefined });
        }
      }
      // Upload additional product images for better reference matching
      const additionalProductUrls: string[] = [];
      for (const img of allProductImages) {
        if (img === productImage) continue; // skip primary (already uploaded)
        try {
          const res = await fetch("/api/studio/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: img }),
          });
          if (res.ok) {
            const { url } = await res.json();
            if (url) additionalProductUrls.push(url);
          }
        } catch { /* skip failed uploads */ }
      }
      if (creatorImage) {
        const res = await fetch("/api/studio/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: creatorImage }),
        });
        if (res.ok) {
          creatorUrl = (await res.json()).url;
          dispatch({ type: "SET_VIDTORY_URLS", creator: creatorUrl || undefined });
        }
      }
      if (abortRef.current) return;

      // ═══════════════════════════════════════════════════════
      // PHASE 5: GENERATE ALL IMAGES
      // ═══════════════════════════════════════════════════════
      setPhase("generating-images");
      const totalScenes = storyboardScenes.length;
      let imagesGenerated = 0;
      setDetail(`0 / ${totalScenes} scenes`);

      // Local tracker for selectedImageForVideo per scene
      const sceneImageMap = new Map<string, string>();

      // Map scene id → index for clothing variation
      const sceneIndexMap = new Map<string, number>();
      storyboardScenes.forEach((sc, i) => sceneIndexMap.set(sc.id, i));

      await runConcurrent(
        storyboardScenes,
        async (scene: StoryboardScene) => {
          if (abortRef.current) return;
          dispatch({
            type: "UPDATE_SCENE",
            id: scene.id,
            patch: { isGeneratingImage: true, imageGenerationError: null },
          });

          try {
            let prompt =
              typeof scene.imagePrompt === "object"
                ? JSON.stringify(scene.imagePrompt)
                : scene.imagePrompt;
            const rollType = scene.rollType || "broll";
            const sceneIdx = sceneIndexMap.get(scene.id) || 0;

            // Vary clothing per scene — prevents all scenes having same outfit
            const outfit = getOutfitForScene(sceneIdx);
            prompt += `\n\nCharacter is wearing: ${outfit}.`;

            if (rollType === "aroll") {
              if (!prompt.toLowerCase().startsWith("hyperrealistic"))
                prompt = `Hyperrealistic photography. ${prompt}`;
            } else {
              // B-roll / C-roll: natural, candid, NO eye contact, NO talking
              prompt += "\nIMPORTANT: The person is NOT looking at the camera. Eyes look away, down, or at the product. Candid, natural moment — NOT posed. Mouth is closed, relaxed neutral expression. No exaggerated emotions, no wide eyes, no surprise face. Natural and authentic lifestyle photography.";
            }
            if (scene.imageFocusObject)
              prompt = `Focus on: ${scene.imageFocusObject}. ${prompt}`;
            if (scene.imageCameraAngle)
              prompt = `${scene.imageCameraAngle} shot. ${prompt}`;

            // Try KIE (nano-banana-pro) first, fallback to Vidtory on failure
            let imageUrl: string;
            try {
              const kieRes = await fetch("/api/studio/kie-generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt,
                  aspectRatio,
                  characterUrl: creatorUrl,
                  productUrl,
                }),
              });
              if (!kieRes.ok) throw new Error((await kieRes.json()).error);
              const { jobId: kieJobId } = await kieRes.json();
              imageUrl = await pollKieJob(kieJobId, 5000, 300000);
            } catch (kieErr) {
              console.warn("[auto] KIE image failed, falling back to Vidtory:", kieErr);
              const vidRes = await fetch("/api/studio/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt,
                  aspectRatio,
                  characterUrl: creatorUrl,
                  productUrl,
                }),
              });
              if (!vidRes.ok) throw new Error((await vidRes.json()).error);
              const { jobId: vidJobId } = await vidRes.json();
              imageUrl = await pollJob(vidJobId, 5000, 300000);
            }

            sceneImageMap.set(scene.id, imageUrl);

            dispatch({
              type: "UPDATE_SCENE",
              id: scene.id,
              patch: {
                images: [imageUrl],
                selectedImageForVideo: imageUrl,
                isGeneratingImage: false,
              },
            });

            imagesGenerated++;
            setDetail(`${imagesGenerated} / ${totalScenes} scenes`);
          } catch (err) {
            dispatch({
              type: "UPDATE_SCENE",
              id: scene.id,
              patch: {
                isGeneratingImage: false,
                imageGenerationError:
                  err instanceof Error ? err.message : "Failed",
              },
            });
            imagesGenerated++;
            setDetail(`${imagesGenerated} / ${totalScenes} scenes`);
          }
        },
        3 // max 3 concurrent
      );
      if (abortRef.current) return;

      // ═══════════════════════════════════════════════════════
      // PHASE 6: GENERATE ALL AUDIO
      // ═══════════════════════════════════════════════════════
      setPhase("generating-audio");
      let audioGenerated = 0;
      setDetail(`0 / ${totalScenes} scenes`);

      await runConcurrent(
        storyboardScenes,
        async (scene: StoryboardScene) => {
          if (abortRef.current) return;
          dispatch({
            type: "UPDATE_SCENE",
            id: scene.id,
            patch: { isGeneratingAudio: true, audioGenerationError: null },
          });

          try {
            let audioUrl: string;

            // KIE outputs 5s video clips. Audio must fit within 5s.
            // At ~3 words/sec, that's ~15 words max. Trim only if over.
            const MAX_CLIP_SECONDS = 5;
            const MAX_WORDS = Math.round(MAX_CLIP_SECONDS * 3);
            const words = scene.voiceoverScript.split(/\s+/);
            const trimmedScript =
              words.length > MAX_WORDS
                ? words.slice(0, MAX_WORDS).join(" ")
                : scene.voiceoverScript;
            const pacingGuide = `Deliver ALL words within ${MAX_CLIP_SECONDS} seconds. No long pauses, no trailing silence. Punchy natural delivery. ${scene.voiceoverGuide || ""}`.trim();

            if (voiceSource === "elevenlabs") {
              const res = await fetch("/api/studio/elevenlabs-tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: trimmedScript,
                  voice_id: voice,
                }),
              });
              if (!res.ok) throw new Error((await res.json()).error);
              const { audioBase64: ab } = await res.json();
              audioUrl = `data:audio/mpeg;base64,${ab}`;
            } else {
              const res = await fetch("/api/studio/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: trimmedScript,
                  guide: pacingGuide,
                  voice,
                }),
              });
              if (!res.ok) throw new Error((await res.json()).error);
              const { audioBase64: ab } = await res.json();
              audioUrl = pcmToWav(ab);
            }

            dispatch({
              type: "UPDATE_SCENE",
              id: scene.id,
              patch: { audioUrl, isGeneratingAudio: false },
            });

            audioGenerated++;
            setDetail(`${audioGenerated} / ${totalScenes} scenes`);
          } catch (err) {
            dispatch({
              type: "UPDATE_SCENE",
              id: scene.id,
              patch: {
                isGeneratingAudio: false,
                audioGenerationError:
                  err instanceof Error ? err.message : "Failed",
              },
            });
            audioGenerated++;
            setDetail(`${audioGenerated} / ${totalScenes} scenes`);
          }
        },
        3 // max 3 concurrent
      );
      if (abortRef.current) return;

      // ═══════════════════════════════════════════════════════
      // PHASE 7: GENERATE ALL VIDEOS
      // ═══════════════════════════════════════════════════════
      setPhase("generating-videos");
      const scenesWithImages = storyboardScenes.filter(
        (sc) => sceneImageMap.has(sc.id)
      );
      let videosGenerated = 0;
      setDetail(`0 / ${scenesWithImages.length} scenes`);

      await runConcurrent(
        scenesWithImages,
        async (scene: StoryboardScene) => {
          if (abortRef.current) return;
          const startImageUrl = sceneImageMap.get(scene.id);
          if (!startImageUrl) return;

          dispatch({
            type: "UPDATE_SCENE",
            id: scene.id,
            patch: { isGeneratingVideo: true, videoGenerationError: null },
          });

          try {
            const vpStr =
              typeof scene.videoPrompt === "object"
                ? JSON.stringify(scene.videoPrompt)
                : scene.videoPrompt;
            const rollType = scene.rollType || "broll";
            const allowLipsync =
              rollType === "aroll" && scene.includeDialogueInPrompt;

            let prompt = `Motion/Action: ${vpStr}`;
            if (allowLipsync) {
              prompt = `The creator is speaking.\n${prompt}`;
              prompt += `\nDialogue in English: "${scene.voiceoverScript}"`;
            }
            if (rollType !== "aroll") {
              // B/C-roll: absolutely NO talking, NO eye contact, natural candid
              prompt +=
                "\n\nCRITICAL: The subject does NOT speak. Mouth stays CLOSED at all times. No lip movement whatsoever. No lip sync. No dialogue. The subject does NOT look at the camera — eyes look away, down, or at an object. Relaxed neutral expression, no exaggerated emotions, no wide eyes. Candid natural movement only.";
            }
            prompt +=
              "\n\nAUDIO CONSTRAINT: Absolutely NO background music. NO ambient sounds. NO sound effects. Complete silence. No Music Background.";
            if (rollType === "aroll") {
              if (!prompt.includes("Shot on"))
                prompt +=
                  "\nShot on iPhone 15 Pro, portrait mode, f/1.8. 1600 ISO grain. No color grade. Unfiltered.";
            } else {
              if (!prompt.includes("Shot on"))
                prompt +=
                  "\nPhotorealistic, shot on Sony A7IV, 85mm lens, natural color grading. Lifestyle cinematography.";
            }

            // Try KIE (kling-3.0) first, fallback to Vidtory on failure
            let videoUrl: string;
            try {
              const kieRes = await fetch("/api/studio/kie-generate-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt,
                  aspectRatio,
                  startImageUrl,
                  duration: 5,
                  mode: "std",
                }),
              });
              if (!kieRes.ok) throw new Error((await kieRes.json()).error);
              const { jobId: kieJobId } = await kieRes.json();
              dispatch({
                type: "UPDATE_SCENE",
                id: scene.id,
                patch: { videoJobId: kieJobId },
              });
              videoUrl = await pollKieJob(kieJobId, 10000, 900000);
            } catch (kieErr) {
              console.warn("[auto] KIE video failed, falling back to Vidtory:", kieErr);
              const vidRes = await fetch("/api/studio/generate-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt,
                  aspectRatio,
                  startImageUrl,
                  duration: 5,
                }),
              });
              if (!vidRes.ok) throw new Error((await vidRes.json()).error);
              const { jobId: vidJobId } = await vidRes.json();
              dispatch({
                type: "UPDATE_SCENE",
                id: scene.id,
                patch: { videoJobId: vidJobId },
              });
              videoUrl = await pollJob(vidJobId, 10000, 900000);
            }

            dispatch({
              type: "UPDATE_SCENE",
              id: scene.id,
              patch: {
                videos: [{ url: videoUrl, mediaGenerationId: "auto", seed: 0 }],
                isGeneratingVideo: false,
              },
            });

            videosGenerated++;
            setDetail(`${videosGenerated} / ${scenesWithImages.length} scenes`);
          } catch (err) {
            dispatch({
              type: "UPDATE_SCENE",
              id: scene.id,
              patch: {
                isGeneratingVideo: false,
                videoGenerationError:
                  err instanceof Error ? err.message : "Failed",
              },
            });
            videosGenerated++;
            setDetail(`${videosGenerated} / ${scenesWithImages.length} scenes`);
          }
        },
        2 // max 2 concurrent (videos are heavier)
      );

      // ═══════════════════════════════════════════════════════
      // DONE
      // ═══════════════════════════════════════════════════════
      setPhase("complete");
      setDetail("All assets generated!");
      dispatch({ type: "SET_STEP", step: 7 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
      setPhase("error");
      dispatch({ type: "SET_ANALYZING", v: false });
    }
  }, [
    s.uploadedVideoUrl,
    s.uploadedVideoFile,
    s.productImage,
    s.productInfo,
    s.bigIdea,
    s.targetAudience,
    s.creatorImage,
    s.aspectRatio,
    s.voice,
    s.voiceSource,
    s.imageModel,
    s.videoModel,
    s.motivator,
    s.emotionalTone,
    s.storylineType,
    dispatch,
  ]);

  const cancelAutoGenerate = useCallback(() => {
    abortRef.current = true;
    setPhase("idle");
    setDetail("");
    dispatch({ type: "SET_ANALYZING", v: false });
  }, [dispatch]);

  return {
    phase,
    error,
    detail,
    isRunning,
    progress,
    startAutoGenerate,
    cancelAutoGenerate,
  };
}
