import { NextRequest, NextResponse } from "next/server";
import { generateImageKie } from "@/lib/studio/kie";

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio, characterUrl, productUrl } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      );
    }

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const taskId = await generateImageKie(
          prompt,
          aspectRatio || "9:16",
          characterUrl || undefined,
          productUrl || undefined
        );
        return NextResponse.json({ jobId: taskId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (attempt < MAX_RETRIES && (msg.includes("429") || msg.includes("rate"))) {
          await new Promise((r) => setTimeout(r, attempt * 3000));
          continue;
        }
        throw err;
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "KIE image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
