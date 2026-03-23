// ── AI Provider Router ──────────────────────────────────────
// Reads the active AI provider from settings and provides a helper.

import fs from "fs";
import path from "path";

export type AiProvider = "gemini" | "claude";

const SETTINGS_PATH = path.join(process.cwd(), ".tmp", "settings.json");

export function getAiProvider(): AiProvider {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
      if (settings.aiProvider === "claude") return "claude";
    }
  } catch {}
  return "gemini";
}
