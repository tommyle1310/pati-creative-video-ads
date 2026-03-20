import { NextRequest, NextResponse } from "next/server";
import { analyzeVideoFrames } from "@/lib/studio/gemini";

export async function POST(req: NextRequest) {
  try {
    const { frames, fps, duration } = await req.json();

    if (!frames?.length || !fps || !duration) {
      return NextResponse.json({ error: "Missing frames, fps, or duration" }, { status: 400 });
    }

    // Hard cap at 10 frames — gemini service will also sample down
    const limitedFrames = frames.slice(0, 10);
    const analysis = await analyzeVideoFrames(limitedFrames, fps, duration);
    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    console.error("[studio/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
