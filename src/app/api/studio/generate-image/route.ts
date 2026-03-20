import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/studio/vidtory";

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio, characterUrl, productUrl } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const jobId = await generateImage(prompt, aspectRatio || "9:16", characterUrl, productUrl);
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
    const msg = e instanceof Error ? e.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
