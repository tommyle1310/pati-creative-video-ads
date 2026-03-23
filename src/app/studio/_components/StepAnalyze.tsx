"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, RotateCcw, FileText } from "lucide-react";
import { useStudio } from "../_state/context";
import { useAnalysis } from "../_hooks/useAnalysis";
import { AnalysisSkeleton } from "./SkeletonPanels";
import { GeminiErrorBanner } from "./GeminiErrorBanner";
import { BlueprintSelector } from "./BlueprintSelector";
import type { VideoAnalysis } from "@/lib/studio/types";

const ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Parse a raw user-provided script into a VideoAnalysis structure.
 * Handles various formats: simple voiceover, detailed scripts with directions, etc.
 * Splits on blank lines or numbered lines to create scene entries.
 */
function parseProvidedScript(raw: string): VideoAnalysis {
  const lines = raw.trim().split("\n");
  const scenes: { visual: string; speech: string }[] = [];
  let currentBlock: string[] = [];

  function flushBlock() {
    if (currentBlock.length === 0) return;
    const text = currentBlock.join("\n").trim();
    if (!text) return;
    scenes.push({ visual: text, speech: text });
    currentBlock = [];
  }

  for (const line of lines) {
    // Split on blank lines or lines that start with a number/scene marker
    if (line.trim() === "") {
      flushBlock();
    } else if (/^(scene\s*\d+|#|\d+[\.\):])/i.test(line.trim()) && currentBlock.length > 0) {
      flushBlock();
      currentBlock.push(line);
    } else {
      currentBlock.push(line);
    }
  }
  flushBlock();

  // If no splits were found, treat the whole thing as one scene
  if (scenes.length === 0) {
    scenes.push({ visual: raw.trim(), speech: raw.trim() });
  }

  return {
    musicAndPacing: "From provided script",
    sceneBreakdown: scenes.map((sc, i) => ({
      scene_id: i + 1,
      type: "A-Roll",
      time: `Scene ${i + 1}`,
      visual: sc.visual,
      speech: sc.speech,
    })),
  };
}

export function StepAnalyze() {
  const { s, dispatch } = useStudio();
  const { extractFrames } = useAnalysis();

  // Track when frames appeared without analysis — show warning after 3 min
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const framesExist = s.frames.length > 0;
  const analysisExists = !!s.analysis;
  const waitingForAnalysis = framesExist && !analysisExists;

  useEffect(() => {
    if (waitingForAnalysis && !s.analyzeError) {
      setAnalysisTimedOut(false);
      timerRef.current = setTimeout(() => setAnalysisTimedOut(true), ANALYSIS_TIMEOUT_MS);
    } else {
      setAnalysisTimedOut(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [waitingForAnalysis, s.analyzeError]);

  // Button is disabled during extraction, analysis, OR while waiting for analysis result
  const isBusy = s.isAnalyzing || (waitingForAnalysis && !analysisTimedOut && !s.analyzeError);

  const buttonLabel = s.isAnalyzing
    ? framesExist
      ? "Analyzing..."
      : "Extracting frames..."
    : waitingForAnalysis && !analysisTimedOut && !s.analyzeError
    ? "Analyzing..."
    : analysisTimedOut || s.analyzeError
    ? "Re-analyze"
    : analysisExists
    ? "Re-extract & Analyze"
    : "Extract & Analyze";

  const buttonIcon = isBusy ? (
    <Loader2 size={16} className="animate-spin" />
  ) : analysisTimedOut || s.analyzeError ? (
    <RotateCcw size={16} />
  ) : (
    <Sparkles size={16} />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            Frame Extraction & Analysis
          </h2>
          <BlueprintSelector type="analyze" />
        </div>
        <div className="flex items-center gap-2">
          {s.providedScript.trim() && (
            <button
              onClick={() => {
                const analysis = parseProvidedScript(s.providedScript);
                dispatch({ type: "SET_ANALYSIS", analysis });
              }}
              disabled={isBusy}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              <FileText size={16} />
              Use Provided Script
            </button>
          )}
          <button
            onClick={extractFrames}
            disabled={isBusy}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {buttonIcon}
            {buttonLabel}
          </button>
        </div>
      </div>

      {s.analyzeError && (
        <GeminiErrorBanner
          error={s.analyzeError}
          onDismiss={() => dispatch({ type: "SET_ANALYZE_ERROR", error: null })}
        />
      )}

      {/* Extraction skeleton — shown while extracting frames */}
      {s.isAnalyzing && !framesExist && !s.analyzeError && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="flex gap-1 overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 w-24 bg-muted rounded shrink-0" />
            ))}
          </div>
          <AnalysisSkeleton />
        </div>
      )}

      {/* Frame thumbnails */}
      {framesExist && (
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

      {/* Skeleton: always show when frames exist but analysis hasn't arrived yet (and no error) */}
      {waitingForAnalysis && !analysisTimedOut && !s.analyzeError && (
        <AnalysisSkeleton />
      )}

      {/* Timeout warning — only after 3 minutes of waiting */}
      {waitingForAnalysis && analysisTimedOut && !s.analyzeError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-sm text-amber-400">
          Analysis timed out. Click &ldquo;Re-analyze&rdquo; to try again.
        </div>
      )}

      {/* Analysis result */}
      {analysisExists && (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-md p-4">
            <h3 className="text-sm font-medium mb-1">Music & Pacing</h3>
            <p className="text-sm text-muted-foreground">
              {s.analysis!.musicAndPacing}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">
              Scene Breakdown ({s.analysis!.sceneBreakdown.length} scenes)
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {s.analysis!.sceneBreakdown.map((scene) => (
                <div
                  key={scene.scene_id}
                  className="bg-muted/30 rounded-md p-3 text-sm"
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-muted-foreground font-mono text-xs shrink-0 w-[90px]">
                      {scene.time}
                    </span>
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                        scene.type.toLowerCase().includes("a-roll")
                          ? "bg-blue-500/20 text-blue-400"
                          : scene.type.toLowerCase().includes("b-roll")
                          ? "bg-amber-500/20 text-amber-400"
                          : scene.type.toLowerCase().includes("c-roll")
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {scene.type}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-1">
                    {scene.visual}
                  </p>
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
  );
}
