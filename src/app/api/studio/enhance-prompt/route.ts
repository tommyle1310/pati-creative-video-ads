import { NextRequest, NextResponse } from "next/server";
import { enhancePrompt as geminiEnhance } from "@/lib/studio/gemini";
import { enhancePrompt as claudeEnhance } from "@/lib/studio/claude";
import { getAiProvider } from "@/lib/studio/ai-provider";
import { getActivePrompt, resolvePromptFramework } from "@/lib/studio/blueprints";
import type { PromptType } from "@/lib/studio/default-prompts";

export const maxDuration = 300;

/** Strip markdown code fences (```json ... ``` or ``` ... ```) from AI output */
function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { projectContext, scene, promptType, productImage, creatorImage, rollType } =
      await req.json();

    if (!scene || !promptType) {
      return NextResponse.json({ error: "Missing scene or promptType" }, { status: 400 });
    }

    // Try roll+media-specific blueprint first (e.g. enhance_croll_video),
    // then fall back to the global "enhance" blueprint
    let systemInstruction: string | undefined;

    if (rollType && promptType) {
      const specificType = `enhance_${rollType}_${promptType}` as PromptType;
      systemInstruction = await getActivePrompt(specificType);
    }
    if (!systemInstruction) {
      systemInstruction = await getActivePrompt("enhance");
    }
    if (systemInstruction) {
      systemInstruction = await resolvePromptFramework(systemInstruction);
    }
    const overrides = systemInstruction ? { systemInstruction } : undefined;

    const provider = getAiProvider();
    const enhance = provider === "claude" ? claudeEnhance : geminiEnhance;
    const enhanced = await enhance(
      projectContext || "", scene, promptType, productImage, creatorImage,
      overrides
    );

    // Strip markdown code fences that AI sometimes wraps around output
    const cleaned = stripCodeFences(enhanced);

    return NextResponse.json({ enhancedPrompt: cleaned });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Prompt enhancement failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
