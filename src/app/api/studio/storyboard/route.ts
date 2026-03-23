import { NextRequest, NextResponse } from "next/server";
import { generateClonedStoryboard as geminiStoryboard } from "@/lib/studio/gemini";
import { generateClonedStoryboard as claudeStoryboard } from "@/lib/studio/claude";
import { getAiProvider } from "@/lib/studio/ai-provider";
import { getActivePrompt, resolvePromptFramework } from "@/lib/studio/blueprints";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { analysis, script, productImage, productInfo, targetAudience, creatorImage, motivator, emotionalTone, storylineType } =
      await req.json();

    if (!analysis || !script || !productImage) {
      return NextResponse.json({ error: "Missing analysis, script, or productImage" }, { status: 400 });
    }

    // Fetch active storyboard blueprint, resolve {{PROMPT_FRAMEWORK}} placeholder
    let systemInstruction = await getActivePrompt("storyboard");
    if (systemInstruction) {
      systemInstruction = await resolvePromptFramework(systemInstruction);
    }
    const overrides = systemInstruction ? { systemInstruction } : undefined;

    const provider = getAiProvider();
    const generate = provider === "claude" ? claudeStoryboard : geminiStoryboard;
    const scenes = await generate(
      analysis, script, productImage, productInfo, targetAudience, creatorImage,
      { motivator, emotionalTone, storylineType },
      overrides
    );
    return NextResponse.json({ scenes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Storyboard generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
