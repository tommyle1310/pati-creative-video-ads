// ── Blueprint Helper ─────────────────────────────────────────
// Fetches active prompt blueprints from DB with graceful fallback.
// If DB is unavailable or no blueprints exist, returns undefined (caller uses hardcoded default).

import { getPrisma } from "@/lib/db/prisma";
import { DEFAULT_PROMPTS, type PromptType, PROMPT_TYPES } from "./default-prompts";

/**
 * Get the active prompt content for a given type.
 * Returns undefined if DB unavailable or no active blueprint → caller uses hardcoded fallback.
 */
export async function getActivePrompt(type: PromptType): Promise<string | undefined> {
  try {
    const prisma = getPrisma();
    if (!prisma) return undefined;

    const bp = await prisma.promptBlueprint.findFirst({
      where: { type, isActive: true },
      select: { content: true },
    });

    return bp?.content ?? undefined;
  } catch (err) {
    console.warn(`[Blueprints] Failed to fetch active ${type} blueprint:`, err);
    return undefined;
  }
}

/**
 * Seed default blueprints if none exist.
 * Called lazily on first GET /api/studio/blueprints.
 */
export async function seedDefaultsIfNeeded(): Promise<boolean> {
  try {
    const prisma = getPrisma();
    if (!prisma) return false;

    // Clean up duplicate defaults (keep only one isDefault per type)
    for (const type of PROMPT_TYPES) {
      const defaults = await prisma.promptBlueprint.findMany({
        where: { type, isDefault: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (defaults.length > 1) {
        // Keep the first, delete the rest (individual deletes — Neon HTTP adapter doesn't support batch)
        for (const dup of defaults.slice(1)) {
          await prisma.promptBlueprint.delete({ where: { id: dup.id } });
        }
        console.log(`[Blueprints] Cleaned ${defaults.length - 1} duplicate defaults for ${type}`);
      }
    }

    // Find which types are missing a default blueprint
    const existing = await prisma.promptBlueprint.groupBy({
      by: ["type"],
    });
    const existingTypes = new Set(existing.map((e) => e.type));
    const missingTypes = PROMPT_TYPES.filter((t) => !existingTypes.has(t));

    if (missingTypes.length === 0) return false;

    // Seed missing default prompts (individual creates — createMany has issues with Neon HTTP adapter)
    for (const type of missingTypes) {
      await prisma.promptBlueprint.create({
        data: {
          title: DEFAULT_PROMPTS[type].title,
          description: DEFAULT_PROMPTS[type].description,
          content: DEFAULT_PROMPTS[type].content,
          type,
          variant: "default",
          version: 1,
          isDefault: true,
          isActive: true,
        },
      });
    }

    console.log("[Blueprints] Seeded", missingTypes.length, "default blueprints:", missingTypes.join(", "));
    return true;
  } catch (err) {
    console.warn("[Blueprints] Failed to seed defaults:", err);
    return false;
  }
}

/**
 * Get the prompt framework content (shared between storyboard + enhance).
 * Resolves {{PROMPT_FRAMEWORK}} placeholders in blueprint content.
 */
export async function resolvePromptFramework(content: string): Promise<string> {
  if (!content.includes("{{PROMPT_FRAMEWORK}}")) return content;

  const framework = await getActivePrompt("prompt_framework");
  const frameworkContent = framework ?? DEFAULT_PROMPTS.prompt_framework.content;

  return content.replace(/\{\{PROMPT_FRAMEWORK\}\}/g, frameworkContent);
}
