import { NextRequest, NextResponse } from "next/server";
import { generateClonedStoryboard } from "@/lib/studio/gemini";
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

    const scenes = await generateClonedStoryboard(
      analysis, script, productImage, productInfo, targetAudience, creatorImage,
      { motivator, emotionalTone, storylineType },
      systemInstruction ? { systemInstruction } : undefined
    );
    return NextResponse.json({ scenes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Storyboard generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
