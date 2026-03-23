import { NextRequest, NextResponse } from "next/server";
import { generateClonedScript as geminiScript } from "@/lib/studio/gemini";
import { generateClonedScript as claudeScript } from "@/lib/studio/claude";
import { getAiProvider } from "@/lib/studio/ai-provider";
import { getActivePrompt } from "@/lib/studio/blueprints";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { analysis, bigIdea, productImage, productInfo, targetAudience, creatorImage, motivator, emotionalTone, storylineType } =
      await req.json();

    if (!analysis || !bigIdea || !productImage) {
      return NextResponse.json({ error: "Missing analysis, bigIdea, or productImage" }, { status: 400 });
    }

    const systemInstruction = await getActivePrompt("script");
    const overrides = systemInstruction ? { systemInstruction } : undefined;

    const provider = getAiProvider();
    const generate = provider === "claude" ? claudeScript : geminiScript;
    const scenes = await generate(
      analysis, bigIdea, productImage, productInfo, targetAudience, creatorImage,
      { motivator, emotionalTone, storylineType },
      overrides
    );
    return NextResponse.json({ scenes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Script generation failed";
    console.error("[studio/script]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
