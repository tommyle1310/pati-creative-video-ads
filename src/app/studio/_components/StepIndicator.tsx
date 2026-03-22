"use client";

import { Check, ChevronRight } from "lucide-react";
import { useStudio } from "../_state/context";
import { STEPS } from "../_constants";

export function StepIndicator() {
  const { s, dispatch } = useStudio();

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((st, i) => {
        const StepIcon = st.icon;
        const stepNum = i + 1;
        const isCurrent = s.step === stepNum;
        const isDone = s.step > stepNum;
        return (
          <div key={st.label} className="flex items-center">
            <button
              onClick={() =>
                stepNum <= s.step &&
                dispatch({ type: "SET_STEP", step: stepNum })
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : isDone
                  ? "bg-muted text-foreground cursor-pointer hover:bg-muted/80"
                  : "text-muted-foreground cursor-default"
              }`}
            >
              {isDone ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <StepIcon size={14} />
              )}
              <span className="hidden sm:inline">{st.label}</span>
              <span className="sm:hidden">{stepNum}</span>
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight
                size={14}
                className="text-muted-foreground mx-0.5"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
