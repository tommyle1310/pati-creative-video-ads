import { NextRequest, NextResponse } from "next/server";
import { generateClonedScript } from "@/lib/studio/gemini";

export async function POST(req: NextRequest) {
  try {
    const { analysis, bigIdea, productImage, productInfo, targetAudience, creatorImage } =
      await req.json();

    if (!analysis || !bigIdea || !productImage) {
      return NextResponse.json({ error: "Missing analysis, bigIdea, or productImage" }, { status: 400 });
    }

    const scenes = await generateClonedScript(
      analysis, bigIdea, productImage, productInfo, targetAudience, creatorImage
    );
    return NextResponse.json({ scenes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Script generation failed";
    console.error("[studio/script]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
