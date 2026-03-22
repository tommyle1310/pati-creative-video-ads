import { NextRequest, NextResponse } from "next/server";
import { analyzeVideoFrames } from "@/lib/studio/gemini";

export async function POST(req: NextRequest) {
  try {
    const { frames, fps, duration } = await req.json();

    if (!frames?.length || !fps || !duration) {
      return NextResponse.json({ error: "Missing frames, fps, or duration" }, { status: 400 });
    }

    // Evenly sample up to 30 frames across the full video for complete coverage
    const maxFrames = 30;
    const limitedFrames = frames.length <= maxFrames
      ? frames
      : Array.from({ length: maxFrames }, (_, i) =>
          frames[Math.floor((i / maxFrames) * frames.length)]
        );
    const analysis = await analyzeVideoFrames(limitedFrames, fps, duration);
    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    console.error("[studio/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
