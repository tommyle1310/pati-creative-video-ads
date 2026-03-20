// ── Studio Types ──────────────────────────────────────────────
// Mirrors INTEGRATION_GUIDE.md data models for the Video Ad Studio pipeline.

export interface VideoData {
  url: string;
  mediaGenerationId: string;
  seed: number;
  upscaledUrl?: string;
}

export interface StoryboardScene {
  id: string;
  voiceoverScript: string;
  voiceoverGuide: string;
  imagePrompt: string;
  videoPrompt: string;
  images: string[];
  selectedImageForVideo?: string;
  videos: VideoData[];
  audioUrl?: string;

  // Enhancement modifiers
  imageFocusObject?: string;
  imageCameraAngle?: string;
  videoCameraMovement?: string;
  videoShootingEffect?: string;

  // UI state
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  isGeneratingAudio: boolean;
  imageGenerationError: string | null;
  videoGenerationError: string | null;
  audioGenerationError: string | null;
  includeDialogueInPrompt: boolean;

  // Vidtory job IDs for polling
  imageJobId?: string;
  videoJobId?: string;
}

export interface SceneBreakdown {
  scene_id: number;
  type: string;
  time: string;
  visual: string;
  speech: string;
}

export interface VideoAnalysis {
  musicAndPacing: string;
  sceneBreakdown: SceneBreakdown[];
}

// ── API Request/Response types ──

export interface AnalyzeFramesRequest {
  frames: string[]; // base64 JPEG data URLs
  fps: number;
  duration: number;
}

export interface GenerateScriptRequest {
  analysis: VideoAnalysis;
  bigIdea: string;
  productImage: string; // base64
  productInfo?: string;
  targetAudience?: string;
  creatorImage?: string; // base64
}

export interface GenerateStoryboardRequest {
  analysis: VideoAnalysis;
  script: string;
  productImage: string;
  productInfo?: string;
  targetAudience?: string;
  creatorImage?: string;
}

export interface GenerateImageRequest {
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  characterUrl?: string; // hosted URL (pre-uploaded)
  productUrl?: string;   // hosted URL (pre-uploaded)
}

export interface GenerateVideoRequest {
  prompt: string;
  aspectRatio: "9:16" | "16:9";
  startImageUrl: string; // hosted URL
  duration?: number;
}

export interface ScriptScene {
  sceneType: string;
  dialogue: string;
  direction: string;
}

export interface TTSRequest {
  text: string;
  guide: string;
  voice: string;
  globalInstruction?: string;
}

export interface EnhancePromptRequest {
  projectContext: string;
  scene: StoryboardScene;
  promptType: "image" | "video";
  productImage?: string;
  creatorImage?: string;
}

export interface JobStatusResponse {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  url?: string;
  type?: string;
  error?: string;
}

// ── Helper ──

export function createDefaultScene(partial: {
  voiceoverScript: string;
  voiceoverGuide: string;
  imagePrompt: string;
  videoPrompt: string;
}): StoryboardScene {
  return {
    id: crypto.randomUUID(),
    ...partial,
    images: [],
    videos: [],
    isGeneratingImage: false,
    isGeneratingVideo: false,
    isGeneratingAudio: false,
    imageGenerationError: null,
    videoGenerationError: null,
    audioGenerationError: null,
    includeDialogueInPrompt: true,
  };
}
