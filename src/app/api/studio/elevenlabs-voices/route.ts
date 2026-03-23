import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.ELEVEN_LAB_API_KEY;
const BASE = "https://api.elevenlabs.io/v1";

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ error: "ELEVEN_LAB_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch(`${BASE}/voices`, {
      headers: { "xi-api-key": API_KEY },
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    const data = await res.json();
    const voices = (data.voices || []).map((v: Record<string, unknown>) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels,
      preview_url: v.preview_url,
    }));
    return NextResponse.json({ voices });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch voices" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "ELEVEN_LAB_API_KEY not set" }, { status: 500 });
  }

  try {
    const { name, description, text } = await req.json();

    if (!name || !text) {
      return NextResponse.json({ error: "name and text are required" }, { status: 400 });
    }

    // ElevenLabs requires text to be at least 100 characters
    let sampleText = text;
    if (sampleText.length < 100) {
      sampleText = sampleText + " This voice is designed for high-quality narration and advertisement content for engaging video productions and commercial spots.";
    }

    // voice_description also needs minimum length for the API
    let voiceDesc = description || name;
    if (voiceDesc.length < 100) {
      voiceDesc = voiceDesc + " A versatile voice suitable for advertisements, narration, and video content with clear articulation and engaging delivery.";
    }

    // Use voice design (text-to-voice) to create a voice from a prompt
    const res = await fetch(`${BASE}/text-to-voice/create-previews`, {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice_description: voiceDesc,
        text: sampleText,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    // data.previews is an array of { audio_base_64, generated_voice_id, ... }
    const previews = data.previews || [];

    return NextResponse.json({ previews });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create voice" },
      { status: 500 }
    );
  }
}
