import { NextRequest, NextResponse } from "next/server";
import { generateVideo } from "@/lib/studio/vidtory";

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio, startImageUrl, duration } = await req.json();

    if (!prompt || !startImageUrl) {
      return NextResponse.json({ error: "Missing prompt or startImageUrl" }, { status: 400 });
    }

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const jobId = await generateVideo(
          prompt, aspectRatio || "9:16", startImageUrl, duration || 5
        );
        return NextResponse.json({ jobId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Job ID is missing") && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, attempt * 3000));
          continue;
        }
        throw err;
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Video generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
