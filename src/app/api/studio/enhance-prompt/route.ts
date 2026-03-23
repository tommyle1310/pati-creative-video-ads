import { NextRequest, NextResponse } from "next/server";
import { enhancePrompt } from "@/lib/studio/gemini";
import { getActivePrompt, resolvePromptFramework } from "@/lib/studio/blueprints";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { projectContext, scene, promptType, productImage, creatorImage } =
      await req.json();

    if (!scene || !promptType) {
      return NextResponse.json({ error: "Missing scene or promptType" }, { status: 400 });
    }

    // Fetch active enhance blueprint, resolve {{PROMPT_FRAMEWORK}} placeholder
    let systemInstruction = await getActivePrompt("enhance");
    if (systemInstruction) {
      systemInstruction = await resolvePromptFramework(systemInstruction);
    }

    const enhanced = await enhancePrompt(
      projectContext || "", scene, promptType, productImage, creatorImage,
      systemInstruction ? { systemInstruction } : undefined
    );
    return NextResponse.json({ enhancedPrompt: enhanced });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Prompt enhancement failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
