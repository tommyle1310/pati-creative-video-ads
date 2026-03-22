"use client";

import { useState } from "react";
import {
  Info,
  Upload,
  Sparkles,
  Package,
  Clapperboard,
  Image as ImageIcon,
  Video,
  Play,
  ArrowRight,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PIPELINE_STEPS = [
  {
    icon: Upload,
    label: "Source",
    input: "A competitor video ad (upload or from DB)",
    process: "You pick a video ad you want to clone and improve for your own product.",
    output: "Selected video file ready for analysis",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Sparkles,
    label: "Analyze",
    input: "Video frames + audio track",
    process:
      "Gemini AI watches your video frame-by-frame and listens to the audio. It breaks the ad into individual scenes — identifying what type each scene is (hook, product shot, testimonial, CTA), what the speaker says, and how the visuals are composed.",
    output: "Scene-by-scene breakdown with timestamps, speech transcription, and visual descriptions",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Package,
    label: "Product",
    input: "Your product image, creator face, landing page, big idea",
    process:
      "You tell the AI about YOUR product — what it is, who it's for, and what makes it special. You also pick a creative strategy: the psychological motivator (pain point, aspiration, social proof...), emotional tone, and storyline type. This is based on Meta's Andromeda system where 'creative is the new targeting'.",
    output: "Complete product brief + creative strategy direction",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: Clapperboard,
    label: "Script",
    input: "Original scene breakdown + your product + creative strategy",
    process:
      "Gemini writes a NEW script for YOUR product that follows the exact same structure as the original ad (same number of scenes, same pacing, same scene types) — but with your product's messaging, your chosen motivator, and your emotional tone. You can edit every line.",
    output: "Multi-scene script with dialogue and direction notes per scene",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    icon: ImageIcon,
    label: "Storyboard",
    input: "Script + original visuals + product images + creative strategy",
    process:
      "Gemini creates detailed image and video prompts for each scene — specifying exactly what each shot should look like (camera angle, lighting, subject pose, product placement). Each scene is classified as A-Roll (talking head), B-Roll (product interaction), or C-Roll (concept/science visual).",
    output: "Per-scene image prompts, video prompts, voiceover scripts, and roll-type classifications",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Video,
    label: "Generate",
    input: "Storyboard prompts + product/creator images",
    process:
      "For each scene: (1) Generate a photorealistic image from the prompt, (2) Animate that image into a 5-second video clip, (3) Generate AI voiceover audio from the script. You can save any generated asset to your library for reuse.",
    output: "Per-scene images, video clips, and audio files",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Play,
    label: "Preview",
    input: "All generated scene assets",
    process:
      "Review every scene's video, script, and audio side by side. Download individual clips and combine them in CapCut, Premiere, or DaVinci Resolve to create your final ad.",
    output: "Downloadable video clips + audio ready for final editing",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
];

export function StudioInfoDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        title="How it works"
      >
        <Info size={18} />
      </button>

      

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Info size={20} className="text-emerald-400" />
              How Video Ad Studio Works
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Clone any competitor&apos;s winning video ad structure and recreate it for your own product — in 7 steps.
            </p>

             {/* PDF download */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                This use the approach provided by Motionapp.com
              </p>
              <a
                href="/Meta_Ads_AI_Stack_Complete_Reference.pdf"
                download
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Download size={14} />
                Download Meta Ads AI Stack Reference (PDF)
              </a>
            </div>

            {/* IPO Pipeline */}
            <div className="space-y-3 mt-4">
              {PIPELINE_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className={`rounded-lg border border-border p-3 space-y-2`}>
                    {/* Step header */}
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${step.bg}`}>
                        <Icon size={14} className={step.color} />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        STEP {i + 1}
                      </span>
                      <span className={`text-sm font-semibold ${step.color}`}>
                        {step.label}
                      </span>
                    </div>

                    {/* Process (main explanation) */}
                    <p className="text-sm text-foreground leading-relaxed">
                      {step.process}
                    </p>

                    {/* I/O row */}
                    <div className="flex items-start gap-2 text-[11px]">
                      <div className="flex-1 bg-muted/30 rounded px-2 py-1.5">
                        <span className="font-semibold text-muted-foreground">IN: </span>
                        <span className="text-muted-foreground">{step.input}</span>
                      </div>
                      <ArrowRight size={12} className="text-muted-foreground mt-1.5 shrink-0" />
                      <div className="flex-1 bg-muted/30 rounded px-2 py-1.5">
                        <span className="font-semibold text-muted-foreground">OUT: </span>
                        <span className="text-muted-foreground">{step.output}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

           
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
