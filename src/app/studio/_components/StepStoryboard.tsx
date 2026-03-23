"use client";

import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useStudio } from "../_state/context";
import { useStoryboardGeneration } from "../_hooks/useStoryboardGeneration";
import { useAssetGeneration } from "../_hooks/useAssetGeneration";
import { StoryboardSkeleton } from "./SkeletonPanels";
import { GeminiErrorBanner } from "./GeminiErrorBanner";
import { BlueprintSelector } from "./BlueprintSelector";

export function StepStoryboard() {
  const { s, dispatch } = useStudio();
  const { handleGenerateStoryboard } = useStoryboardGeneration();
  const { handleEnhancePrompt } = useAssetGeneration();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            Storyboard ({s.scenes.length} scenes)
          </h2>
          <BlueprintSelector type="storyboard" />
          <BlueprintSelector type="prompt_framework" label="Framework" />
        </div>
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

      {s.storyboardError && (
        <GeminiErrorBanner
          error={s.storyboardError}
          onDismiss={() => dispatch({ type: "SET_STORYBOARD_ERROR", error: null })}
        />
      )}

      {/* Skeleton while generating */}
      {s.isGeneratingStoryboard && s.scenes.length === 0 && (
        <StoryboardSkeleton />
      )}

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
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      scene.rollType === "aroll"
                        ? "bg-blue-500/20 text-blue-400"
                        : scene.rollType === "broll"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {scene.rollType === "aroll"
                      ? "A-ROLL"
                      : scene.rollType === "broll"
                      ? "B-ROLL"
                      : "C-ROLL"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {scene.rollType && (
                  <>
                    <BlueprintSelector
                      type={`enhance_${scene.rollType}_image` as "enhance_aroll_image" | "enhance_broll_image" | "enhance_croll_image"}
                      label="Img"
                    />
                    <BlueprintSelector
                      type={`enhance_${scene.rollType}_video` as "enhance_aroll_video" | "enhance_broll_video" | "enhance_croll_video"}
                      label="Vid"
                    />
                  </>
                )}
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
  );
}
