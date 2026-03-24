"use client";

import { useState, useEffect } from "react";
import { Clapperboard, ArrowLeft, Zap, SlidersHorizontal } from "lucide-react";
import { StudioProvider, useStudio } from "./_state/context";
import { StepIndicator } from "./_components/StepIndicator";
import { StepSource } from "./_components/StepSource";
import { StepAnalyze } from "./_components/StepAnalyze";
import { StepProduct } from "./_components/StepProduct";
import { StepScript } from "./_components/StepScript";
import { StepStoryboard } from "./_components/StepStoryboard";
import { StepGenerate } from "./_components/StepGenerate";
import { StepPreview } from "./_components/StepPreview";
import { NavigationButtons } from "./_components/NavigationButtons";
import { SaveProjectButton } from "./_components/SaveProjectButton";
import { StudioInfoDialog } from "./_components/StudioInfoDialog";
import { StudioDashboard } from "./_components/StudioDashboard";
import { AutoModePanel } from "./_components/AutoModePanel";
import { AnnouncementDialog } from "../components/AnnouncementDialog";

type StudioMode = "auto" | "manual";

function StudioContent() {
  const { s } = useStudio();
  // null = not yet determined, true = forced wizard, false = forced dashboard
  const [showWizard, setShowWizard] = useState<boolean | null>(null);
  const [studioMode, setStudioMode] = useState<StudioMode>("auto");
  const [mounted, setMounted] = useState(false);

  // Defer auto-detection to client-side to avoid hydration mismatch
  // (server has no sessionStorage state, client may hydrate active work)
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasActiveWork =
    s.currentProjectId ||
    s.sourceType ||
    s.analysis ||
    s.scriptScenes.length > 0;

  // Before mount: always render dashboard (matches server). After mount: auto-detect.
  const wizardActive = !mounted
    ? false
    : showWizard === null
      ? !!hasActiveWork
      : showWizard;

  return (
    <div className="min-h-screen p-6 space-y-6">
      <AnnouncementDialog />
      {/* Header */}
      <div className="flex items-center gap-3">
        {wizardActive && (
          <button
            onClick={() => setShowWizard(false)}
            className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title="Back to Studio Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <Clapperboard size={28} className="text-emerald-400" />
        <h1 className="text-2xl font-bold">Video Ad Studio</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          Clone &amp; Improve
        </span>
        <StudioInfoDialog />

        {/* Auto / Manual toggle */}
        {wizardActive && (
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 ml-4">
            <button
              onClick={() => setStudioMode("auto")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                studioMode === "auto"
                  ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap size={12} />
              Auto
            </button>
            <button
              onClick={() => setStudioMode("manual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                studioMode === "manual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal size={12} />
              Manual
            </button>
          </div>
        )}

        {wizardActive && (
          <div className="ml-auto">
            <SaveProjectButton />
          </div>
        )}
      </div>

      {wizardActive ? (
        studioMode === "auto" ? (
          /* Auto mode — single-panel automation */
          <div className="bg-card border border-border rounded-lg p-6 min-h-[400px]">
            <AutoModePanel />
          </div>
        ) : (
          /* Manual mode — original 7-step wizard */
          <>
            {/* Step indicator */}
            <StepIndicator />

            {/* Step content */}
            <div className="bg-card border border-border rounded-lg p-6 min-h-[400px]">
              {s.step === 1 && <StepSource />}
              {s.step === 2 && <StepAnalyze />}
              {s.step === 3 && <StepProduct />}
              {s.step === 4 && <StepScript />}
              {s.step === 5 && <StepStoryboard />}
              {s.step === 6 && <StepGenerate />}
              {s.step === 7 && <StepPreview />}
            </div>

            {/* Navigation buttons */}
            <NavigationButtons />
          </>
        )
      ) : (
        <StudioDashboard onStart={() => setShowWizard(true)} />
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <StudioProvider>
      <StudioContent />
    </StudioProvider>
  );
}
