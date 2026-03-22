/**
 * GET /api/settings — returns current settings (masked key)
 * POST /api/settings — update settings { geminiApiKey }
 * DELETE /api/settings — reset to defaults (use .env key)
 *
 * The custom key is stored in a simple JSON file at .tmp/settings.json
 * so it persists across server restarts but stays out of .env.
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), ".tmp", "settings.json");

interface Settings {
  geminiApiKey?: string;
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

export async function GET() {
  const settings = readSettings();
  const envKey = process.env.GEMINI_API_KEY;
  const customKey = settings.geminiApiKey;
  const isUsingCustom = !!customKey;

  return NextResponse.json({
    geminiApiKey: maskKey(isUsingCustom ? customKey : envKey),
    isUsingCustomKey: isUsingCustom,
    hasEnvKey: !!envKey,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geminiApiKey } = body;

    if (!geminiApiKey || typeof geminiApiKey !== "string" || !geminiApiKey.trim()) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const settings = readSettings();
    settings.geminiApiKey = geminiApiKey.trim();
    writeSettings(settings);

    // Update the runtime env so it takes effect immediately
    process.env.GEMINI_API_KEY = geminiApiKey.trim();

    return NextResponse.json({
      ok: true,
      geminiApiKey: maskKey(geminiApiKey.trim()),
      isUsingCustomKey: true,
    });
  } catch (err) {
    console.error("Settings save error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const settings = readSettings();
    delete settings.geminiApiKey;
    writeSettings(settings);

    // Restore the original .env key
    // Re-read from .env isn't possible at runtime, but the original is still in process.env
    // unless it was overwritten. We need to clear our override.
    // The cleanest approach: delete the override, restart picks up .env again.
    // For immediate effect, we can't easily restore the original .env value at runtime.
    // Instead, we'll re-read it from the .env file directly.
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
      if (match) {
        process.env.GEMINI_API_KEY = match[1].trim().replace(/^["']|["']$/g, "");
      }
    }

    return NextResponse.json({
      ok: true,
      geminiApiKey: maskKey(process.env.GEMINI_API_KEY),
      isUsingCustomKey: false,
    });
  } catch (err) {
    console.error("Settings reset error:", err);
    return NextResponse.json({ error: "Failed to reset settings" }, { status: 500 });
  }
}
