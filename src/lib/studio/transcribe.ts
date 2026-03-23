// ── Audio Transcription Service (Groq Whisper) ─────────────
// Free, fast speech-to-text using Groq's Whisper API.
// Used when Claude is the AI provider (Claude can't process audio).

import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), ".tmp", "settings.json");

function getGroqApiKey(): string {
  let key = process.env.GROQ_API_KEY;
  if (!key) {
    try {
      if (fs.existsSync(SETTINGS_PATH)) {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
        if (settings.groqApiKey) {
          key = settings.groqApiKey;
          process.env.GROQ_API_KEY = key;
        }
      }
    } catch {}
  }
  if (!key) throw new Error("GROQ_API_KEY not set — required for audio transcription when using Claude. Get a free key at console.groq.com");
  return key;
}

/**
 * Transcribe audio using Groq's Whisper API.
 * Accepts base64-encoded WAV audio, returns transcript text.
 * Free tier: 7,200 audio-seconds/day.
 */
export async function transcribeAudio(audioBase64: string): Promise<string> {
  const apiKey = getGroqApiKey();

  // Convert base64 to a Buffer for multipart upload
  const audioBuffer = Buffer.from(audioBase64, "base64");

  // Build multipart form data
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: "audio/wav" }), "audio.wav");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", "en");
  formData.append("response_format", "text");

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get("retry-after");
      const delay = retryAfter ? Math.ceil(parseFloat(retryAfter)) * 1000 : 10_000;
      console.warn(`[Groq Whisper] 429, attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = (errData as { error?: { message?: string } }).error?.message || `Groq API error ${res.status}`;
      throw new Error(errMsg);
    }

    const text = await res.text();
    return text.trim() || "No speech detected.";
  }

  throw new Error("Groq Whisper rate-limited. Please wait and try again.");
}

/**
 * Transcribe audio from a file path (for server-side use with ffmpeg).
 * Reads the file and delegates to transcribeAudio.
 */
export async function transcribeAudioFile(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  return transcribeAudio(buffer.toString("base64"));
}
