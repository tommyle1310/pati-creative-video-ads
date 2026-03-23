import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/studio/transcribe";

export const maxDuration = 120;

/**
 * POST /api/studio/transcribe
 * Transcribes audio using Groq Whisper.
 * Body: { audio: string (base64 WAV) }
 * Returns: { transcript: string }
 *
 * Designed as a separate endpoint so the client can split
 * audio + frames into two requests (stays within Vercel's 4.5MB body limit).
 */
export async function POST(req: NextRequest) {
  try {
    const { audio } = await req.json();

    if (!audio) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }

    const transcript = await transcribeAudio(audio);
    return NextResponse.json({ transcript });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Transcription failed";
    console.error("[studio/transcribe]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
