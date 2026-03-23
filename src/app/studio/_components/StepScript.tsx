"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useStudio } from "../_state/context";
import { useScriptGeneration } from "../_hooks/useScriptGeneration";
import { MOTIVATORS, EMOTIONAL_TONES, STORYLINE_TYPES } from "../_constants";
import { ScriptSkeleton } from "./SkeletonPanels";
import { GeminiErrorBanner } from "./GeminiErrorBanner";
import { BlueprintSelector } from "./BlueprintSelector";

export function StepScript() {
  const { s, dispatch } = useStudio();
  const { handleGenerateScript } = useScriptGeneration();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            Cloned Script ({s.scriptScenes.length} scenes)
          </h2>
          <BlueprintSelector type="script" />
        </div>
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
          <p className="text-xs text-muted-foreground mb-1">
            Original structure:
          </p>
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
              Motivator:{" "}
              {MOTIVATORS.find((m) => m.value === s.motivator)?.label}
            </span>
          )}
          {s.emotionalTone && (
            <span className="text-xs px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md">
              Tone:{" "}
              {
                EMOTIONAL_TONES.find((t) => t.value === s.emotionalTone)
                  ?.label
              }
            </span>
          )}
          {s.storylineType && (
            <span className="text-xs px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-md">
              Storyline:{" "}
              {
                STORYLINE_TYPES.find((st) => st.value === s.storylineType)
                  ?.label
              }
            </span>
          )}
        </div>
      )}

      {s.scriptError && (
        <GeminiErrorBanner
          error={s.scriptError}
          onDismiss={() => dispatch({ type: "SET_SCRIPT_ERROR", error: null })}
        />
      )}

      {/* Skeleton while generating */}
      {s.isGeneratingScript && s.scriptScenes.length === 0 && (
        <ScriptSkeleton />
      )}

      {s.scriptScenes.length === 0 &&
        !s.isGeneratingScript &&
        !s.scriptError && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Click &ldquo;Generate Script&rdquo; to create a multi-scene
            script based on the analysis.
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
              <label className="text-xs text-muted-foreground">
                Dialogue / Voiceover
              </label>
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
              <label className="text-xs text-muted-foreground">
                Direction / Tone
              </label>
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
  );
}
