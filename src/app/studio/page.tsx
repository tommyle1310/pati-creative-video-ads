"use client";

import { useReducer, useCallback, useRef, useEffect, useState } from "react";
import type {
  VideoAnalysis,
  StoryboardScene,
  JobStatusResponse,
  ScriptScene,
} from "@/lib/studio/types";
import { createDefaultScene } from "@/lib/studio/types";
import {
  Clapperboard,
  Upload,
  Database,
  Play,
  Sparkles,
  Image as ImageIcon,
  Video,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  X,
  Wand2,
  Download,
  Trash2,
  Plus,
  Link,
  Globe,
  Maximize2,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── State ────────────────────────────────────────────────────

interface StudioState {
  step: number;
  // Step 1
  sourceType: "db" | "upload" | null;
  selectedAdId: string | null;
  selectedAdVideoUrl: string | null;
  selectedAdBrand: string | null;
  uploadedVideoUrl: string | null;
  uploadedVideoFile: File | null;
  // Step 2
  frames: string[];
  analysis: VideoAnalysis | null;
  isAnalyzing: boolean;
  analyzeError: string | null;
  // Step 3
  productImage: string | null;
  creatorImage: string | null;
  bigIdea: string;
  productInfo: string;
  targetAudience: string;
  landingPageUrls: string[];
  isScrapingUrls: boolean;
  // Creative Strategy (Meta Ads AI Stack)
  motivator: string;
  emotionalTone: string;
  storylineType: string;
  // Step 4
  scriptScenes: ScriptScene[];
  isGeneratingScript: boolean;
  // Step 5
  scenes: StoryboardScene[];
  isGeneratingStoryboard: boolean;
  // Step 6
  aspectRatio: "9:16" | "16:9" | "1:1";
  voice: string;
  // uploaded vidtory URLs (cached so we don't re-upload)
  productVidtoryUrl: string | null;
  creatorVidtoryUrl: string | null;
}

type Action =
  | { type: "SET_STEP"; step: number }
  | { type: "SET_SOURCE_DB"; adId: string; videoUrl: string; brand: string }
  | { type: "SET_SOURCE_UPLOAD"; url: string; file: File | null }
  | { type: "SET_FRAMES"; frames: string[] }
  | { type: "SET_ANALYSIS"; analysis: VideoAnalysis }
  | { type: "SET_ANALYZING"; v: boolean }
  | { type: "SET_ANALYZE_ERROR"; error: string | null }
  | { type: "SET_PRODUCT_IMAGE"; data: string }
  | { type: "SET_CREATOR_IMAGE"; data: string }
  | { type: "SET_FIELD"; field: keyof StudioState; value: unknown }
  | { type: "SET_SCRIPT_SCENES"; scriptScenes: ScriptScene[] }
  | { type: "UPDATE_SCRIPT_SCENE"; index: number; patch: Partial<ScriptScene> }
  | { type: "SET_GENERATING_SCRIPT"; v: boolean }
  | { type: "SET_SCENES"; scenes: StoryboardScene[] }
  | { type: "SET_GENERATING_STORYBOARD"; v: boolean }
  | { type: "UPDATE_SCENE"; id: string; patch: Partial<StoryboardScene> }
  | { type: "SET_VIDTORY_URLS"; product?: string; creator?: string };

const initialState: StudioState = {
  step: 1,
  sourceType: null,
  selectedAdId: null,
  selectedAdVideoUrl: null,
  selectedAdBrand: null,
  uploadedVideoUrl: null,
  uploadedVideoFile: null,
  frames: [],
  analysis: null,
  isAnalyzing: false,
  analyzeError: null,
  productImage: null,
  creatorImage: null,
  bigIdea: "",
  productInfo: "",
  targetAudience: "",
  landingPageUrls: [""],
  isScrapingUrls: false,
  motivator: "",
  emotionalTone: "",
  storylineType: "",
  scriptScenes: [],
  isGeneratingScript: false,
  scenes: [],
  isGeneratingStoryboard: false,
  aspectRatio: "9:16",
  voice: "Kore",
  productVidtoryUrl: null,
  creatorVidtoryUrl: null,
};

function reducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_SOURCE_DB":
      return {
        ...state,
        sourceType: "db",
        selectedAdId: action.adId,
        selectedAdVideoUrl: action.videoUrl,
        selectedAdBrand: action.brand,
        uploadedVideoUrl: null,
      };
    case "SET_SOURCE_UPLOAD":
      return {
        ...state,
        sourceType: "upload",
        uploadedVideoUrl: action.url,
        uploadedVideoFile: action.file,
        selectedAdId: null,
        selectedAdVideoUrl: null,
        selectedAdBrand: null,
      };
    case "SET_FRAMES":
      return { ...state, frames: action.frames };
    case "SET_ANALYSIS":
      return { ...state, analysis: action.analysis, analyzeError: null };
    case "SET_ANALYZING":
      return { ...state, isAnalyzing: action.v };
    case "SET_ANALYZE_ERROR":
      return { ...state, analyzeError: action.error, isAnalyzing: false };
    case "SET_PRODUCT_IMAGE":
      return { ...state, productImage: action.data, productVidtoryUrl: null };
    case "SET_CREATOR_IMAGE":
      return { ...state, creatorImage: action.data, creatorVidtoryUrl: null };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_SCRIPT_SCENES":
      return { ...state, scriptScenes: action.scriptScenes };
    case "UPDATE_SCRIPT_SCENE":
      return {
        ...state,
        scriptScenes: state.scriptScenes.map((sc, i) =>
          i === action.index ? { ...sc, ...action.patch } : sc
        ),
      };
    case "SET_GENERATING_SCRIPT":
      return { ...state, isGeneratingScript: action.v };
    case "SET_SCENES":
      return { ...state, scenes: action.scenes };
    case "SET_GENERATING_STORYBOARD":
      return { ...state, isGeneratingStoryboard: action.v };
    case "UPDATE_SCENE":
      return {
        ...state,
        scenes: state.scenes.map((s) =>
          s.id === action.id ? { ...s, ...action.patch } : s
        ),
      };
    case "SET_VIDTORY_URLS":
      return {
        ...state,
        productVidtoryUrl: action.product ?? state.productVidtoryUrl,
        creatorVidtoryUrl: action.creator ?? state.creatorVidtoryUrl,
      };
    default:
      return state;
  }
}

// ── Steps config ─────────────────────────────────────────────

const STEPS = [
  { label: "Source", icon: Database },
  { label: "Analyze", icon: Sparkles },
  { label: "Product", icon: Upload },
  { label: "Script", icon: Clapperboard },
  { label: "Storyboard", icon: ImageIcon },
  { label: "Generate", icon: Video },
  { label: "Preview", icon: Play },
];

const VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"];

// ── Creative Strategy Constants (from Meta Ads AI Stack) ─────

const MOTIVATORS = [
  { value: "pain-point", label: "Pain Point", desc: "Address a frustration or problem", hook: "Tired of [problem]? / Stop wasting [time/money] on [bad solution]" },
  { value: "aspiration", label: "Pleasure / Aspiration", desc: "Promise a desired outcome", hook: "Imagine waking up to [desired outcome] / Finally feel [desired emotion]" },
  { value: "social-proof", label: "Social Proof", desc: "Leverage others' validation", hook: "[Number] people can't be wrong / Why everyone's switching to [product]" },
  { value: "curiosity", label: "Curiosity", desc: "Create information gap", hook: "The secret [industry] doesn't want you to know / This changes everything about [category]" },
  { value: "urgency", label: "Fear / Urgency", desc: "Drive immediate action", hook: "Last chance to [benefit] / [Time limit] left to get [offer]" },
  { value: "identity", label: "Identity", desc: "Speak to who they are", hook: "For [persona] who [behavior] / Not for everyone. Just for [identity]" },
  { value: "feature-led", label: "Feature-Led", desc: "Highlight specific attributes", hook: "Made for [specific need] / The only [product] with [feature]" },
  { value: "problem-solution", label: "Problem / Solution", desc: "Classic before/after", hook: "Tired of X? Here's how to fix it / Before vs. After" },
  { value: "authority", label: "Authority / Expert", desc: "Leverage credibility", hook: "Doctor-recommended / Expert-approved [product]" },
  { value: "comparison", label: "Comparison", desc: "Position against alternatives", hook: "Why this beats your current solution / [Product] vs. the rest" },
] as const;

const EMOTIONAL_TONES = [
  { value: "inspirational", label: "Inspirational", desc: "Aspiration, transformation" },
  { value: "relatable", label: "Relatable / Problem-first", desc: "Pain point acknowledgment" },
  { value: "urgent", label: "Urgent / Limited-time", desc: "Promotions, scarcity" },
  { value: "calm", label: "Calm / Reassuring", desc: "Trust-building, premium" },
  { value: "humorous", label: "Humorous / Satirical", desc: "Pattern interrupt, shareability" },
  { value: "educational", label: "Educational", desc: "Complex products, consideration" },
  { value: "emotional", label: "Emotional / Heartfelt", desc: "Gift-giving, meaningful purchases" },
] as const;

const STORYLINE_TYPES = [
  { value: "founder-story", label: "Founder Origin Story", desc: "Why the brand/product was created" },
  { value: "day-in-the-life", label: "Day-in-the-Life", desc: "Product integrated into daily routine" },
  { value: "problem-solution", label: "Problem / Solution", desc: "Before state → After state" },
  { value: "things-you-didnt-know", label: "Things You Didn't Know", desc: "Educational, surprising facts" },
  { value: "behind-the-scenes", label: "Behind the Scenes", desc: "How it's made, company culture" },
  { value: "testimonial", label: "Testimonial / Review", desc: "Customer sharing experience" },
  { value: "unboxing", label: "Unboxing / First Impression", desc: "Discovery moment" },
] as const;

// ── Helpers ──────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function pollJob(
  jobId: string,
  intervalMs: number,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (signal?.aborted) throw new Error("Cancelled");
    const res = await fetch(`/api/studio/job-status?jobId=${jobId}`);
    const data: JobStatusResponse = await res.json();
    if (data.status === "COMPLETED" && data.url) return data.url;
    if (data.status === "FAILED")
      throw new Error(data.error || "Job failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out");
}

// ── Component ────────────────────────────────────────────────

export default function StudioPage() {
  const [s, dispatch] = useReducer(reducer, initialState);
  const videoRef = useRef<HTMLVideoElement>(null);

  const canNext = (): boolean => {
    switch (s.step) {
      case 1:
        return !!(s.selectedAdVideoUrl || s.uploadedVideoUrl);
      case 2:
        return !!s.analysis;
      case 3:
        return !!s.productImage && !!s.bigIdea;
      case 4:
        return s.scriptScenes.length > 0;
      case 5:
        return s.scenes.length > 0;
      case 6:
        return s.scenes.some(
          (sc) => sc.images.length > 0 || sc.videos.length > 0
        );
      default:
        return false;
    }
  };

  // ── Step 6: local UI state ──
  const [previewModal, setPreviewModal] = useState<{ type: "image" | "video"; src: string } | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const toggleSceneExpanded = (id: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Step 1: Source ──

  const [dbAds, setDbAds] = useState<
    { id: string; brand: string; region: string; adScore: number; videoUrl: string | null; hookType: string }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("/api/ads?limit=100&sort=adScore")
      .then((r) => r.json())
      .then((data) => {
        const ads = (data.ads || data || []).filter(
          (a: { videoUrl?: string }) => a.videoUrl
        );
        setDbAds(ads);
      })
      .catch(() => {});
  }, []);

  const handleUploadVideo = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      dispatch({ type: "SET_SOURCE_UPLOAD", url, file });
    },
    []
  );

  // ── Step 2: Extract frames & analyze ──

  const extractFrames = useCallback(async () => {
    dispatch({ type: "SET_ANALYZING", v: true });
    dispatch({ type: "SET_ANALYZE_ERROR", error: null });

    try {
      // Step 1: Extract frames server-side via FFmpeg
      let extractRes: Response;

      if (s.sourceType === "upload" && s.uploadedVideoFile) {
        // Upload the file via FormData
        const formData = new FormData();
        formData.append("video", s.uploadedVideoFile);
        extractRes = await fetch("/api/studio/extract-frames", {
          method: "POST",
          body: formData,
        });
      } else if (s.sourceType === "db" && s.selectedAdVideoUrl) {
        // Send the video URL for server-side download
        extractRes = await fetch("/api/studio/extract-frames", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: s.selectedAdVideoUrl }),
        });
      } else {
        throw new Error("No video source selected");
      }

      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.error || "Frame extraction failed");
      }

      const { frames, duration, fps } = await extractRes.json();
      dispatch({ type: "SET_FRAMES", frames });

      // Step 2: Send extracted frames to Gemini for analysis
      const analyzeRes = await fetch("/api/studio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, fps, duration }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || "Analysis failed");
      }

      const analysis = await analyzeRes.json();
      dispatch({ type: "SET_ANALYSIS", analysis });
      dispatch({ type: "SET_ANALYZING", v: false });
    } catch (err) {
      dispatch({
        type: "SET_ANALYZE_ERROR",
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }, [s.sourceType, s.selectedAdVideoUrl, s.uploadedVideoFile]);

  // ── Step 3: Image upload helpers ──

  const handleImageUpload = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      field: "SET_PRODUCT_IMAGE" | "SET_CREATOR_IMAGE"
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const base64 = await fileToBase64(file);
      dispatch({ type: field, data: base64 });
    },
    []
  );

  // ── Step 3: Landing page scrape & auto-fill ──

  const handleAddUrl = useCallback(() => {
    dispatch({ type: "SET_FIELD", field: "landingPageUrls", value: [...s.landingPageUrls, ""] });
  }, [s.landingPageUrls]);

  const handleRemoveUrl = useCallback((index: number) => {
    const next = s.landingPageUrls.filter((_, i) => i !== index);
    dispatch({ type: "SET_FIELD", field: "landingPageUrls", value: next.length ? next : [""] });
  }, [s.landingPageUrls]);

  const handleUrlChange = useCallback((index: number, value: string) => {
    const next = [...s.landingPageUrls];
    next[index] = value;
    dispatch({ type: "SET_FIELD", field: "landingPageUrls", value: next });
  }, [s.landingPageUrls]);

  const handleScrapeLandingPages = useCallback(async () => {
    const urls = s.landingPageUrls.filter((u) => u.trim());
    if (!urls.length) return;
    dispatch({ type: "SET_FIELD", field: "isScrapingUrls", value: true });
    try {
      const res = await fetch("/api/studio/scrape-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      if (data.bigIdea) dispatch({ type: "SET_FIELD", field: "bigIdea", value: data.bigIdea });
      if (data.productInfo) dispatch({ type: "SET_FIELD", field: "productInfo", value: data.productInfo });
      if (data.targetAudience) dispatch({ type: "SET_FIELD", field: "targetAudience", value: data.targetAudience });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      dispatch({ type: "SET_FIELD", field: "isScrapingUrls", value: false });
    }
  }, [s.landingPageUrls]);

  // ── Step 4: Generate script ──

  const handleGenerateScript = useCallback(async () => {
    dispatch({ type: "SET_GENERATING_SCRIPT", v: true });
    try {
      const res = await fetch("/api/studio/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: s.analysis,
          bigIdea: s.bigIdea,
          productImage: s.productImage,
          productInfo: s.productInfo,
          targetAudience: s.targetAudience,
          creatorImage: s.creatorImage,
          motivator: s.motivator,
          emotionalTone: s.emotionalTone,
          storylineType: s.storylineType,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { scenes: scriptScenes } = await res.json();
      dispatch({ type: "SET_SCRIPT_SCENES", scriptScenes });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Script gen failed");
    } finally {
      dispatch({ type: "SET_GENERATING_SCRIPT", v: false });
    }
  }, [s.analysis, s.bigIdea, s.productImage, s.productInfo, s.targetAudience, s.creatorImage, s.motivator, s.emotionalTone, s.storylineType]);

  // ── Step 5: Generate storyboard ──

  const handleGenerateStoryboard = useCallback(async () => {
    dispatch({ type: "SET_GENERATING_STORYBOARD", v: true });
    try {
      const res = await fetch("/api/studio/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: s.analysis,
          script: s.scriptScenes
            .map((sc, i) => `Scene ${i + 1} [${sc.sceneType}]: ${sc.dialogue}`)
            .join("\n"),
          productImage: s.productImage,
          productInfo: s.productInfo,
          targetAudience: s.targetAudience,
          creatorImage: s.creatorImage,
          motivator: s.motivator,
          emotionalTone: s.emotionalTone,
          storylineType: s.storylineType,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { scenes } = await res.json();
      dispatch({ type: "SET_SCENES", scenes });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Storyboard gen failed");
    } finally {
      dispatch({ type: "SET_GENERATING_STORYBOARD", v: false });
    }
  }, [s.analysis, s.scriptScenes, s.productImage, s.productInfo, s.targetAudience, s.creatorImage, s.motivator, s.emotionalTone, s.storylineType]);

  // ── Step 6: Upload references + generate assets ──

  const ensureVidtoryUploads = useCallback(async () => {
    let productUrl = s.productVidtoryUrl;
    let creatorUrl = s.creatorVidtoryUrl;

    if (!productUrl && s.productImage) {
      const res = await fetch("/api/studio/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: s.productImage }),
      });
      const data = await res.json();
      productUrl = data.url;
    }
    if (!creatorUrl && s.creatorImage) {
      const res = await fetch("/api/studio/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: s.creatorImage }),
      });
      const data = await res.json();
      creatorUrl = data.url;
    }
    dispatch({ type: "SET_VIDTORY_URLS", product: productUrl || undefined, creator: creatorUrl || undefined });
    return { productUrl, creatorUrl };
  }, [s.productImage, s.creatorImage, s.productVidtoryUrl, s.creatorVidtoryUrl]);

  const handleGenerateImage = useCallback(
    async (sceneId: string) => {
      const scene = s.scenes.find((sc) => sc.id === sceneId);
      if (!scene) return;

      dispatch({
        type: "UPDATE_SCENE",
        id: sceneId,
        patch: { isGeneratingImage: true, imageGenerationError: null },
      });

      try {
        const { productUrl, creatorUrl } = await ensureVidtoryUploads();

        // Ensure imagePrompt is a string (may be JSON object from storyboard gen)
        let prompt = typeof scene.imagePrompt === "object" ? JSON.stringify(scene.imagePrompt) : scene.imagePrompt;
        // Prepend realism anchor for A-Roll scenes if not already present
        if (scene.rollType === "aroll" && !prompt.toLowerCase().startsWith("hyperrealistic")) {
          prompt = `Hyperrealistic photography. ${prompt}`;
        }
        if (scene.imageFocusObject) prompt = `Focus on: ${scene.imageFocusObject}. ${prompt}`;
        if (scene.imageCameraAngle) prompt = `${scene.imageCameraAngle} shot. ${prompt}`;

        const res = await fetch("/api/studio/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            aspectRatio: s.aspectRatio,
            characterUrl: creatorUrl,
            productUrl,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const { jobId } = await res.json();

        dispatch({ type: "UPDATE_SCENE", id: sceneId, patch: { imageJobId: jobId } });

        const imageUrl = await pollJob(jobId, 5000, 300000);

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            images: [...scene.images, imageUrl],
            selectedImageForVideo: scene.selectedImageForVideo || imageUrl,
            isGeneratingImage: false,
          },
        });
      } catch (err) {
        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            isGeneratingImage: false,
            imageGenerationError:
              err instanceof Error ? err.message : "Failed",
          },
        });
      }
    },
    [s.scenes, s.aspectRatio, ensureVidtoryUploads]
  );

  const handleGenerateVideo = useCallback(
    async (sceneId: string) => {
      const scene = s.scenes.find((sc) => sc.id === sceneId);
      if (!scene?.selectedImageForVideo) return;

      dispatch({
        type: "UPDATE_SCENE",
        id: sceneId,
        patch: { isGeneratingVideo: true, videoGenerationError: null },
      });

      try {
        // Ensure videoPrompt is a string (may be JSON object from storyboard gen)
        const vpStr = typeof scene.videoPrompt === "object" ? JSON.stringify(scene.videoPrompt) : scene.videoPrompt;
        let prompt = `Motion/Action: ${vpStr}`;
        if (scene.includeDialogueInPrompt) {
          prompt = `The creator is speaking.\n${prompt}`;
          prompt += `\nDialogue in English: "${scene.voiceoverScript}"`;
        }
        prompt += "\n\nAUDIO CONSTRAINT: Absolutely NO background music. NO ambient sounds. NO sound effects. NO soundtrack. Complete silence except for voiceover if present. No Music Background.";
        // Append anti-AI rendering cue based on roll type
        const rollType = scene.rollType || "broll";
        if (rollType === "aroll") {
          if (!prompt.includes("Shot on")) prompt += "\nShot on iPhone 15 Pro, portrait mode, f/1.8. 1600 ISO grain. No color grade. Unfiltered.";
        } else {
          if (!prompt.includes("Shot on")) prompt += "\nPhotorealistic, shot on Sony A7IV, 85mm lens, natural color grading.";
        }

        const res = await fetch("/api/studio/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            aspectRatio: s.aspectRatio,
            startImageUrl: scene.selectedImageForVideo,
            duration: 5,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const { jobId } = await res.json();

        dispatch({ type: "UPDATE_SCENE", id: sceneId, patch: { videoJobId: jobId } });

        const videoUrl = await pollJob(jobId, 10000, 900000);

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            videos: [
              ...scene.videos,
              { url: videoUrl, mediaGenerationId: jobId, seed: 0 },
            ],
            isGeneratingVideo: false,
          },
        });
      } catch (err) {
        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            isGeneratingVideo: false,
            videoGenerationError:
              err instanceof Error ? err.message : "Failed",
          },
        });
      }
    },
    [s.scenes, s.aspectRatio]
  );

  const handleGenerateAudio = useCallback(
    async (sceneId: string) => {
      const scene = s.scenes.find((sc) => sc.id === sceneId);
      if (!scene) return;

      dispatch({
        type: "UPDATE_SCENE",
        id: sceneId,
        patch: { isGeneratingAudio: true, audioGenerationError: null },
      });

      try {
        const res = await fetch("/api/studio/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: scene.voiceoverScript,
            guide: scene.voiceoverGuide,
            voice: s.voice,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const { audioBase64 } = await res.json();

        const pcmBytes = Uint8Array.from(atob(audioBase64), (c) =>
          c.charCodeAt(0)
        );
        // Wrap raw PCM (Linear16, 24kHz, mono) in a proper WAV header
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = pcmBytes.length;
        // RIFF header
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + dataSize, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        // fmt sub-chunk
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        // data sub-chunk
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataSize, true);

        const wavBytes = new Uint8Array(44 + dataSize);
        wavBytes.set(new Uint8Array(wavHeader), 0);
        wavBytes.set(pcmBytes, 44);

        const blob = new Blob([wavBytes], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: { audioUrl, isGeneratingAudio: false },
        });
      } catch (err) {
        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            isGeneratingAudio: false,
            audioGenerationError:
              err instanceof Error ? err.message : "Failed",
          },
        });
      }
    },
    [s.scenes, s.voice]
  );

  const handleGenerateAllImages = useCallback(async () => {
    const tasks = s.scenes
      .filter((sc) => sc.images.length === 0 && !sc.isGeneratingImage)
      .map((sc) => sc.id);

    // Concurrency limit of 3
    const running: Promise<void>[] = [];
    for (const id of tasks) {
      const p = handleGenerateImage(id);
      running.push(p);
      if (running.length >= 3) {
        await Promise.race(running);
        running.splice(
          running.findIndex((r) => r === p),
          1
        );
      }
    }
    await Promise.all(running);
  }, [s.scenes, handleGenerateImage]);

  const handleGenerateAllAudio = useCallback(async () => {
    const tasks = s.scenes
      .filter((sc) => !sc.audioUrl && !sc.isGeneratingAudio)
      .map((sc) => sc.id);

    const running: Promise<void>[] = [];
    for (const id of tasks) {
      const p = handleGenerateAudio(id);
      running.push(p);
      if (running.length >= 3) {
        await Promise.race(running);
        running.splice(
          running.findIndex((r) => r === p),
          1
        );
      }
    }
    await Promise.all(running);
  }, [s.scenes, handleGenerateAudio]);

  const handleEnhancePrompt = useCallback(
    async (sceneId: string, promptType: "image" | "video") => {
      const scene = s.scenes.find((sc) => sc.id === sceneId);
      if (!scene) return;

      try {
        const res = await fetch("/api/studio/enhance-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectContext: `Product: ${s.productInfo}\nAudience: ${s.targetAudience}\nBig Idea: ${s.bigIdea}${s.motivator ? `\nMotivator: ${s.motivator}` : ""}${s.emotionalTone ? `\nEmotional Tone: ${s.emotionalTone}` : ""}${s.storylineType ? `\nStoryline: ${s.storylineType}` : ""}`,
            scene,
            promptType,
            productImage: s.productImage,
            creatorImage: s.creatorImage,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const { enhancedPrompt } = await res.json();

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch:
            promptType === "image"
              ? { imagePrompt: enhancedPrompt }
              : { videoPrompt: enhancedPrompt },
        });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Enhancement failed");
      }
    },
    [s.scenes, s.productInfo, s.targetAudience, s.bigIdea, s.productImage, s.creatorImage]
  );

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clapperboard size={28} className="text-emerald-400" />
        <h1 className="text-2xl font-bold">Video Ad Studio</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          Clone &amp; Improve
        </span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((st, i) => {
          const StepIcon = st.icon;
          const stepNum = i + 1;
          const isCurrent = s.step === stepNum;
          const isDone = s.step > stepNum;
          return (
            <div key={st.label} className="flex items-center">
              <button
                onClick={() => stepNum <= s.step && dispatch({ type: "SET_STEP", step: stepNum })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : isDone
                    ? "bg-muted text-foreground cursor-pointer hover:bg-muted/80"
                    : "text-muted-foreground cursor-default"
                }`}
              >
                {isDone ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <StepIcon size={14} />
                )}
                <span className="hidden sm:inline">{st.label}</span>
                <span className="sm:hidden">{stepNum}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className="text-muted-foreground mx-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-card border border-border rounded-lg p-6 min-h-[400px]">
        {/* ── STEP 1: Source ── */}
        {s.step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Choose Source Video</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From DB */}
              <div
                className={`border rounded-lg p-4 space-y-3 cursor-pointer transition-colors ${
                  s.sourceType === "db"
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database size={18} />
                  <span className="font-medium">From Crawled Ads</span>
                </div>
                <input
                  type="text"
                  placeholder="Search by brand..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {dbAds
                    .filter(
                      (a) =>
                        !searchTerm ||
                        a.brand
                          ?.toLowerCase()
                          .includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 30)
                    .map((ad) => (
                      <button
                        key={ad.id}
                        onClick={() =>
                          dispatch({
                            type: "SET_SOURCE_DB",
                            adId: ad.id,
                            videoUrl: ad.videoUrl!,
                            brand: ad.brand,
                          })
                        }
                        className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors ${
                          s.selectedAdId === ad.id
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">
                          {ad.brand} — {ad.region}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {ad.adScore?.toFixed(1)}
                        </span>
                      </button>
                    ))}
                  {dbAds.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">
                      No ads in DB. Run a crawl first or upload a video.
                    </p>
                  )}
                </div>
              </div>

              {/* Upload */}
              <div
                className={`border rounded-lg p-4 space-y-3 transition-colors ${
                  s.sourceType === "upload"
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Upload size={18} />
                  <span className="font-medium">Upload Video</span>
                </div>
                <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleUploadVideo}
                  />
                  <Upload
                    size={24}
                    className="mx-auto mb-2 text-muted-foreground"
                  />
                  <p className="text-sm text-muted-foreground">
                    Drop or click to upload a video ad
                  </p>
                </label>
                {s.uploadedVideoUrl && (
                  <video
                    src={s.uploadedVideoUrl}
                    controls
                    className="w-full max-h-48 rounded"
                  />
                )}
              </div>
            </div>

            {/* Preview for DB selection */}
            {s.sourceType === "db" && s.selectedAdVideoUrl && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Preview: {s.selectedAdBrand}
                </p>
                <video
                  ref={videoRef}
                  src={`/api/video-proxy?url=${encodeURIComponent(s.selectedAdVideoUrl)}`}
                  controls
                  crossOrigin="anonymous"
                  className="w-full max-h-64 rounded"
                />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Analyze ── */}
        {s.step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Frame Extraction & Analysis</h2>
              <button
                onClick={extractFrames}
                disabled={s.isAnalyzing}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {s.isAnalyzing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {s.isAnalyzing
                  ? s.frames.length > 0
                    ? "Analyzing..."
                    : "Extracting frames..."
                  : "Extract & Analyze"}
              </button>
            </div>

            {s.analyzeError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 text-sm text-red-400">
                {s.analyzeError}
              </div>
            )}

            {/* Frame thumbnails */}
            {s.frames.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {s.frames.length} frames extracted
                </p>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {s.frames.slice(0, 40).map((f, i) => (
                    <img
                      key={i}
                      src={f}
                      alt={`Frame ${i}`}
                      className="h-16 rounded border border-border shrink-0"
                    />
                  ))}
                  {s.frames.length > 40 && (
                    <div className="h-16 w-16 flex items-center justify-center bg-muted rounded text-xs text-muted-foreground shrink-0">
                      +{s.frames.length - 40}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analysis result */}
            {s.analysis && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="text-sm font-medium mb-1">Music & Pacing</h3>
                  <p className="text-sm text-muted-foreground">
                    {s.analysis.musicAndPacing}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Scene Breakdown ({s.analysis.sceneBreakdown.length} scenes)
                  </h3>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {s.analysis.sceneBreakdown.map((scene) => (
                      <div
                        key={scene.scene_id}
                        className="bg-muted/30 rounded-md p-3 text-sm"
                      >
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-muted-foreground font-mono text-xs shrink-0 w-[90px]">
                            {scene.time}
                          </span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                            scene.type.toLowerCase().includes("a-roll") ? "bg-blue-500/20 text-blue-400" :
                            scene.type.toLowerCase().includes("b-roll") ? "bg-amber-500/20 text-amber-400" :
                            scene.type.toLowerCase().includes("c-roll") ? "bg-purple-500/20 text-purple-400" :
                            "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {scene.type}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed mb-1">{scene.visual}</p>
                        {scene.speech && scene.speech !== "None" && (
                          <p className="italic text-xs text-muted-foreground/70 border-l-2 border-emerald-500/30 pl-2">
                            {scene.speech}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Product Setup ── */}
        {s.step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Product & Creator Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product image */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Product Image <span className="text-red-400">*</span>
                </label>
                <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, "SET_PRODUCT_IMAGE")}
                  />
                  {s.productImage ? (
                    <img
                      src={s.productImage}
                      alt="Product"
                      className="h-32 mx-auto rounded"
                    />
                  ) : (
                    <>
                      <ImageIcon
                        size={24}
                        className="mx-auto mb-2 text-muted-foreground"
                      />
                      <p className="text-sm text-muted-foreground">
                        Upload product image
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Creator image */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Creator/Character Image (optional)
                </label>
                <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, "SET_CREATOR_IMAGE")}
                  />
                  {s.creatorImage ? (
                    <img
                      src={s.creatorImage}
                      alt="Creator"
                      className="h-32 mx-auto rounded"
                    />
                  ) : (
                    <>
                      <ImageIcon
                        size={24}
                        className="mx-auto mb-2 text-muted-foreground"
                      />
                      <p className="text-sm text-muted-foreground">
                        Upload creator face
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Landing Page URLs — AI auto-fill */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Globe size={14} />
                  Landing Page URLs
                  <span className="text-xs font-normal text-muted-foreground">(AI auto-fills fields below)</span>
                </label>
                <button
                  onClick={handleScrapeLandingPages}
                  disabled={s.isScrapingUrls || !s.landingPageUrls.some((u) => u.trim())}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
                >
                  {s.isScrapingUrls ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {s.isScrapingUrls ? "Scraping..." : "Auto-fill from URLs"}
                </button>
              </div>
              {s.landingPageUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <div className="relative flex-1">
                    <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlChange(i, e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full bg-background border border-border rounded px-3 py-2 pl-8 text-sm"
                    />
                  </div>
                  {s.landingPageUrls.length > 1 && (
                    <button
                      onClick={() => handleRemoveUrl(i)}
                      className="p-2 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddUrl}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Add another URL
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Big Idea / Core Message <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={s.bigIdea}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "bigIdea",
                      value: e.target.value,
                    })
                  }
                  placeholder='e.g. "This creatine gummy changed my gym performance in 2 weeks"'
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Product Info</label>
                <textarea
                  value={s.productInfo}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "productInfo",
                      value: e.target.value,
                    })
                  }
                  placeholder="Creatine monohydrate gummies, 5g per serving, berry flavor..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1 h-20 resize-y"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Audience</label>
                <input
                  type="text"
                  value={s.targetAudience}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "targetAudience",
                      value: e.target.value,
                    })
                  }
                  placeholder="Men 18-35 interested in fitness and bodybuilding"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
            </div>

            {/* Creative Strategy — Meta Ads AI Stack Framework */}
            <div className="border-t border-border pt-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Creative Strategy
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Meta Ads AI Stack
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Different motivators reach different audiences via Andromeda&apos;s embedding system. &quot;Creative is the new targeting.&quot;
                </p>
              </div>

              {/* Motivator */}
              <div>
                <label className="text-sm font-medium">
                  Primary Motivator
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  The psychological driver that makes someone take action
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {MOTIVATORS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() =>
                        dispatch({
                          type: "SET_FIELD",
                          field: "motivator",
                          value: s.motivator === m.value ? "" : m.value,
                        })
                      }
                      className={`text-left px-3 py-2 rounded-md border text-xs transition-colors ${
                        s.motivator === m.value
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <span className="font-medium block">{m.label}</span>
                      <span className="text-muted-foreground block mt-0.5 leading-tight">
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
                {s.motivator && (
                  <div className="mt-2 bg-muted/30 rounded px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Hook templates: </span>
                    {MOTIVATORS.find((m) => m.value === s.motivator)?.hook}
                  </div>
                )}
              </div>

              {/* Emotional Tone */}
              <div>
                <label className="text-sm font-medium">
                  Emotional Tone
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EMOTIONAL_TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() =>
                        dispatch({
                          type: "SET_FIELD",
                          field: "emotionalTone",
                          value: s.emotionalTone === t.value ? "" : t.value,
                        })
                      }
                      className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                        s.emotionalTone === t.value
                          ? "border-blue-500 bg-blue-500/10 text-blue-300"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Storyline Type */}
              <div>
                <label className="text-sm font-medium">
                  Storyline Type
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STORYLINE_TYPES.map((st) => (
                    <button
                      key={st.value}
                      onClick={() =>
                        dispatch({
                          type: "SET_FIELD",
                          field: "storylineType",
                          value: s.storylineType === st.value ? "" : st.value,
                        })
                      }
                      className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                        s.storylineType === st.value
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <span className="font-medium">{st.label}</span>
                      <span className="text-muted-foreground ml-1">— {st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Script ── */}
        {s.step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Cloned Script ({s.scriptScenes.length} scenes)
              </h2>
              <button
                onClick={handleGenerateScript}
                disabled={s.isGeneratingScript}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {s.isGeneratingScript ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {s.scriptScenes.length > 0 ? "Regenerate" : "Generate Script"}
              </button>
            </div>

            {s.analysis && (
              <div className="bg-muted/30 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Original structure:</p>
                <div className="flex gap-2 flex-wrap">
                  {s.analysis.sceneBreakdown.map((sc) => (
                    <span
                      key={sc.scene_id}
                      className="text-xs px-2 py-0.5 bg-muted rounded capitalize"
                    >
                      {sc.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Creative Strategy badges */}
            {(s.motivator || s.emotionalTone || s.storylineType) && (
              <div className="flex flex-wrap gap-2">
                {s.motivator && (
                  <span className="text-xs px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md">
                    Motivator: {MOTIVATORS.find((m) => m.value === s.motivator)?.label}
                  </span>
                )}
                {s.emotionalTone && (
                  <span className="text-xs px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md">
                    Tone: {EMOTIONAL_TONES.find((t) => t.value === s.emotionalTone)?.label}
                  </span>
                )}
                {s.storylineType && (
                  <span className="text-xs px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-md">
                    Storyline: {STORYLINE_TYPES.find((st) => st.value === s.storylineType)?.label}
                  </span>
                )}
              </div>
            )}

            {s.scriptScenes.length === 0 && !s.isGeneratingScript && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Click &ldquo;Generate Script&rdquo; to create a multi-scene script based on the analysis.
              </p>
            )}

            <div className="space-y-3">
              {s.scriptScenes.map((sc, i) => (
                <div
                  key={i}
                  className="bg-muted/20 border border-border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-400">
                      Scene {i + 1}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded capitalize">
                      {sc.sceneType}
                    </span>
                    {s.analysis?.sceneBreakdown[i] && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Original: {s.analysis.sceneBreakdown[i].time}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Dialogue / Voiceover</label>
                    <textarea
                      value={sc.dialogue}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_SCRIPT_SCENE",
                          index: i,
                          patch: { dialogue: e.target.value },
                        })
                      }
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm h-20 resize-y mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Direction / Tone</label>
                    <input
                      type="text"
                      value={sc.direction}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_SCRIPT_SCENE",
                          index: i,
                          patch: { direction: e.target.value },
                        })
                      }
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Storyboard ── */}
        {s.step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Storyboard ({s.scenes.length} scenes)
              </h2>
              <button
                onClick={handleGenerateStoryboard}
                disabled={s.isGeneratingStoryboard}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {s.isGeneratingStoryboard ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {s.scenes.length > 0 ? "Regenerate" : "Generate Storyboard"}
              </button>
            </div>

            <div className="space-y-4">
              {s.scenes.map((scene, i) => (
                <div
                  key={scene.id}
                  className="bg-muted/20 border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-400">
                        Scene {i + 1}
                      </span>
                      {scene.rollType && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          scene.rollType === "aroll" ? "bg-blue-500/20 text-blue-400" :
                          scene.rollType === "broll" ? "bg-amber-500/20 text-amber-400" :
                          "bg-purple-500/20 text-purple-400"
                        }`}>
                          {scene.rollType === "aroll" ? "A-ROLL" : scene.rollType === "broll" ? "B-ROLL" : "C-ROLL"}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEnhancePrompt(scene.id, "image")}
                        className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded flex items-center gap-1"
                        title="Enhance image prompt"
                      >
                        <Wand2 size={12} /> Image
                      </button>
                      <button
                        onClick={() => handleEnhancePrompt(scene.id, "video")}
                        className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded flex items-center gap-1"
                        title="Enhance video prompt"
                      >
                        <Wand2 size={12} /> Video
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Voiceover Script
                      </label>
                      <textarea
                        value={scene.voiceoverScript}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_SCENE",
                            id: scene.id,
                            patch: { voiceoverScript: e.target.value },
                          })
                        }
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm h-16 resize-y"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Voiceover Guide
                      </label>
                      <input
                        type="text"
                        value={scene.voiceoverGuide}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_SCENE",
                            id: scene.id,
                            patch: { voiceoverGuide: e.target.value },
                          })
                        }
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Image Prompt
                      </label>
                      <textarea
                        value={scene.imagePrompt}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_SCENE",
                            id: scene.id,
                            patch: { imagePrompt: e.target.value },
                          })
                        }
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm h-20 resize-y"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Video Prompt
                      </label>
                      <textarea
                        value={scene.videoPrompt}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_SCENE",
                            id: scene.id,
                            patch: { videoPrompt: e.target.value },
                          })
                        }
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm h-20 resize-y"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 6: Generate Assets ── */}
        {s.step === 6 && (
          <div className="space-y-6">
            {/* Header + controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold">Generate Assets</h2>
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  value={s.aspectRatio}
                  onChange={(e) =>
                    dispatch({ type: "SET_FIELD", field: "aspectRatio", value: e.target.value })
                  }
                  className="bg-background border border-border rounded px-2 py-1 text-sm"
                >
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="1:1">1:1 (Square)</option>
                </select>
                <select
                  value={s.voice}
                  onChange={(e) =>
                    dispatch({ type: "SET_FIELD", field: "voice", value: e.target.value })
                  }
                  className="bg-background border border-border rounded px-2 py-1 text-sm"
                >
                  {VOICES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateAllImages}
                  disabled={s.scenes.every((sc) => sc.isGeneratingImage)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm"
                >
                  {s.scenes.some((sc) => sc.isGeneratingImage) ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ImageIcon size={14} />
                  )}
                  All Images
                </button>
                <button
                  onClick={handleGenerateAllAudio}
                  disabled={s.scenes.every((sc) => sc.isGeneratingAudio)}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm"
                >
                  {s.scenes.some((sc) => sc.isGeneratingAudio) ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Volume2 size={14} />
                  )}
                  All Audio
                </button>
              </div>
            </div>

            {/* Scene cards */}
            <div className="space-y-4">
              {s.scenes.map((scene, i) => {
                const isExpanded = expandedScenes.has(scene.id);
                return (
                <div
                  key={scene.id}
                  className="bg-muted/20 border border-border rounded-lg overflow-hidden"
                >
                  {/* Scene header — always visible */}
                  <button
                    onClick={() => toggleSceneExpanded(scene.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-emerald-400 shrink-0">
                      Scene {i + 1}
                    </span>
                    {scene.rollType && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        scene.rollType === "aroll" ? "bg-blue-500/20 text-blue-400" :
                        scene.rollType === "broll" ? "bg-amber-500/20 text-amber-400" :
                        "bg-purple-500/20 text-purple-400"
                      }`}>
                        {scene.rollType === "aroll" ? "A-ROLL" : scene.rollType === "broll" ? "B-ROLL" : "C-ROLL"}
                      </span>
                    )}
                    {/* Status indicators */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {scene.isGeneratingImage && <Loader2 size={12} className="animate-spin text-blue-400" />}
                      {scene.images.length > 0 && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded">{scene.images.length} img</span>}
                      {scene.isGeneratingVideo && <Loader2 size={12} className="animate-spin text-emerald-400" />}
                      {scene.videos.length > 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded">{scene.videos.length} vid</span>}
                      {scene.isGeneratingAudio && <Loader2 size={12} className="animate-spin text-purple-400" />}
                      {scene.audioUrl && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1 rounded">audio</span>}
                    </div>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {scene.voiceoverScript.slice(0, 80)}{scene.voiceoverScript.length > 80 ? "..." : ""}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {/* Lipsync toggle */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => dispatch({
                            type: "UPDATE_SCENE",
                            id: scene.id,
                            patch: { includeDialogueInPrompt: !scene.includeDialogueInPrompt },
                          })}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                            scene.includeDialogueInPrompt
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                              : "border-border text-muted-foreground hover:border-muted-foreground"
                          }`}
                        >
                          {scene.includeDialogueInPrompt ? <Mic size={12} /> : <MicOff size={12} />}
                          {scene.includeDialogueInPrompt ? "Lipsync ON" : "Lipsync OFF"}
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {scene.includeDialogueInPrompt
                            ? "Video will include dialogue for lip-sync"
                            : "Video will be silent (no lip-sync)"}
                        </span>
                      </div>

                      {/* Editable prompts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-blue-400">Image Prompt</label>
                            <button
                              onClick={() => handleEnhancePrompt(scene.id, "image")}
                              className="text-[10px] px-2 py-0.5 bg-muted hover:bg-muted/80 rounded flex items-center gap-1"
                              title="Enhance with AI"
                            >
                              <Wand2 size={10} /> Enhance
                            </button>
                          </div>
                          <textarea
                            value={scene.imagePrompt}
                            onChange={(e) =>
                              dispatch({ type: "UPDATE_SCENE", id: scene.id, patch: { imagePrompt: e.target.value } })
                            }
                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono h-32 resize-y"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-emerald-400">Video Prompt</label>
                            <button
                              onClick={() => handleEnhancePrompt(scene.id, "video")}
                              className="text-[10px] px-2 py-0.5 bg-muted hover:bg-muted/80 rounded flex items-center gap-1"
                              title="Enhance with AI"
                            >
                              <Wand2 size={10} /> Enhance
                            </button>
                          </div>
                          <textarea
                            value={scene.videoPrompt}
                            onChange={(e) =>
                              dispatch({ type: "UPDATE_SCENE", id: scene.id, patch: { videoPrompt: e.target.value } })
                            }
                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono h-32 resize-y"
                          />
                        </div>
                      </div>

                      {/* Generation cards: Image | Video | Audio */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* ── Image Card ── */}
                        <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-blue-400">
                              <ImageIcon size={14} /> Images
                            </span>
                            <button
                              onClick={() => handleGenerateImage(scene.id)}
                              disabled={scene.isGeneratingImage}
                              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1.5 font-medium"
                            >
                              {scene.isGeneratingImage ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Plus size={12} />
                              )}
                              {scene.isGeneratingImage ? "Generating..." : "Generate"}
                            </button>
                          </div>
                          {scene.imageGenerationError && (
                            <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">{scene.imageGenerationError}</p>
                          )}
                          {scene.isGeneratingImage && scene.images.length === 0 && (
                            <div className="h-28 bg-blue-500/5 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed border-blue-500/20 animate-pulse">
                              <Loader2 size={20} className="animate-spin text-blue-400" />
                              <span className="text-[10px] text-muted-foreground">Generating image...</span>
                            </div>
                          )}
                          <div className="flex gap-1.5 flex-wrap">
                            {scene.images.map((img, j) => (
                              <div key={j} className="relative group">
                                <img
                                  src={img}
                                  alt={`Scene ${i + 1} image ${j}`}
                                  onClick={() =>
                                    dispatch({ type: "UPDATE_SCENE", id: scene.id, patch: { selectedImageForVideo: img } })
                                  }
                                  className={`h-24 rounded-md border-2 transition-all ${
                                    scene.selectedImageForVideo === img
                                      ? "border-emerald-500 ring-1 ring-emerald-500/30"
                                      : "border-transparent hover:border-muted-foreground"
                                  }`}
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPreviewModal({ type: "image", src: img }); }}
                                  className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Maximize2 size={10} className="text-white" />
                                </button>
                                {scene.selectedImageForVideo === img && (
                                  <div className="absolute bottom-1 left-1 text-[8px] bg-emerald-600 text-white px-1 rounded">
                                    selected
                                  </div>
                                )}
                              </div>
                            ))}
                            {scene.isGeneratingImage && scene.images.length > 0 && (
                              <div className="h-24 w-16 bg-blue-500/5 rounded-md flex items-center justify-center border border-dashed border-blue-500/20">
                                <Loader2 size={14} className="animate-spin text-blue-400" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Video Card ── */}
                        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-400">
                              <Video size={14} /> Videos
                            </span>
                            <button
                              onClick={() => handleGenerateVideo(scene.id)}
                              disabled={scene.isGeneratingVideo || !scene.selectedImageForVideo}
                              className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1.5 font-medium"
                            >
                              {scene.isGeneratingVideo ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Plus size={12} />
                              )}
                              {scene.isGeneratingVideo ? "Generating..." : "Generate"}
                            </button>
                          </div>
                          {!scene.selectedImageForVideo && scene.images.length === 0 && (
                            <p className="text-[10px] text-muted-foreground italic">Generate an image first, then select it</p>
                          )}
                          {scene.videoGenerationError && (
                            <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">{scene.videoGenerationError}</p>
                          )}
                          {scene.isGeneratingVideo && scene.videos.length === 0 && (
                            <div className="h-28 bg-emerald-500/5 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed border-emerald-500/20 animate-pulse">
                              <Loader2 size={20} className="animate-spin text-emerald-400" />
                              <span className="text-[10px] text-muted-foreground">Generating video...</span>
                            </div>
                          )}
                          <div className="space-y-2">
                            {scene.videos.map((v, j) => (
                              <div key={j} className="relative group">
                                <video src={v.url} controls className="w-full max-h-36 rounded-md" />
                                <button
                                  onClick={() => setPreviewModal({ type: "video", src: v.url })}
                                  className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Maximize2 size={10} className="text-white" />
                                </button>
                              </div>
                            ))}
                            {scene.isGeneratingVideo && scene.videos.length > 0 && (
                              <div className="h-20 bg-emerald-500/5 rounded-md flex items-center justify-center border border-dashed border-emerald-500/20">
                                <Loader2 size={14} className="animate-spin text-emerald-400" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Audio Card ── */}
                        <div className="border border-purple-500/20 bg-purple-500/5 rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold flex items-center gap-1.5 text-purple-400">
                              <Volume2 size={14} /> Audio
                            </span>
                            <button
                              onClick={() => handleGenerateAudio(scene.id)}
                              disabled={scene.isGeneratingAudio}
                              className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1.5 font-medium"
                            >
                              {scene.isGeneratingAudio ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Plus size={12} />
                              )}
                              {scene.isGeneratingAudio ? "Generating..." : "Generate"}
                            </button>
                          </div>
                          {scene.audioGenerationError && (
                            <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">{scene.audioGenerationError}</p>
                          )}
                          {scene.isGeneratingAudio && !scene.audioUrl && (
                            <div className="h-16 bg-purple-500/5 rounded-lg flex items-center justify-center gap-2 border border-dashed border-purple-500/20 animate-pulse">
                              <Loader2 size={14} className="animate-spin text-purple-400" />
                              <span className="text-[10px] text-muted-foreground">Generating audio...</span>
                            </div>
                          )}
                          {scene.audioUrl && (
                            <audio src={scene.audioUrl} controls className="w-full" />
                          )}
                          {!scene.audioUrl && !scene.isGeneratingAudio && !scene.audioGenerationError && (
                            <p className="text-[10px] text-muted-foreground italic">No audio yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Fullscreen Preview Modal ── */}
        {previewModal && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewModal(null)}
          >
            <button
              onClick={() => setPreviewModal(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
            {previewModal.type === "image" ? (
              <img
                src={previewModal.src}
                alt="Preview"
                className="max-w-full max-h-[90vh] rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <video
                src={previewModal.src}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <a
              href={previewModal.src}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md text-sm transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={14} /> Download
            </a>
          </div>
        )}

        {/* ── STEP 7: Preview ── */}
        {s.step === 7 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Preview & Download</h2>
            <p className="text-sm text-muted-foreground">
              Review all generated scene assets. Download individual clips or combine them using a video editor.
            </p>

            <div className="space-y-6">
              {s.scenes.map((scene, i) => (
                <div
                  key={scene.id}
                  className="bg-muted/20 border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-400">
                      Scene {i + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {scene.voiceoverScript}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Video */}
                    <div>
                      {scene.videos[0] ? (
                        <div className="space-y-1">
                          <video
                            src={scene.videos[0].url}
                            controls
                            className="w-full rounded"
                          />
                          <a
                            href={scene.videos[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Download size={12} /> Download clip
                          </a>
                        </div>
                      ) : scene.images[0] ? (
                        <img
                          src={scene.images[0]}
                          alt={`Scene ${i + 1}`}
                          className="w-full rounded"
                        />
                      ) : (
                        <div className="h-32 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                          No media
                        </div>
                      )}
                    </div>

                    {/* Script + Guide */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Script</p>
                        <p className="text-sm">{scene.voiceoverScript}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Guide</p>
                        <p className="text-sm italic">{scene.voiceoverGuide}</p>
                      </div>
                    </div>

                    {/* Audio */}
                    <div>
                      {scene.audioUrl ? (
                        <audio
                          src={scene.audioUrl}
                          controls
                          className="w-full"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No audio generated
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {s.scenes.some((sc) => sc.videos.length > 0) && (
              <div className="bg-muted/30 rounded-md p-4">
                <p className="text-sm text-muted-foreground">
                  To combine clips into a final video, download each clip above and use a video editor
                  (CapCut, Premiere, DaVinci Resolve) or ffmpeg to concatenate them with the audio tracks.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            dispatch({ type: "SET_STEP", step: Math.max(1, s.step - 1) })
          }
          disabled={s.step === 1}
          className="flex items-center gap-1 text-sm px-4 py-2 bg-muted hover:bg-muted/80 disabled:opacity-30 rounded-md"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <span className="text-sm text-muted-foreground">
          Step {s.step} of {STEPS.length}
        </span>
        <button
          onClick={() =>
            dispatch({
              type: "SET_STEP",
              step: Math.min(STEPS.length, s.step + 1),
            })
          }
          disabled={s.step === STEPS.length || !canNext()}
          className="flex items-center gap-1 text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white rounded-md"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
