import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.ELEVEN_LAB_API_KEY;
const BASE = "https://api.elevenlabs.io/v1";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "ELEVEN_LAB_API_KEY not set" }, { status: 500 });
  }

  try {
    const { text, voice_id } = await req.json();

    if (!text || !voice_id) {
      return NextResponse.json({ error: "text and voice_id are required" }, { status: 400 });
    }

    // ElevenLabs requires at least 100 characters — pad short scripts with
    // trailing SSML-style pauses that produce silence, preserving the original speech.
    let paddedText = text;
    if (paddedText.length < 100) {
      paddedText = paddedText + " ...".repeat(Math.ceil((100 - paddedText.length) / 4));
    }

    const res = await fetch(`${BASE}/text-to-speech/${voice_id}`, {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: paddedText,
        model_id: "eleven_v3",
        output_format: "mp3_44100_128",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({ audioBase64: base64, format: "mp3" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ElevenLabs TTS failed" },
      { status: 500 }
    );
  }
}
