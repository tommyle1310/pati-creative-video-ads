"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";
import { resizeImageForApi } from "../_utils/helpers";

export function useStoryboardGeneration() {
  const { s, dispatch } = useStudio();

  const handleGenerateStoryboard = useCallback(async () => {
    dispatch({ type: "SET_GENERATING_STORYBOARD", v: true });
    try {
      // Resize images to stay under Claude's 5MB per-image limit
      const [productImage, creatorImage] = await Promise.all([
        s.productImage ? resizeImageForApi(s.productImage) : Promise.resolve(null),
        s.creatorImage ? resizeImageForApi(s.creatorImage) : Promise.resolve(null),
      ]);

      const res = await fetch("/api/studio/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: s.analysis,
          script: s.scriptScenes
            .map((sc, i) => `Scene ${i + 1} [${sc.sceneType}]: ${sc.dialogue}`)
            .join("\n"),
          productImage,
          productInfo: s.productInfo,
          targetAudience: s.targetAudience,
          creatorImage,
          motivator: s.motivator,
          emotionalTone: s.emotionalTone,
          storylineType: s.storylineType,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { scenes } = await res.json();
      dispatch({ type: "SET_SCENES", scenes });
    } catch (err) {
      dispatch({
        type: "SET_STORYBOARD_ERROR",
        error: err instanceof Error ? err.message : "Storyboard generation failed",
      });
    }
  }, [
    s.analysis,
    s.scriptScenes,
    s.productImage,
    s.productInfo,
    s.targetAudience,
    s.creatorImage,
    s.motivator,
    s.emotionalTone,
    s.storylineType,
    dispatch,
  ]);

  return { handleGenerateStoryboard };
}
