import type {
  VideoAnalysis,
  StoryboardScene,
  ScriptScene,
} from "@/lib/studio/types";

export type { VideoAnalysis, StoryboardScene, ScriptScene };

// ── State ────────────────────────────────────────────────────

export type VideoModel = "vidtory" | "kie" | "kling-3.0";

export interface StudioState {
  step: number;
  maxStepReached: number;
  // Step 1
  sourceType: "db" | "upload" | null;
  selectedAdId: string | null;
  selectedAdVideoUrl: string | null;
  selectedAdBrand: string | null;
  uploadedVideoUrl: string | null;
  uploadedVideoFile: File | null;
  providedScript: string;
  // Step 2
  frames: string[];
  analysis: VideoAnalysis | null;
  isAnalyzing: boolean;
  analyzeError: string | null;
  audioExtracted: boolean | null; // null = not attempted, true/false = result
  // Step 3
  productImage: string | null;
  productImages: string[];
  creatorImage: string | null;
  creatorImages: string[];
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
  scriptError: string | null;
  // Step 5
  scenes: StoryboardScene[];
  isGeneratingStoryboard: boolean;
  storyboardError: string | null;
  // Step 6
  aspectRatio: "9:16" | "16:9" | "1:1";
  voice: string;
  voiceSource: "gemini" | "elevenlabs";
  voiceName: string;
  imageModel: VideoModel;
  videoModel: VideoModel;
  // uploaded vidtory URLs (cached so we don't re-upload)
  productVidtoryUrl: string | null;
  creatorVidtoryUrl: string | null;
  // Auto-generate state (persisted so it survives sidebar navigation)
  autoPhase: string; // AutoPhase type from useAutoGenerate
  autoDetail: string;
  autoError: string | null;
  // Project persistence
  currentProjectId: string | null;
  currentProjectName: string | null;
}

export type Action =
  | { type: "SET_STEP"; step: number }
  | { type: "SET_SOURCE_DB"; adId: string; videoUrl: string; brand: string }
  | { type: "SET_SOURCE_UPLOAD"; url: string; file: File | null }
  | { type: "SET_FRAMES"; frames: string[] }
  | { type: "SET_ANALYSIS"; analysis: VideoAnalysis }
  | { type: "SET_ANALYZING"; v: boolean }
  | { type: "SET_ANALYZE_ERROR"; error: string | null }
  | { type: "SET_AUDIO_EXTRACTED"; v: boolean | null }
  | { type: "SET_PRODUCT_IMAGE"; data: string }
  | { type: "ADD_PRODUCT_IMAGES"; images: string[] }
  | { type: "REMOVE_PRODUCT_IMAGE"; index: number }
  | { type: "SET_CREATOR_IMAGE"; data: string }
  | { type: "ADD_CREATOR_IMAGES"; images: string[] }
  | { type: "REMOVE_CREATOR_IMAGE"; index: number }
  | { type: "SET_FIELD"; field: keyof StudioState; value: unknown }
  | { type: "SET_SCRIPT_SCENES"; scriptScenes: ScriptScene[] }
  | { type: "UPDATE_SCRIPT_SCENE"; index: number; patch: Partial<ScriptScene> }
  | { type: "SET_GENERATING_SCRIPT"; v: boolean }
  | { type: "SET_SCRIPT_ERROR"; error: string | null }
  | { type: "SET_SCENES"; scenes: StoryboardScene[] }
  | { type: "SET_GENERATING_STORYBOARD"; v: boolean }
  | { type: "SET_STORYBOARD_ERROR"; error: string | null }
  | { type: "UPDATE_SCENE"; id: string; patch: Partial<StoryboardScene> }
  | { type: "SET_VIDTORY_URLS"; product?: string; creator?: string }
  | { type: "LOAD_PROJECT"; state: Partial<StudioState> }
  | { type: "RESET_PROGRESS" }
  | { type: "CLEAR_SOURCE" }
  | { type: "SET_PROJECT_META"; id: string | null; name: string | null }
  | { type: "SET_AUTO_PHASE"; phase: string; detail?: string; error?: string | null };
