import { NextRequest, NextResponse } from "next/server";
import { generateClonedStoryboard } from "@/lib/studio/gemini";

export async function POST(req: NextRequest) {
  try {
    const { analysis, script, productImage, productInfo, targetAudience, creatorImage } =
      await req.json();

    if (!analysis || !script || !productImage) {
      return NextResponse.json({ error: "Missing analysis, script, or productImage" }, { status: 400 });
    }

    const scenes = await generateClonedStoryboard(
      analysis, script, productImage, productInfo, targetAudience, creatorImage
    );
    return NextResponse.json({ scenes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Storyboard generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
