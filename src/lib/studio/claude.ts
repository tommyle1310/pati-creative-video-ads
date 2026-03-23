// ── Claude Service (server-side only) ────────────────────────
// Handles all Anthropic Claude API calls as an alternative to Gemini.
// Mirrors the function signatures from gemini.ts (except TTS).

import type { VideoAnalysis, StoryboardScene, RollType } from "./types";
import { createDefaultScene } from "./types";
import type { PromptOverrides, ScriptScene, CreativeStrategy } from "./gemini";
import fs from "fs";
import path from "path";

// ── API Key ─────────────────────────────────────────────────

function getApiKey(): string {
  let key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    try {
      const settingsPath = path.join(process.cwd(), ".tmp", "settings.json");
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
        if (settings.anthropicApiKey) {
          key = settings.anthropicApiKey;
          process.env.ANTHROPIC_API_KEY = key;
        }
      }
    } catch {}
  }
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return key;
}

// ── Types ───────────────────────────────────────────────────

interface ContentBlock {
  type: "text" | "image";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
}

interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// ── System Instructions (reused from gemini.ts, adapted for Claude) ──

// Import the same instructions by re-declaring them here to keep the file self-contained.
// Claude doesn't have responseSchema, so we append JSON format instructions.

const VIDEO_ANALYSIS_INSTRUCTION = `You are an expert video ad deconstructor. Your mission is to analyze a sequence of keyframes from a video ad and output an extremely detailed structured breakdown in JSON format.

## SCENE CUTTING RULES
- A new scene starts whenever the PRIMARY VISUAL changes: different camera angle, different subject/object, different background, text overlay appears/changes, transition effect, or visual style shift (e.g., real footage → anatomy diagram)
- Video ads change scenes RAPIDLY — most scenes are 1-4 seconds. A 30-second ad typically has 8-15 scenes. A 50-second ad typically has 12-25 scenes.
- Do NOT merge visually distinct moments into one long scene. If the visual changes, it's a new scene.
- Each scene time should be precise (e.g., "2.5s - 4.0s" not "0s - 6.57s")

## SCENE TYPE CLASSIFICATION
Label each scene with its marketing purpose AND its visual roll type:
- Marketing purpose: hook, problem, product, benefit, proof, social-proof, mechanism, offer, CTA, transition, text-overlay
- Visual roll type (append in parentheses):
  - (A-Roll) = talking head, person speaking to camera, lip-sync
  - (B-Roll) = product interaction, person holding/using product silently
  - (C-Roll) = concept visual, anatomy diagram, science animation, infographic, abstract

## SPEECH/TEXT EXTRACTION
- Extract the COMPLETE voiceover script for each scene — every word spoken or shown as text overlay
- Include text overlays verbatim in CAPS (e.g., "WHAT ACTUALLY CHANGES IN 30 DAYS")
- If there's both voiceover AND text overlay, include both: "VO: [speech] | TEXT: [overlay]"
- Do NOT summarize or paraphrase — write the EXACT words

## SUBTITLE vs OVERLAY DETECTION
- If text overlays closely match (~90%+) the spoken voiceover, mark them as SUBTITLES: "VO: [speech] | SUBTITLES: yes"
- Only include TEXT: entries for DISTINCT text overlays that are NOT subtitles

## VISUAL DESCRIPTION
- Describe each scene in RICH detail: subject appearance, clothing, pose, camera angle, lighting, background, product visibility, color palette, motion/animation type

## AD ANALYSIS (adAnalysis object)
- hook: Named hook TYPE + "Why it stops the scroll" paragraph
- concept: The big idea / angle of the ad
- scriptBreakdown: Named framework + numbered beats with timecodes
- visual: Overall visual strategy analysis
- psychology: Consumer psychology mechanisms at play
- cta: CTA analysis — delivery, urgency, scarcity
- keyTakeaways: At least 2 STEAL, 2 KAIZEN, and 1 UPGRADE idea
- productionFormula: FORMAT line + phases with screen direction, voiceover, text supers
- hookType: Short classification (e.g. "Curiosity Gap", "Pattern Interrupt")
- primaryAngle: Short primary messaging angle
- frameworkName: Short script framework name
- creativePattern: EXACTLY one of: "Problem-First UGC" | "Result-First Scroll Stop" | "Curiosity Gap" | "Social Proof Cascade" | "Comparison/Versus" | "Authority Demo" | "Unclassifiable"`;

const CLONED_SCRIPT_INSTRUCTION = `You are an expert scriptwriter for high-converting short-form video ads.
Create a NEW multi-scene script for a NEW product that CLONES the structure and pacing of the original ad.

CRITICAL RULES:
- You MUST output EXACTLY the same number of scenes as the original ad's sceneBreakdown.
- Each scene in your output corresponds 1:1 to a scene in the original analysis.
- **MATCH THE ORIGINAL'S WORD COUNT PER SCENE.** This is the most important rule:
  - If the original scene has 0 words (silent B-Roll/C-Roll), your scene MUST also have 0 words — set dialogue to "" (empty string).
  - If the original scene has 3-5 words (short hook), yours should have 3-8 words max.
  - NEVER inflate a short scene into a long one. Stay within ±30%.
- Follow the same sequence of scene types
- Match the original's pacing and rhythm
- Write for the NEW product, NEW audience, NEW big idea
- Silent scenes (B-Roll, C-Roll) STAY SILENT

## META ADS AI STACK — CREATIVE STRATEGY CONTEXT
Meta's Andromeda retrieval system uses creative embeddings to determine who sees ads.

### MOTIVATOR FRAMEWORK (10 types)
- Pain Point: Open with frustration/problem
- Pleasure/Aspiration: Open with desired outcome
- Social Proof: Open with validation
- Curiosity: Open with information gap
- Fear/Urgency: Open with scarcity
- Identity: Open with persona
- Feature-Led: Open with attribute
- Problem/Solution: Classic before/after
- Authority/Expert: Open with credibility
- Comparison: Position against alternatives

### EMOTIONAL TONE
Must be consistent across ALL scenes.

### STORYLINE TYPE
The overall narrative arc.`;

const CLONED_STORYBOARD_INSTRUCTION = `You are an expert video director specializing in recreating successful ad structures with photorealistic quality.

For each scene:
1. Look at the original scene's type, time, and visual description
2. Classify the scene as a ROLL TYPE: "aroll" (talking head/lip-sync), "broll" (product interaction, silent), or "croll" (concept/science visual)
3. Recreate the same layout, camera angle, and visual elements
4. Replace the original product/subject with the new product
5. Generate detailed image and video prompts
6. Ensure motion/action fits within the original scene's time duration

## CRITICAL OUTPUT RULES
- rollType: MUST be one of "aroll", "broll", "croll"
- For A-Roll: voiceover is SACRED — never modify the script dialogue
- For B-Roll: character is SILENT. No speech, no mouth movement
- For C-Roll: camera is LOCKED. Describe anatomical/conceptual movement only
- imagePrompt: Detailed paragraph describing the still image
- videoPrompt: Detailed paragraph describing motion (HARD LIMIT 2500 chars). Always end with "No Music Background"`;

const ENHANCE_PROMPT_INSTRUCTION = `You are an expert creative director and prompt engineer specializing in photorealistic UGC-style ad content.

Take the existing scene description and enhance it into a professional-grade prompt.

For Image Prompt enhancement:
- Add micro-expression detail, skin imperfections, practical lighting, specific background objects, camera specs, negative prompt section
- Include universal negatives (no tattoos, no AI-smooth skin, no watermarks)

For Video Prompt enhancement:
- HARD LIMIT: 2,500 characters total
- Triple-lock expressions (3 synonymous constraints)
- End with anti-AI cue ("Shot on Sony A7IV, 85mm lens")

Return ONLY the enhanced prompt text, nothing else.`;

// ── Retry helper ────────────────────────────────────────────

const MAX_RETRIES = 3;
const MODEL = "claude-sonnet-4-20250514";

function is429(status: number): boolean {
  return status === 429 || status === 529;
}

function parseRetryAfter(headers: Headers): number {
  const retryAfter = headers.get("retry-after");
  if (retryAfter) return Math.ceil(parseFloat(retryAfter)) * 1000;
  return 20_000;
}

async function callClaude(
  system: string,
  messages: Message[],
  maxTokens: number
): Promise<string> {
  const apiKey = getApiKey();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    if (is429(res.status) && attempt < MAX_RETRIES) {
      const delay = parseRetryAfter(res.headers);
      console.warn(`[Claude] 429, attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = (errData as { error?: { message?: string } }).error?.message || `Claude API error ${res.status}`;
      throw new Error(errMsg);
    }

    const data = await res.json();
    return (data as { content: Array<{ text: string }> }).content[0].text;
  }

  throw new Error("Claude rate-limited. Please wait a moment and try again.");
}

// ── Helpers ─────────────────────────────────────────────────

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

function extractJson(text: string): string {
  // Try to find JSON in code fences first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // Otherwise strip any preamble/trailing text around the JSON
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return text.slice(jsonStart, jsonEnd + 1);
  }
  return text.trim();
}

function imageBlock(base64: string, mediaType = "image/jpeg"): ContentBlock {
  const data = base64.includes(",") ? base64.split(",")[1] : base64;
  return { type: "image", source: { type: "base64", media_type: mediaType, data } };
}

// ── API Functions ───────────────────────────────────────────

export async function analyzeVideoFrames(
  frames: string[],
  fps: number,
  duration: number,
  audioBase64?: string,
  overrides?: PromptOverrides,
  transcript?: string
): Promise<VideoAnalysis> {
  // Claude supports up to 20 images per message — sample down from up to 60
  const maxFrames = 20;
  const sampled =
    frames.length <= maxFrames
      ? frames
      : Array.from({ length: maxFrames }, (_, i) =>
          frames[Math.floor((i / maxFrames) * frames.length)]
        );

  const frameTimestamps = sampled.map((_, i) => {
    const frameIdx = frames.length <= maxFrames ? i : Math.floor((i / maxFrames) * frames.length);
    return (frameIdx / Math.max(fps, 0.5)).toFixed(1);
  });

  const hasTranscript = !!transcript && transcript !== "No speech detected.";

  const systemPrompt = `${overrides?.systemInstruction || VIDEO_ANALYSIS_INSTRUCTION}

CRITICAL OUTPUT REQUIREMENT:
You MUST respond with ONLY valid JSON. No markdown code fences. No preamble. No trailing text.
The JSON must be an object with these keys:
- "musicAndPacing": string (BPM estimate, energy level, genre)
- "sceneBreakdown": array of objects, each with: "scene_id" (integer), "type" (string), "time" (string), "visual" (string), "speech" (string)
- "adAnalysis": object with keys: "hook", "concept", "scriptBreakdown", "visual", "psychology", "cta", "keyTakeaways", "productionFormula", "hookType", "primaryAngle", "frameworkName", "creativePattern"`;

  const audioSection = hasTranscript
    ? `\nAUDIO TRANSCRIPT (from the video's voiceover/dialogue):\n"""\n${transcript}\n"""\nUse this transcript to assign the EXACT spoken words to each scene based on timing. Match speech segments to their corresponding visual scenes.`
    : `\nNo audio transcript available — extract speech from visible text overlays only.`;

  const content: ContentBlock[] = [
    {
      type: "text",
      text: `Analyze these ${sampled.length} frames from a ${duration.toFixed(1)}-second video, captured at ${fps.toFixed(1)} FPS.
Frame timestamps: ${frameTimestamps.map((t, i) => `Frame ${i + 1} = ${t}s`).join(", ")}.
${audioSection}

IMPORTANT: This is a video AD — scenes change rapidly (every 1-4 seconds). Cut scenes at every visual change. The full video is ${duration.toFixed(1)} seconds — make sure you cover ALL of it from 0s to ${duration.toFixed(1)}s. A ${Math.round(duration)}-second ad should have ${Math.max(8, Math.round(duration / 3))}-${Math.round(duration / 1.5)}+ scenes.`,
    },
    ...sampled.map((frame) => imageBlock(frame)),
  ];

  const raw = await callClaude(systemPrompt, [{ role: "user", content }], 8192);
  return JSON.parse(extractJson(raw)) as VideoAnalysis;
}

export async function generateClonedScript(
  analysis: VideoAnalysis,
  bigIdea: string,
  productImage: string,
  productInfo?: string,
  targetAudience?: string,
  creatorImage?: string,
  strategy?: CreativeStrategy,
  overrides?: PromptOverrides
): Promise<ScriptScene[]> {
  const sceneList = analysis.sceneBreakdown
    .map(
      (sc) =>
        `  Scene ${sc.scene_id} [${sc.type}] (${sc.time}): Visual: "${sc.visual}" | Speech: "${sc.speech}"`
    )
    .join("\n");

  const strategyLines: string[] = [];
  if (strategy?.motivator) strategyLines.push(`**PRIMARY MOTIVATOR:** ${strategy.motivator}`);
  if (strategy?.emotionalTone) strategyLines.push(`**EMOTIONAL TONE:** ${strategy.emotionalTone}`);
  if (strategy?.storylineType) strategyLines.push(`**STORYLINE TYPE:** ${strategy.storylineType}`);
  const strategyBlock = strategyLines.length > 0
    ? `\n\n## CREATIVE STRATEGY\n${strategyLines.join("\n")}`
    : "";

  const sceneWordCounts = analysis.sceneBreakdown.map((sc) => {
    const speech = (sc.speech || "")
      .replace(/\b(VO|TEXT|SUBTITLES):\s*/gi, "")
      .replace(/\bNone\b/gi, "")
      .trim();
    return speech ? speech.split(/\s+/).length : 0;
  });
  const totalOriginalWords = sceneWordCounts.reduce((a, b) => a + b, 0);

  const wordCountGuide = analysis.sceneBreakdown
    .map((sc, i) => {
      const wc = sceneWordCounts[i];
      return `  Scene ${sc.scene_id}: ~${wc} words${wc === 0 ? " (SILENT — keep empty)" : ""}`;
    })
    .join("\n");

  const systemPrompt = `${overrides?.systemInstruction || CLONED_SCRIPT_INSTRUCTION}

CRITICAL OUTPUT REQUIREMENT:
You MUST respond with ONLY valid JSON. No markdown code fences. No preamble.
The JSON must be: { "scenes": [ { "sceneType": "string", "dialogue": "string", "direction": "string" }, ... ] }
Output EXACTLY ${analysis.sceneBreakdown.length} scenes.`;

  const promptText = `**Original Ad has ${analysis.sceneBreakdown.length} scenes. You MUST write exactly ${analysis.sceneBreakdown.length} scenes.**

**Original Scene Breakdown:**
${sceneList}

**Word Count Per Scene (MATCH CLOSELY):**
${wordCountGuide}
Total original voiceover: ~${totalOriginalWords} words. Your script should be within ±30% of this total.

**Music & Pacing:** ${analysis.musicAndPacing}

**NEW Product Big Idea:** ${bigIdea}
**NEW Product Info:** ${productInfo || "Not provided."}
**NEW Target Audience:** ${targetAudience || "Not provided."}${strategyBlock}

Write a complete ${analysis.sceneBreakdown.length}-scene script.`;

  const content: ContentBlock[] = [
    { type: "text", text: promptText },
    imageBlock(productImage),
  ];

  if (creatorImage) {
    content.push(imageBlock(creatorImage));
  }

  const raw = await callClaude(systemPrompt, [{ role: "user", content }], 4096);
  const result = JSON.parse(extractJson(raw));
  return result.scenes as ScriptScene[];
}

export async function generateClonedStoryboard(
  analysis: VideoAnalysis,
  script: string,
  productImage: string,
  productInfo?: string,
  targetAudience?: string,
  creatorImage?: string,
  strategy?: CreativeStrategy,
  overrides?: PromptOverrides
): Promise<StoryboardScene[]> {
  const strategyLines: string[] = [];
  if (strategy?.emotionalTone) strategyLines.push(`**EMOTIONAL TONE:** ${strategy.emotionalTone}`);
  if (strategy?.storylineType) strategyLines.push(`**STORYLINE TYPE:** ${strategy.storylineType}`);
  if (strategy?.motivator) strategyLines.push(`**MOTIVATOR:** ${strategy.motivator}`);
  const strategyBlock = strategyLines.length > 0
    ? `\n\n## VISUAL STRATEGY\n${strategyLines.join("\n")}`
    : "";

  const sceneCount = analysis.sceneBreakdown.length;
  const conciseSuffix = sceneCount > 10
    ? "\n\nIMPORTANT: This ad has many scenes. Keep each imagePrompt and videoPrompt to 300 words MAX."
    : "";

  const systemPrompt = `${overrides?.systemInstruction || CLONED_STORYBOARD_INSTRUCTION}

CRITICAL OUTPUT REQUIREMENT:
You MUST respond with ONLY valid JSON. No markdown code fences. No preamble.
The JSON must be: { "scenes": [ { "rollType": "aroll|broll|croll", "voiceoverScript": "string", "voiceoverGuide": "string", "imagePrompt": "string", "videoPrompt": "string" }, ... ] }
Output EXACTLY ${sceneCount} scenes. Write prompts as plain text paragraphs.`;

  const promptText = `**Original Ad Analysis:**\n${JSON.stringify(analysis, null, 2)}\n\n**New Script:**\n${script}\n\n**New Product Info:** ${productInfo || "Not provided."}\n**New Target Audience:** ${targetAudience || "Not provided."}${strategyBlock}${conciseSuffix}`;

  const content: ContentBlock[] = [
    { type: "text", text: promptText },
    imageBlock(productImage),
  ];

  if (creatorImage) {
    content.push(imageBlock(creatorImage));
  }

  const raw = await callClaude(systemPrompt, [{ role: "user", content }], 16384);

  let result: { scenes: Array<{
    rollType?: string;
    voiceoverScript: string;
    voiceoverGuide: string;
    imagePrompt: string | object;
    videoPrompt: string | object;
  }> };

  try {
    result = JSON.parse(extractJson(raw));
  } catch {
    // Attempt to repair truncated JSON
    result = JSON.parse(repairTruncatedScenesJson(extractJson(raw)));
  }

  return result.scenes.map(
    (s) => createDefaultScene({
      ...s,
      imagePrompt: typeof s.imagePrompt === "object" ? JSON.stringify(s.imagePrompt, null, 2) : s.imagePrompt,
      videoPrompt: typeof s.videoPrompt === "object" ? JSON.stringify(s.videoPrompt, null, 2) : s.videoPrompt,
      rollType: (["aroll", "broll", "croll"].includes(s.rollType || "") ? s.rollType : undefined) as RollType | undefined,
    })
  );
}

function repairTruncatedScenesJson(raw: string): string {
  const lastCloseBrace = raw.lastIndexOf("}");
  if (lastCloseBrace === -1) throw new Error("Cannot repair JSON: no closing brace found");

  for (let i = lastCloseBrace; i >= 0; i--) {
    if (raw[i] !== "}") continue;
    const candidate = raw.slice(0, i + 1) + "]}";
    try {
      const parsed = JSON.parse(candidate);
      if (parsed.scenes && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        console.warn(`[Claude] Repaired truncated storyboard JSON — recovered ${parsed.scenes.length} scenes`);
        return candidate;
      }
    } catch {
      continue;
    }
  }
  throw new Error("Cannot repair truncated JSON response from Claude. Try again with fewer scenes.");
}

export async function enhancePrompt(
  projectContext: string,
  scene: StoryboardScene,
  promptType: "image" | "video",
  productImage?: string,
  creatorImage?: string,
  overrides?: PromptOverrides
): Promise<string> {
  const systemPrompt = overrides?.systemInstruction || ENHANCE_PROMPT_INSTRUCTION;

  const textPrompt = `**Project-Level Context:**\n${projectContext}\n\n**Scene-Level Context:**\n- Voiceover Script: "${scene.voiceoverScript}"\n- Existing Image Prompt: "${scene.imagePrompt}"\n- Existing Video Prompt: "${scene.videoPrompt}"\n\n**Your Task:** Generate an enhanced **${promptType === "image" ? "Image Prompt" : "Video Motion Prompt"}** for this scene.\n\nReturn ONLY the enhanced prompt text, nothing else.`;

  const content: ContentBlock[] = [{ type: "text", text: textPrompt }];

  if (productImage) content.push(imageBlock(productImage));
  if (creatorImage) content.push(imageBlock(creatorImage));

  const raw = await callClaude(systemPrompt, [{ role: "user", content }], 4096);
  return stripCodeFences(raw);
}
