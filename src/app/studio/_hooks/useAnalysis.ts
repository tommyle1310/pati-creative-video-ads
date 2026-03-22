"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";

export function useAnalysis() {
  const { s, dispatch } = useStudio();

  const extractFrames = useCallback(async () => {
    dispatch({ type: "SET_ANALYZING", v: true });

    try {
      let extractRes: Response;

      if (s.sourceType === "upload" && s.uploadedVideoFile) {
        const formData = new FormData();
        formData.append("video", s.uploadedVideoFile);
        extractRes = await fetch("/api/studio/extract-frames", {
          method: "POST",
          body: formData,
        });
      } else if (s.sourceType === "db" && s.selectedAdVideoUrl) {
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

      const { frames, duration, fps, audio } = await extractRes.json();
      dispatch({ type: "SET_FRAMES", frames });

      const analyzeRes = await fetch("/api/studio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, fps, duration, audio }),
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
  }, [s.sourceType, s.selectedAdVideoUrl, s.uploadedVideoFile, dispatch]);

  return { extractFrames };
}
