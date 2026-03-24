"use client";

import { useCallback, useEffect, useRef } from "react";
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

// Removed — outfits are now embedded in BROLL_SCENES to match context

// ── B/C-roll activity pool ─────────────────────────────────
// Each entry: { img: static description, video: specific motion for Kling }
// Video motion must be VERY specific so Kling doesn't guess silly actions.

const BROLL_SCENES = [
  {
    outfit: "casual white t-shirt and dark jeans, barefoot",
    img: "standing at a kitchen counter, one hand resting on the counter, looking down at a cutting board with vegetables",
    video: "The person slowly picks up a knife and begins slicing a cucumber on the cutting board. Small deliberate cuts. Other hand holds the cucumber steady. Head stays looking down at hands. No expression change.",
  },
  {
    outfit: "comfortable grey sweatshirt and joggers, hair tied back",
    img: "sitting at a desk with a laptop open, one hand on the trackpad, looking at the screen",
    video: "The person scrolls slowly on the laptop trackpad with their right index finger. Left hand rests on the desk. Eyes fixed on screen. Slight nod as if reading something interesting. No smile, neutral focus.",
  },
  {
    outfit: "athletic tank top, leggings, running shoes, hair in ponytail",
    img: "standing in a gym near equipment, holding a water bottle at waist level, looking off to the side",
    video: "The person slowly lifts the water bottle to their lips and takes a small sip. Lowers the bottle back down. Eyes stay looking to the side. Breathing is calm. No expression change.",
  },
  {
    outfit: "light jacket, casual pants, clean sneakers",
    img: "walking on a sidewalk, mid-stride, looking slightly downward ahead",
    video: "The person continues walking forward at a steady pace. Arms swing naturally at their sides. Eyes look ahead and slightly down at the path. Hair moves slightly with the stride. Natural walking rhythm.",
  },
  {
    outfit: "oversized knit sweater and soft lounge pants, cozy socks",
    img: "sitting on a couch, leaning back slightly, holding a phone in one hand looking at it",
    video: "The person's thumb slowly scrolls up on the phone screen. Eyes are fixed on the phone. After a moment, they tilt the phone slightly. Body stays relaxed and still. No smile, just casual scrolling.",
  },
  {
    outfit: "soft cotton robe over pyjama top, hair slightly messy",
    img: "standing in a kitchen, both hands around a coffee mug, looking out a window, early morning light",
    video: "The person slowly raises the coffee mug to their lips, takes a small sip, then lowers it back. Eyes stay fixed on the window. Steam rises from the mug. Body is still, calm morning moment.",
  },
  {
    outfit: "fitted sports bra and yoga leggings, barefoot",
    img: "on a yoga mat in a living room, in a standing position with hands at sides, looking at the floor",
    video: "The person slowly bends forward into a forward fold, hands reaching toward the floor. Movement is slow and controlled. Head drops down following the spine. Smooth continuous motion.",
  },
  {
    outfit: "casual striped shirt and chinos, comfortable flats",
    img: "at a grocery store, pushing a cart, looking at products on a shelf",
    video: "The person reaches out with one hand and picks up a product from the shelf. They look at it briefly, then place it in the cart. Eyes stay on the shelf and product. Natural shopping movement.",
  },
  {
    outfit: "athletic shorts, compression top, running shoes",
    img: "sitting on a bench outdoors in a park, tying a running shoe, head looking down at the shoe",
    video: "The person pulls the shoelace tight with both hands, makes a loop, and ties a bow. Fingers work methodically. Head stays down looking at the shoe. Then they pat the shoe and begin to stand up.",
  },
  {
    outfit: "soft cotton pyjamas, bare feet, relaxed morning look",
    img: "in a bedroom, making the bed, hands smoothing out the sheet, looking down",
    video: "The person smooths the bedsheet with both palms, moving from center outward. Then they pick up a pillow and place it at the headboard. Eyes stay on the bed. Slow domestic movement.",
  },
  {
    outfit: "button-up shirt with sleeves rolled up, dark trousers",
    img: "at a desk in a home office, writing in a notebook with a pen, leaning slightly forward",
    video: "The person writes slowly in the notebook. Pen moves across the page in small strokes. Other hand holds the notebook edge. Eyes follow the pen tip. Head tilts slightly as they write.",
  },
  {
    outfit: "plain t-shirt, comfortable at-home shorts",
    img: "standing in front of a bathroom mirror, hands at the sink, looking at own reflection",
    video: "The person turns on the faucet, cups water in their hands, and splashes it on their face. Then they reach for a towel and pat their face dry. Eyes look at their reflection between actions.",
  },
  {
    outfit: "lightweight hoodie, comfortable joggers, sneakers",
    img: "in a park, sitting on grass, legs crossed, hands resting on knees, looking at trees",
    video: "The person shifts weight slightly, looks around at the trees. Hands stay on knees. Head turns slowly from left to right taking in the scenery. A calm reflective moment. Minimal movement.",
  },
  {
    outfit: "fitted workout tee, gym shorts, cross-training shoes",
    img: "in a home gym, standing next to a rack of dumbbells, one hand reaching for a weight",
    video: "The person grips a dumbbell and lifts it off the rack with one hand. They bring it to shoulder height in a slow curl. Then lower it back down. Eyes stay on the weight. Controlled motion.",
  },
  {
    outfit: "linen shirt, relaxed-fit chinos, bare feet on tile floor",
    img: "leaning against a kitchen counter, arms crossed, looking at something off-screen to the left",
    video: "The person uncrosses their arms slowly, reaches for a glass of water on the counter, takes a sip, then sets it down. Eyes stay looking to the left. Relaxed posture throughout. No smile.",
  },
];

function getBrollScene(sceneIndex: number): { outfit: string; img: string; video: string } {
  return BROLL_SCENES[sceneIndex % BROLL_SCENES.length];
}

// ── Infer outfit from scene description ──────────────────────

function inferOutfitFromScene(visual: string): string {
  const v = visual.toLowerCase();
  if (/gym|workout|exercise|dumbbell|push.?up|squat|deadlift|bench|weight/i.test(v))
    return "athletic tank top, leggings or gym shorts, training shoes";
  if (/yoga|stretch|mat|meditat/i.test(v))
    return "fitted sports top, yoga leggings, barefoot";
  if (/run|jog|sprint|trail|park.*walk/i.test(v))
    return "athletic shorts, running top, running shoes";
  if (/kitchen|cook|chop|stir|stove|counter|breakfast|coffee|mug/i.test(v))
    return "casual t-shirt and jeans, barefoot or slippers";
  if (/bed|morning|wake|pillow|pyjama|alarm/i.test(v))
    return "soft pyjamas or sleep shirt, bare feet";
  if (/bathroom|mirror|brush|wash|shower/i.test(v))
    return "plain t-shirt or tank top, comfortable shorts";
  if (/office|desk|laptop|computer|work|typing/i.test(v))
    return "smart-casual button-up or sweater, comfortable trousers";
  if (/outdoor|nature|hike|trail|sun|beach/i.test(v))
    return "light jacket or tee, comfortable pants, sneakers";
  if (/grocery|store|shop|market|cart/i.test(v))
    return "casual top, jeans, comfortable flats or sneakers";
  if (/couch|sofa|living.?room|tv|phone|relax/i.test(v))
    return "oversized sweater, comfortable joggers, cozy socks";
  // Default casual
  return "casual t-shirt and comfortable pants";
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
  // Phase/detail/error are in global state so they persist across sidebar navigation
  const phase = (s.autoPhase || "idle") as AutoPhase;
  const error = s.autoError || null;
  const detail = s.autoDetail || "";
  const abortRef = useRef(false);

  // Use a ref to track current phase for setDetail (avoids stale closure)
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const setPhase = (p: AutoPhase) => {
    phaseRef.current = p;
    dispatch({ type: "SET_AUTO_PHASE", phase: p, error: null });
  };
  const setError = (e: string | null) =>
    dispatch({ type: "SET_AUTO_PHASE", phase: "error", error: e });
  const setDetail = (d: string) =>
    dispatch({ type: "SET_AUTO_PHASE", phase: phaseRef.current, detail: d });

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

      // Map scene id → index
      const sceneIndexMap = new Map<string, number>();
      storyboardScenes.forEach((sc, i) => sceneIndexMap.set(sc.id, i));

      // Track which scenes show product (no cap — every product scene gets the ref)
      // Previously capped at 2, causing later scenes to fabricate the product.

      // ── Build original scene map from analysis ──
      // Each storyboard scene should clone the ORIGINAL video's corresponding scene
      const originalScenes = analysis.sceneBreakdown || [];
      function getOriginalScene(idx: number) {
        if (idx < originalScenes.length) {
          return originalScenes[idx];
        }
        return null; // fallback to generic BROLL_SCENES
      }

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
            const storyboardPrompt =
              typeof scene.imagePrompt === "object"
                ? JSON.stringify(scene.imagePrompt)
                : scene.imagePrompt;
            const rollType = scene.rollType || "broll";
            const sceneIdx = sceneIndexMap.get(scene.id) || 0;

            // ── GENDER ──
            const genderWord = detectedGender === "female" ? "woman" : detectedGender === "male" ? "man" : "person";
            const genderAdj = detectedGender === "female" ? "female" : detectedGender === "male" ? "male" : "";

            // ── ORIGINAL SCENE from video analysis (the source of truth) ──
            const origScene = getOriginalScene(sceneIdx);
            const fallbackScene = getBrollScene(sceneIdx);

            // Use original visual description — this is what happened in the
            // source video. We replicate the same action with our character.
            const originalVisual = origScene?.visual || fallbackScene.img;
            const originalType = origScene?.type?.toLowerCase() || rollType;

            // Swap competitor brand/product references for our product
            let clonedVisual = originalVisual
              .replace(/\b(competitor|brand|their product|the product)\b/gi, "our product")
              .replace(/\b(his|he|him|man|male|guy)\b/gi, detectedGender === "female" ? genderWord : "$&")
              .replace(/\b(her|she|woman|female|girl)\b/gi, detectedGender === "male" ? genderWord : "$&");

            // ── CHARACTER CONSISTENCY ──
            const charMatch = `The person MUST be the EXACT same ${genderAdj} ${genderWord} shown in the first reference image. Same face, same facial features, same skin tone, same hair color and style, same gender (${genderAdj}). This is the SAME creator/character across ALL scenes.\nCRITICAL: IGNORE the clothing/outfit from the reference image. The character's outfit for THIS scene is specified below — use ONLY the described outfit, NOT what they wear in the reference photo.\n\n`;

            // ── REALISM RULES ──
            const realismRules = `\nPHOTO REALISM: Visible skin texture, pores, imperfections. Natural body proportions. Ambient lighting matching the environment — no studio rim light. Background recognizable (not blurred to oblivion). Natural skin — not airbrushed.`;

            // ── Detect if this scene should show product ──
            const origHasProduct = /product|package|pouch|bag|gummies|bottle|supplement|pour|hold.*pack/i.test(originalVisual);
            const storyboardMentionsProduct = /product|package|pouch|bag|gummies|bottle|supplement|pour|hold/i.test(storyboardPrompt);
            const isProductScene = (origHasProduct || storyboardMentionsProduct) && rollType !== "aroll";

            let prompt: string;

            if (rollType === "aroll" || originalType.includes("a-roll") || originalType.includes("aroll")) {
              // ── A-ROLL: clone the original's talking-head style ──
              const arollOutfit = origScene ? inferOutfitFromScene(clonedVisual) : "casual t-shirt and comfortable pants";
              prompt = `${charMatch}A ${genderAdj} ${genderWord} looking DIRECTLY into the camera lens with confident eye contact.`;
              prompt += `\n\nCLONING ORIGINAL SCENE: "${clonedVisual}"`;
              prompt += `\nAdapt this scene with our character but keep the same framing, energy, and context.`;
              prompt += `\n\nStoryboard direction: ${storyboardPrompt}`;
              prompt += `\nWearing: ${arollOutfit}. (DO NOT use the outfit from the reference image.)`;
              prompt += `\nCamera: straight on, selfie distance (arm's length). Frontal face fully visible. Close-up head and shoulders.`;
              prompt += `\nStyle: iPhone selfie video look. Natural lighting. Slight grain, unfiltered.`;
              prompt += realismRules;
            } else {
              // ── B/C-ROLL: clone the original scene's action ──
              // Determine appropriate outfit from the scene context
              const outfit = origScene ? inferOutfitFromScene(clonedVisual) : fallbackScene.outfit;

              prompt = `${charMatch}`;
              if (!isProductScene) {
                prompt += `A ${genderAdj} ${genderWord} performing the following action: ${clonedVisual}`;
                prompt += `\n\nStoryboard direction: ${storyboardPrompt}`;
                // Only strip product if original didn't have it
                if (!origHasProduct) {
                  prompt += `\nNO product visible in this scene.`;
                }
              } else {
                prompt += `A ${genderAdj} ${genderWord} performing the following action: ${clonedVisual}`;
                prompt += `\n\nStoryboard direction: ${storyboardPrompt}`;
                prompt += `\nPRODUCT IDENTITY (CRITICAL): The product in this scene must be an EXACT copy of the product shown in the second reference image. Copy EXACTLY: the packaging shape, colors, label design, logo, size, and proportions. Do NOT invent, redesign, or alter the product in any way. The product must look identical in EVERY scene — same object, same appearance, no variation.`;
              }

              prompt += `\nWearing: ${outfit}.`;
              prompt += `\nFraming: Medium to wide shot (waist-up or full body). Camera 4-6 feet away.`;
              prompt += `\nBehavior: MID-ACTION, candid. NOT posing. NOT looking at camera. Eyes on activity. Mouth closed, neutral expression.`;
              prompt += `\nStyle: Candid lifestyle. Natural environment lighting.`;
              prompt += realismRules;
            }

            // A-roll: ONLY creator ref (no product mixing — prevents model confusion)
            // B/C-roll with product: creator first (character), product second
            // B/C-roll without product: only creator
            // ALWAYS pass product ref for product scenes so the model never fabricates
            const sceneCharUrl = creatorUrl;
            const sceneProductUrl = isProductScene ? productUrl : null;

            // Try KIE (nano-banana-pro) first, fallback to Vidtory on failure
            let imageUrl: string;
            try {
              const kieRes = await fetch("/api/studio/kie-generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt,
                  aspectRatio,
                  characterUrl: sceneCharUrl,
                  productUrl: sceneProductUrl,
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
                  characterUrl: sceneCharUrl,
                  productUrl: sceneProductUrl,
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
            const vidSceneIdx = sceneIndexMap.get(scene.id) || 0;
            const allowLipsync =
              rollType === "aroll" && scene.includeDialogueInPrompt;

            // Gender enforcement
            const genderWord = detectedGender === "female" ? "woman" : detectedGender === "male" ? "man" : "person";

            // ── ORIGINAL SCENE — clone the source video's action ──
            const origScene = getOriginalScene(vidSceneIdx);
            const fallbackScene = getBrollScene(vidSceneIdx);
            const originalVisual = origScene?.visual || fallbackScene.img;

            // Swap competitor references
            let clonedAction = originalVisual
              .replace(/\b(competitor|brand|their product|the product)\b/gi, "our product")
              .replace(/\b(his|he|him|man|male|guy)\b/gi, detectedGender === "female" ? genderWord : "$&")
              .replace(/\b(her|she|woman|female|girl)\b/gi, detectedGender === "male" ? genderWord : "$&");

            let prompt: string;

            if (rollType === "aroll") {
              // A-ROLL VIDEO: speaking to camera, clone original's energy
              prompt = `A ${genderWord} is speaking directly to the camera in a selfie-style video.`;
              prompt += `\n\nCLONING ORIGINAL SCENE ACTION: "${clonedAction}"`;
              prompt += `\nReplicate this exact scene with our ${genderWord} — same framing, same energy, same gestures.`;
              prompt += `\n\nEXACT MOTION RULES:`;
              prompt += `\n1. Eyes LOCKED on the camera lens the ENTIRE clip. Never looks away.`;
              prompt += `\n2. Mouth opens and closes naturally as if speaking. Subtle lip movement.`;
              prompt += `\n3. Small natural head micro-movements — tiny nods, slight tilts.`;
              prompt += `\n4. Hands may gesture naturally below chin level.`;
              prompt += `\n5. Expression: engaged and natural — like a FaceTime call, NOT a news anchor.`;
              if (allowLipsync) {
                prompt += `\nDialogue: "${scene.voiceoverScript}"`;
              }
              prompt += `\n\nStoryboard direction: ${vpStr}`;
              prompt += `\nShot on iPhone 15 Pro, selfie camera. Natural light. Slight grain, no color grade.`;
              prompt += `\nAUDIO: Complete silence. No music. No sound effects.`;
            } else {
              // B/C-ROLL VIDEO: clone original scene's specific action
              prompt = `A ${genderWord} in a real environment. Camera 4-6 feet away, medium-wide.`;
              prompt += `\n\nCLONING ORIGINAL SCENE ACTION (replicate this exactly in 5 seconds):`;
              prompt += `\n"${clonedAction}"`;
              prompt += `\nAdapt this with our ${genderWord} — same action, same movement, same camera angle.`;
              // Add fallback motion detail if original description is too short
              if (clonedAction.length < 60) {
                prompt += `\nDetailed motion: ${fallbackScene.video}`;
              }
              prompt += `\n\nStoryboard direction: ${vpStr}`;
              prompt += `\n\nSTRICT RULES:`;
              prompt += `\n- ${genderWord} NEVER looks at the camera. Eyes on the activity.`;
              prompt += `\n- Mouth CLOSED entire clip. No talking, no smile, no sighing.`;
              prompt += `\n- NO deep breaths, NO shoulder raising, NO chest heaving.`;
              prompt += `\n- Every hand movement has a PURPOSE. No random lifting.`;
              prompt += `\n- Movement is SLOW and NATURAL. Real human speed.`;
              prompt += `\n- Neutral focused expression. Not happy, not sad.`;
              prompt += `\nPhotorealistic, Sony A7IV, 85mm f/1.4. Natural ambient light.`;
              prompt += `\nAUDIO: Complete silence.`;
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
    dispatch({ type: "SET_AUTO_PHASE", phase: "idle", detail: "", error: null });
    dispatch({ type: "SET_ANALYZING", v: false });
  }, [dispatch]);

  // Abort polling loops on unmount (prevents leaked API calls)
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

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
