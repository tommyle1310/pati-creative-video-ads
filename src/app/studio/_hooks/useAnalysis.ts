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
        formData.append("analyze", "true");
        extractRes = await fetch("/api/studio/extract-frames", {
          method: "POST",
          body: formData,
        });
      } else if (s.sourceType === "db" && s.selectedAdVideoUrl) {
        extractRes = await fetch("/api/studio/extract-frames", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: s.selectedAdVideoUrl, analyze: true }),
        });
      } else {
        throw new Error("No video source selected");
      }

      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.error || "Frame extraction failed");
      }

      const data = await extractRes.json();

      // Server returns tiny thumbnails for the preview strip
      dispatch({ type: "SET_FRAMES", frames: data.frames });

      if (data.analysis) {
        // Analysis ran server-side in the same request (no payload round-trip)
        dispatch({ type: "SET_ANALYSIS", analysis: data.analysis });
        dispatch({ type: "SET_ANALYZING", v: false });
      } else if (data.analysisError) {
        // Frames extracted OK but Gemini analysis failed
        dispatch({ type: "SET_ANALYZE_ERROR", error: data.analysisError });
      } else {
        // No analysis returned — shouldn't happen with analyze=true
        dispatch({ type: "SET_ANALYZE_ERROR", error: "No analysis returned from server" });
      }
    } catch (err) {
      dispatch({
        type: "SET_ANALYZE_ERROR",
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }, [s.sourceType, s.selectedAdVideoUrl, s.uploadedVideoFile, dispatch]);

  return { extractFrames };
}
