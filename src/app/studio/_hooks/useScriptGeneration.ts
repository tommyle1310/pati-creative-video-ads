"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";
import { resizeImageForApi } from "../_utils/helpers";

export function useScriptGeneration() {
  const { s, dispatch } = useStudio();

  const handleGenerateScript = useCallback(async () => {
    dispatch({ type: "SET_GENERATING_SCRIPT", v: true });
    try {
      // Resize images to stay under Claude's 5MB per-image limit
      const [productImage, creatorImage] = await Promise.all([
        s.productImage ? resizeImageForApi(s.productImage) : Promise.resolve(null),
        s.creatorImage ? resizeImageForApi(s.creatorImage) : Promise.resolve(null),
      ]);

      const res = await fetch("/api/studio/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: s.analysis,
          bigIdea: s.bigIdea,
          productImage,
          productInfo: s.productInfo,
          targetAudience: s.targetAudience,
          creatorImage,
          motivator: s.motivator,
          emotionalTone: s.emotionalTone,
          storylineType: s.storylineType,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `Script generation failed (${res.status})`;
        try { msg = JSON.parse(text).error || msg; } catch { /* non-JSON response */ }
        throw new Error(msg);
      }
      const { scenes: scriptScenes } = await res.json();
      dispatch({ type: "SET_SCRIPT_SCENES", scriptScenes });
    } catch (err) {
      dispatch({
        type: "SET_SCRIPT_ERROR",
        error: err instanceof Error ? err.message : "Script generation failed",
      });
    }
  }, [
    s.analysis,
    s.bigIdea,
    s.productImage,
    s.productInfo,
    s.targetAudience,
    s.creatorImage,
    s.motivator,
    s.emotionalTone,
    s.storylineType,
    dispatch,
  ]);

  return { handleGenerateScript };
}
