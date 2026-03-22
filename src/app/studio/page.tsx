"use client";

import { Clapperboard } from "lucide-react";
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

function StudioContent() {
  const { s } = useStudio();

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clapperboard size={28} className="text-emerald-400" />
        <h1 className="text-2xl font-bold">Video Ad Studio</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          Clone &amp; Improve
        </span>
        <StudioInfoDialog />
        <div className="ml-auto">
          <SaveProjectButton />
        </div>
      </div>

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
