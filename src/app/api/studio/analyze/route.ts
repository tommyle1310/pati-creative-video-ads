import { NextRequest, NextResponse } from "next/server";
import { analyzeVideoFrames } from "@/lib/studio/gemini";
import { getActivePrompt } from "@/lib/studio/blueprints";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { frames, fps, duration, audio } = await req.json();

    if (!frames?.length || !fps || !duration) {
      return NextResponse.json({ error: "Missing frames, fps, or duration" }, { status: 400 });
    }

    // Send all frames (up to 60) for full video coverage
    const maxFrames = 60;
    const limitedFrames = frames.length <= maxFrames
      ? frames
      : Array.from({ length: maxFrames }, (_, i) =>
          frames[Math.floor((i / maxFrames) * frames.length)]
        );

    // Fetch active blueprint (falls back to hardcoded if DB fails or empty)
    const systemInstruction = await getActivePrompt("analyze");

    const analysis = await analyzeVideoFrames(
      limitedFrames, fps, duration, audio || undefined,
      systemInstruction ? { systemInstruction } : undefined
    );
    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    console.error("[studio/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
