import { NextRequest, NextResponse } from "next/server";
import { analyzeVideoFrames as geminiAnalyze } from "@/lib/studio/gemini";
import { analyzeVideoFrames as claudeAnalyze } from "@/lib/studio/claude";
import { getAiProvider } from "@/lib/studio/ai-provider";
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
    const overrides = systemInstruction ? { systemInstruction } : undefined;

    const provider = getAiProvider();
    const analyze = provider === "claude" ? claudeAnalyze : geminiAnalyze;
    const analysis = await analyze(limitedFrames, fps, duration, audio || undefined, overrides);

    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    console.error("[studio/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
