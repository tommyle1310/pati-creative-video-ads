import { NextRequest, NextResponse } from "next/server";
import { enhancePrompt } from "@/lib/studio/gemini";

export async function POST(req: NextRequest) {
  try {
    const { projectContext, scene, promptType, productImage, creatorImage } =
      await req.json();

    if (!scene || !promptType) {
      return NextResponse.json({ error: "Missing scene or promptType" }, { status: 400 });
    }

    const enhanced = await enhancePrompt(
      projectContext || "", scene, promptType, productImage, creatorImage
    );
    return NextResponse.json({ enhancedPrompt: enhanced });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Prompt enhancement failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
