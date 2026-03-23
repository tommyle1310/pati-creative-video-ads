/**
 * GET /api/settings — returns current settings (masked keys)
 * POST /api/settings — update settings { geminiApiKey, imageApiKey, imageProvider, videoApiKey, videoProvider }
 * DELETE /api/settings — reset a specific key to defaults (body: { key: "gemini" | "image" | "video" })
 *
 * The custom keys are stored in a simple JSON file at .tmp/settings.json
 * so they persist across server restarts but stay out of .env.
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), ".tmp", "settings.json");

type ImageProvider = "vidtory" | "kie";
type VideoProvider = "vidtory" | "kie";
type AiProvider = "gemini" | "claude";

interface Settings {
  geminiApiKey?: string;
  anthropicApiKey?: string;
  aiProvider?: AiProvider;
  imageApiKey?: string;
  imageProvider?: ImageProvider;
  videoApiKey?: string;
  videoProvider?: VideoProvider;
}

function readSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    }
  } catch {}
  return {};
}

function writeSettings(settings: Settings) {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function maskKey(key: string | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function readEnvKey(name: string): string | undefined {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return undefined;
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : undefined;
}

export async function GET() {
  const settings = readSettings();
  const envGemini = process.env.GEMINI_API_KEY;
  const envAnthropic = process.env.ANTHROPIC_API_KEY;
  const envVidtory = process.env.VIDTORY_API_KEY;

  const hasCustomGemini = !!settings.geminiApiKey;
  const hasCustomAnthropic = !!settings.anthropicApiKey;
  const hasCustomImage = !!settings.imageApiKey;
  const hasCustomVideo = !!settings.videoApiKey;

  return NextResponse.json({
    geminiApiKey: maskKey(hasCustomGemini ? settings.geminiApiKey : envGemini),
    isUsingCustomGeminiKey: hasCustomGemini,
    hasEnvGeminiKey: !!envGemini,

    anthropicApiKey: maskKey(hasCustomAnthropic ? settings.anthropicApiKey : envAnthropic),
    isUsingCustomAnthropicKey: hasCustomAnthropic,
    hasEnvAnthropicKey: !!envAnthropic,

    aiProvider: settings.aiProvider || "gemini",

    imageApiKey: maskKey(hasCustomImage ? settings.imageApiKey : envVidtory),
    imageProvider: settings.imageProvider || "vidtory",
    isUsingCustomImageKey: hasCustomImage,
    hasEnvImageKey: !!envVidtory,

    videoApiKey: maskKey(hasCustomVideo ? settings.videoApiKey : envVidtory),
    videoProvider: settings.videoProvider || "vidtory",
    isUsingCustomVideoKey: hasCustomVideo,
    hasEnvVideoKey: !!envVidtory,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = readSettings();

    // Gemini key
    if (body.geminiApiKey && typeof body.geminiApiKey === "string" && body.geminiApiKey.trim()) {
      settings.geminiApiKey = body.geminiApiKey.trim();
      process.env.GEMINI_API_KEY = settings.geminiApiKey;
    }

    // Anthropic key
    if (body.anthropicApiKey && typeof body.anthropicApiKey === "string" && body.anthropicApiKey.trim()) {
      settings.anthropicApiKey = body.anthropicApiKey.trim();
      process.env.ANTHROPIC_API_KEY = settings.anthropicApiKey;
    }

    // AI provider toggle
    if (body.aiProvider && ["gemini", "claude"].includes(body.aiProvider)) {
      settings.aiProvider = body.aiProvider;
    }

    // Image key + provider
    if (body.imageApiKey && typeof body.imageApiKey === "string" && body.imageApiKey.trim()) {
      settings.imageApiKey = body.imageApiKey.trim();
    }
    if (body.imageProvider && ["vidtory", "kie"].includes(body.imageProvider)) {
      settings.imageProvider = body.imageProvider;
    }

    // Video key + provider
    if (body.videoApiKey && typeof body.videoApiKey === "string" && body.videoApiKey.trim()) {
      settings.videoApiKey = body.videoApiKey.trim();
    }
    if (body.videoProvider && ["vidtory", "kie"].includes(body.videoProvider)) {
      settings.videoProvider = body.videoProvider;
    }

    writeSettings(settings);

    const envVidtory = process.env.VIDTORY_API_KEY;

    return NextResponse.json({
      ok: true,
      geminiApiKey: maskKey(settings.geminiApiKey || process.env.GEMINI_API_KEY),
      isUsingCustomGeminiKey: !!settings.geminiApiKey,
      anthropicApiKey: maskKey(settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY),
      isUsingCustomAnthropicKey: !!settings.anthropicApiKey,
      aiProvider: settings.aiProvider || "gemini",
      imageApiKey: maskKey(settings.imageApiKey || envVidtory),
      imageProvider: settings.imageProvider || "vidtory",
      isUsingCustomImageKey: !!settings.imageApiKey,
      videoApiKey: maskKey(settings.videoApiKey || envVidtory),
      videoProvider: settings.videoProvider || "vidtory",
      isUsingCustomVideoKey: !!settings.videoApiKey,
    });
  } catch (err) {
    console.error("Settings save error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({ key: "all" }));
    const settings = readSettings();
    const target = body.key || "all";

    if (target === "gemini" || target === "all") {
      delete settings.geminiApiKey;
      const envKey = readEnvKey("GEMINI_API_KEY");
      if (envKey) process.env.GEMINI_API_KEY = envKey;
    }
    if (target === "anthropic" || target === "all") {
      delete settings.anthropicApiKey;
      delete settings.aiProvider;
      const envKey = readEnvKey("ANTHROPIC_API_KEY");
      if (envKey) process.env.ANTHROPIC_API_KEY = envKey;
    }
    if (target === "image" || target === "all") {
      delete settings.imageApiKey;
      delete settings.imageProvider;
    }
    if (target === "video" || target === "all") {
      delete settings.videoApiKey;
      delete settings.videoProvider;
    }

    writeSettings(settings);

    const envVidtory = process.env.VIDTORY_API_KEY;

    return NextResponse.json({
      ok: true,
      geminiApiKey: maskKey(process.env.GEMINI_API_KEY),
      isUsingCustomGeminiKey: !!settings.geminiApiKey,
      anthropicApiKey: maskKey(settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY),
      isUsingCustomAnthropicKey: !!settings.anthropicApiKey,
      aiProvider: settings.aiProvider || "gemini",
      imageApiKey: maskKey(settings.imageApiKey || envVidtory),
      imageProvider: settings.imageProvider || "vidtory",
      isUsingCustomImageKey: !!settings.imageApiKey,
      videoApiKey: maskKey(settings.videoApiKey || envVidtory),
      videoProvider: settings.videoProvider || "vidtory",
      isUsingCustomVideoKey: !!settings.videoApiKey,
    });
  } catch (err) {
    console.error("Settings reset error:", err);
    return NextResponse.json({ error: "Failed to reset settings" }, { status: 500 });
  }
}
