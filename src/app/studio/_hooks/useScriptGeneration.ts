"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";

export function useScriptGeneration() {
  const { s, dispatch } = useStudio();

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
