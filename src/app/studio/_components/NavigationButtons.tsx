"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStudio } from "../_state/context";
import { STEPS } from "../_constants";

export function NavigationButtons() {
  const { s, dispatch } = useStudio();

  const canNext = (): boolean => {
    switch (s.step) {
      case 1:
        return !!(s.selectedAdVideoUrl || s.uploadedVideoUrl);
      case 2:
        return !!s.analysis;
      case 3:
        return !!s.productImage && !!s.bigIdea;
      case 4:
        return s.scriptScenes.length > 0;
      case 5:
        return s.scenes.length > 0;
      case 6:
        return s.scenes.some(
          (sc) => sc.images.length > 0 || sc.videos.length > 0
        );
      default:
        return false;
    }
  };

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() =>
          dispatch({ type: "SET_STEP", step: Math.max(1, s.step - 1) })
        }
        disabled={s.step === 1}
        className="flex items-center gap-1 text-sm px-4 py-2 bg-muted hover:bg-muted/80 disabled:opacity-30 rounded-md"
      >
        <ChevronLeft size={16} /> Back
      </button>
      <span className="text-sm text-muted-foreground">
        Step {s.step} of {STEPS.length}
      </span>
      <button
        onClick={() =>
          dispatch({
            type: "SET_STEP",
            step: Math.min(STEPS.length, s.step + 1),
          })
        }
        disabled={s.step === STEPS.length || !canNext()}
        className="flex items-center gap-1 text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white rounded-md"
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}
