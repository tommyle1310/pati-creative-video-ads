import { NextRequest, NextResponse } from "next/server";
import { generateTTS } from "@/lib/studio/gemini";

export async function POST(req: NextRequest) {
  try {
    const { text, guide, voice, globalInstruction } = await req.json();

    if (!text || !voice) {
      return NextResponse.json({ error: "Missing text or voice" }, { status: 400 });
    }

    const audioBase64 = await generateTTS(text, guide || "", voice, globalInstruction);
    return NextResponse.json({ audioBase64 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "TTS generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
