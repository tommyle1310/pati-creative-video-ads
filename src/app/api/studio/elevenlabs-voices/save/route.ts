import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.ELEVEN_LAB_API_KEY;
const BASE = "https://api.elevenlabs.io/v1";

// Save a previewed voice (from text-to-voice) to the user's voice library
export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "ELEVEN_LAB_API_KEY not set" }, { status: 500 });
  }

  try {
    const { voice_name, voice_description, generated_voice_id } = await req.json();

    if (!generated_voice_id || !voice_name) {
      return NextResponse.json(
        { error: "generated_voice_id and voice_name are required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BASE}/text-to-voice/create-voice-from-preview`, {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice_name,
        voice_description: voice_description || voice_name,
        generated_voice_id,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ voice_id: data.voice_id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save voice" },
      { status: 500 }
    );
  }
}
