// ── Gemini Service (server-side only) ─────────────────────────
// Handles all Google Gemini API calls for the Studio pipeline.

import { GoogleGenAI, Modality, type Part } from "@google/genai";
import type { VideoAnalysis, StoryboardScene, RollType } from "./types";
import { createDefaultScene } from "./types";
import fs from "fs";
import path from "path";

function getClient() {
  let key = process.env.GEMINI_API_KEY;
  // On cold start, check if a custom key was saved in settings.json
  if (!key) {
    try {
      const settingsPath = path.join(process.cwd(), ".tmp", "settings.json");
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
        if (settings.geminiApiKey) {
          key = settings.geminiApiKey;
          process.env.GEMINI_API_KEY = key; // cache for subsequent calls
        }
      }
    } catch {}
  }
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey: key });
}

// ── System Instructions ──────────────────────────────────────

const VIDEO_ANALYSIS_INSTRUCTION = `You are an expert video ad deconstructor. Your mission is to analyze a sequence of keyframes from a video ad and output an extremely detailed structured breakdown in JSON format.

## SCENE CUTTING RULES
- A new scene starts whenever the PRIMARY VISUAL changes: different camera angle, different subject/object, different background, text overlay appears/changes, transition effect, or visual style shift (e.g., real footage → anatomy diagram)
- Video ads change scenes RAPIDLY — most scenes are 1-4 seconds. A 30-second ad typically has 8-15 scenes. A 50-second ad typically has 12-25 scenes.
- Do NOT merge visually distinct moments into one long scene. If the visual changes, it's a new scene.
- Between two distinct visuals, there is often a frame with text overlay / voiceover — this counts as its own scene or belongs to whichever visual it overlays.
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
- If text overlays closely match (~90%+) the spoken voiceover (i.e. they are subtitles/captions), mark them as SUBTITLES in the speech field: "VO: [speech] | SUBTITLES: yes"
- Do NOT include subtitle text separately — it's redundant with the voiceover and should NOT be used for image prompting later
- Only include TEXT: entries for DISTINCT text overlays (headlines, CTAs, product claims) that are NOT subtitles of the voiceover
- ~90% of ads use subtitles that mirror the voiceover — these are for accessibility, not visual design elements

## VISUAL DESCRIPTION
- Describe each scene in RICH detail: subject appearance, clothing, pose, camera angle, lighting, background, product visibility, color palette, motion/animation type
- For anatomy/science scenes: name specific anatomical structures visible, glow colors, animation behavior
- For product scenes: exact product appearance, how it's held, branding visible
- For talking head: expression, gesture, eye direction, setting

Output: JSON object with sceneBreakdown[] and musicAndPacing (include BPM estimate, energy level, genre).`;

const CLONED_SCRIPT_INSTRUCTION = `You are an expert scriptwriter for high-converting short-form video ads.
Create a NEW multi-scene script for a NEW product that strictly follows the structure of the original ad.

CRITICAL RULES:
- You MUST output EXACTLY the same number of scenes as the original ad's sceneBreakdown.
- Each scene in your output corresponds 1:1 to a scene in the original analysis.
- Each scene MUST have 2-4 sentences of spoken dialogue/voiceover (15-30 words minimum per scene).
- Follow the same sequence of scene types (problem → product → benefit → CTA etc.)
- Match the original's pacing and rhythm described in musicAndPacing.
- Write for the NEW product, NEW audience, NEW big idea — not the original.
- Make the script sound natural, conversational, and authentic (like a real person talking on camera).

## META ADS AI STACK — CREATIVE STRATEGY CONTEXT
Meta's Andromeda retrieval system uses creative embeddings to determine who sees ads. Creative diversity is
the primary mechanism for reaching different audiences ("Creative is the new targeting"). The MOTIVATOR,
EMOTIONAL TONE, and STORYLINE TYPE selected below should deeply influence the hook, language, and
narrative structure of the script — not just be surface-level tweaks.

### MOTIVATOR FRAMEWORK (10 types)
Each motivator targets a different psychological driver. The script's HOOK (first scene) must clearly embody
the selected motivator:
- Pain Point: Open with frustration/problem. Hook pattern: "Tired of [X]?" / "Stop wasting [Y] on [Z]"
- Pleasure/Aspiration: Open with desired outcome. Hook: "Imagine waking up to [outcome]" / "Finally feel [emotion]"
- Social Proof: Open with validation. Hook: "[Number] people can't be wrong" / "Why everyone's switching"
- Curiosity: Open with information gap. Hook: "The secret [industry] doesn't want you to know"
- Fear/Urgency: Open with scarcity. Hook: "Last chance to [benefit]" / "[Time] left"
- Identity: Open with persona. Hook: "For [persona] who [behavior]" / "Not for everyone"
- Feature-Led: Open with attribute. Hook: "Made for [need]" / "The only [product] with [feature]"
- Problem/Solution: Classic before/after. Hook: "Tired of X? Here's how to fix it"
- Authority/Expert: Open with credibility. Hook: "Doctor-recommended" / "Expert-approved"
- Comparison: Position against alternatives. Hook: "Why this beats your current solution"

### EMOTIONAL TONE
The tone must be consistent across ALL scenes (not just the hook):
- Inspirational: Aspiration, transformation, possibility
- Relatable/Problem-first: Acknowledge pain, empathize, then solve
- Urgent/Limited-time: Scarcity, FOMO, time pressure
- Calm/Reassuring: Trust, premium quality, safety
- Humorous/Satirical: Pattern interrupt, exaggeration, wit
- Educational: Inform, explain, build consideration
- Emotional/Heartfelt: Meaningful, touching, gift-worthy

### STORYLINE TYPE
The overall narrative arc should follow the selected storyline:
- Founder Origin Story: Why the product was created, personal mission
- Day-in-the-Life: Product woven into authentic daily routine
- Problem/Solution: Before state → struggle → discovery → after state
- Things You Didn't Know: Surprising facts, education-first
- Behind the Scenes: How it's made, transparency, craft
- Testimonial/Review: Customer perspective, real experience
- Unboxing/First Impression: Discovery, delight, first use

OUTPUT FORMAT:
Return a JSON object with a "scenes" array. Each element has:
- "sceneType": the marketing purpose (matching the original scene type)
- "dialogue": the full voiceover/spoken text for that scene (2-4 sentences, detailed)
- "direction": brief visual/tone note for the scene`;

const PROMPT_FRAMEWORK = `
## ROLL TYPE TAXONOMY
Every scene MUST be classified as one of three roll types:

| Roll | Purpose | Camera | Product | Talent Speech |
|------|---------|--------|---------|---------------|
| C-Roll | Concept / Science Visual | Locked, no movement | None or minimal | None |
| B-Roll | Character + Product Interaction | Handheld or locked | Hero element | None (silent) |
| A-Roll | Talking Head / Hero Shot | Handheld UGC feel | Visible, branded | Lip-sync voiceover |

## SHARED PRINCIPLES (ALL ROLL TYPES)

### Skin Realism Hierarchy
- A-Roll: Pores, acne, blemishes, stretch marks, ashiness, razor bumps
- B-Roll: Pores, oil sheen, hyperpigmentation, knuckle texture
- C-Roll: Ghost-skin only (10-15% opacity over anatomy)

### Expression Control
- Always specify what the face IS doing AND what it is NOT doing
- Video: triple-lock expressions ("neutral, stone-faced, no mouth movement")
- Never leave expression unspecified — models default to slight smile

### Product Accuracy Checklist
- Exact color (pale sage green, not bright green)
- Exact size (1.5cm diameter gummy, 5x7cm sachet)
- Exact material finish (soft matte, slightly translucent)
- Exact branding text (readable on product)
- Grip method (which fingers, which hand)

### Anti-AI Rendering Cues (append to VIDEO prompts)
- "Shot on Sony A7IV, 85mm lens, natural color grading" (for B-Roll/C-Roll)
- "Shot on iPhone 15 Pro, portrait mode, f/1.8" (for A-Roll UGC)
- "1600 ISO grain. No color grade. Unfiltered." (for A-Roll night scenes)

### Universal Negative Constraints (include in image prompts)
- No tattoos, no jewelry (unless specified), no logos (unless branded product)
- No perfect symmetry, no cartoonish rendering
- No watermarks, no text overlays, no HUD elements
- No AI-smooth skin (specify per roll type)

## IMAGE PROMPT RULES
All image prompts must be DETAILED paragraphs (not JSON). Include:
- **A-Roll**: Open with "Hyperrealistic photography". Specify: subject demographics, face micro-expression (muscle-level), 3+ skin imperfections by name/location, practical lighting only (from objects IN scene), specific background with 3-5 named objects, product branding readable, camera lens + aperture + grain, negative prompt section
- **B-Roll**: Focus on product interaction. Specify: exact hand positions (which fingers grip/curl), product dimensions + size comparison, 5+ skin realism markers, expression = anti-selling (unbothered/casual), hair with anti-pattern ("NOT salon locs, real freeform dreads"), camera as phone (iPhone 15 Pro)
- **C-Roll**: Anatomy IS the image. Specify: named anatomical structures with fiber directions, color per layer (bone/muscle/cartilage distinct), ghost-skin 10-15% opacity, glow intensity varies by structure, dark background, self-illumination

## VIDEO PROMPT RULES
**HARD LIMIT: 2,500 characters.** Video models truncate beyond this.

**CRITICAL AUDIO RULE: Every video prompt MUST include "No Music Background. No ambient sounds. No sound effects. Complete silence except voiceover." This is mandatory for ALL roll types.**

Compression strategy:
1. Skip face structure details — reference image carries them
2. Merge anatomy/detail into single dense sentences
3. Prioritize ACTION and MOVEMENT over static description
4. Lock expression with triple-reinforcement (3 synonymous constraints)
5. End with anti-AI rendering cue (camera model + lens)
6. Always end with "No Music Background" constraint

### A-Roll Video Structure:
- format, voice, setting (2-3 sentences), subject ("Same person as reference" + outfit confirmations), action (frame-by-frame choreography, ONE punctuating gesture), expression (sustained state, NOT arc), camera (handheld, micro-wobble), lip_sync (jaw behavior separate from expression), voiceover (EXACT script, NEVER modified), technical (ISO, no color grade)

### B-Roll Video Structure:
- subject_description (1 sentence), action (2-3 sentences temporal order), physical_micro_detail (frame traits as PHYSICAL not emotional), expression_lock (triple reinforcement), secondary_motion (what else moves), lighting_setting, camera_feel, negative_behaviors (4-5 things NOT done), skin_realism, anti_ai_cue ("Shot on Sony A7IV, 85mm lens")

### C-Roll Video Structure:
- Camera ALWAYS locked. ONE action only. Movement is anatomical (muscles VISIBLY FLEX). Expression triple-lock. State what stays constant THROUGHOUT.
`;

const CLONED_STORYBOARD_INSTRUCTION = `You are an expert video director specializing in recreating successful ad structures with photorealistic quality.

For each scene:
1. Look at the original scene's type, time, and visual description
2. Classify the scene as a ROLL TYPE: "aroll" (talking head/lip-sync), "broll" (product interaction, silent), or "croll" (concept/science visual)
3. Recreate the same layout, camera angle, and visual elements
4. Replace the original product/subject with the new product
5. Replace the character with the new character image (or invent one fitting the audience)
6. Generate image and video prompts following the PROMPT FRAMEWORK rules for that roll type
7. Ensure motion/action fits within the original scene's time duration

${PROMPT_FRAMEWORK}

## META ADS AI STACK — VISUAL STRATEGY
Andromeda's Entity ID system groups visually similar ads together. To create TRULY DIVERSE creatives
(different embedding = different audience reach), the visual approach must reflect the selected creative strategy:

- The EMOTIONAL TONE should drive lighting, color palette, and pacing:
  Inspirational = bright, warm | Relatable = natural, casual | Urgent = high contrast, fast cuts
  Calm = soft, muted | Humorous = vibrant, exaggerated | Educational = clean, infographic-style
  Emotional = warm tones, close-ups

- The STORYLINE TYPE should drive camera work and setting:
  Founder Story = office/workshop setting | Day-in-the-Life = multiple real locations
  Problem/Solution = split-screen or before/after contrast | Behind the Scenes = factory/lab setting
  Testimonial = selfie/webcam framing | Unboxing = overhead/tabletop shot

- Image prompts must include scene-appropriate lighting, composition, and mood that MATCHES the tone
- Video prompts must describe motion that reinforces the emotional beat (e.g. urgent = fast movement)

## CRITICAL OUTPUT RULES

### imagePrompt — MUST be a valid JSON object string following the roll-type schema:

**A-Roll image JSON keys:** opening_tag, subject (demographic, face {structure, eyes, skin_imperfections, expression}, hair, outfit {top, accessories}), pose (body_position, leg_position, energy, anti_pattern), hands_and_product (overall_action, dominant_hand {action, product_state}, support_hand {action}, motion_descriptor), product_detail (primary_product {name, color_material, branding_text, orientation}), background (setting, key_elements, background_blur), lighting (primary_source, secondary_source, shadow_description, skin_light_interaction), camera (lens, angle, aspect_ratio, grain), negative_prompt (array of 8+ exclusions)

**B-Roll image JSON keys:** concept (summary, format), subject (ethnicity, age_range, gender, face_details {unique_features, facial_hair, expression, eye_direction, head_angle}, hair {style, texture, color, length, anti_pattern}, skin {tone, texture_requirements[], anti_smoothing}, physique {build_descriptor, key_visual_traits}), clothing (top, accessories), hands_and_product (left_hand {position, action, grip_detail}, right_hand {position, action, grip_detail}, hand_skin_detail), product (primary_item {name, size, material_finish, branding_visible, condition, orientation}), setting (location, focus_treatment, anti_pattern), lighting (source, color_temperature, quality, shadows, product_light, anti_pattern), camera (device, depth_of_field, grain_noise, color_grading, aspect_ratio, framing), what_to_avoid (15+ items)

**C-Roll image JSON keys:** concept (summary, visual_metaphor, hero_element), subject (ethnicity, age_range, build, hair, pose, expression), anatomy_layers (coverage_percentage, primary_layer {name, description, color_palette}, secondary_layer {name, description, color_palette}, ghost_skin_layer {opacity_range, visible_features}), glow_and_color (dominant_tone, bone_glow, muscle_glow, cartilage_tendon, soft_organ, outer_aura), lighting (background, self_illumination_percentage, internal_glow_description), camera (format, depth_of_field, focus_point, grain, color_treatment, framing), what_to_avoid (10+ items)

### videoPrompt — MUST be a valid JSON object string (HARD LIMIT 2500 chars when serialized):

**A-Roll video JSON keys:** format, voice, setting, subject, action, expression, camera, lip_sync, voiceover (EXACT script, SACRED), technical
**B-Roll video JSON keys:** subject_description, action, physical_micro_detail, expression_lock (triple), secondary_motion, lighting_setting, camera_feel, negative_behaviors, skin_realism, anti_ai_cue
**C-Roll video JSON keys:** camera_behavior (LOCKED), background, subject_anatomy, eye_treatment, action_sequence, movement_constraints, expression_lock (triple), technical

### rollType: MUST be one of "aroll", "broll", "croll"
- For A-Roll scenes: voiceover is SACRED — never modify the script dialogue
- For B-Roll scenes: character is SILENT. No speech, no mouth movement
- For C-Roll scenes: camera is LOCKED. Describe anatomical/conceptual movement only`;

const ENHANCE_PROMPT_INSTRUCTION = `You are an expert creative director and prompt engineer specializing in photorealistic UGC-style ad content.

${PROMPT_FRAMEWORK}

## YOUR TASK
Take the existing scene description and enhance it into a professional-grade prompt following the roll-type framework above.

**For Image Prompt enhancement:**
- Identify the roll type from the scene context (A-Roll if dialogue present, B-Roll if product interaction without speech, C-Roll if concept/science)
- A-Roll: Open with "Hyperrealistic photography". Add micro-expression detail, 3+ named skin imperfections, practical lighting, specific background objects, product branding text, camera specs (lens + aperture + grain), negative prompt section
- B-Roll: Add exact hand/finger positions, product dimensions, 5+ skin realism markers, anti-selling expression, anti-pattern descriptions, phone camera specs
- C-Roll: Add named anatomical structures, color per layer, ghost-skin opacity, glow characteristics, self-illumination
- Always include universal negatives (no tattoos, no AI-smooth skin, no watermarks, etc.)

**For Video Prompt enhancement:**
- HARD LIMIT: 2,500 characters total
- Compress: skip details the reference image carries, merge descriptions into dense sentences
- Triple-lock expressions (3 synonymous constraints)
- End with anti-AI cue ("Shot on Sony A7IV, 85mm lens, natural color grading" or "Shot on iPhone 15 Pro, portrait mode, f/1.8")
- A-Roll: Include lip_sync instructions separate from expression, ONE punctuating gesture
- B-Roll: Frame physical traits as physical not emotional, list 4-5 negative behaviors
- C-Roll: Camera locked, one action only, state what stays constant throughout

Return ONLY the enhanced prompt text, nothing else.`;

// ── Retry helper ─────────────────────────────────────────────

const MODELS_BY_PRIORITY = ["gemini-2.5-flash", "gemini-2.5-flash"] as const;
const MAX_RETRIES = 3;

function parseRetryDelay(errMsg: string): number {
  // Extract "retryDelay":"16s" or "Please retry in 16.37s"
  const match = errMsg.match(/retry(?:Delay)?["\s:]*in?\s*(\d+(?:\.\d+)?)\s*s/i);
  return match ? Math.ceil(parseFloat(match[1])) * 1000 : 20_000;
}

function is429(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callWithRetry(fn: (model: string) => Promise<any>): Promise<any> {
  for (const model of MODELS_BY_PRIORITY) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn(model);
      } catch (err) {
        if (is429(err) && attempt < MAX_RETRIES) {
          const delay = parseRetryDelay(err instanceof Error ? err.message : "");
          console.warn(`[Gemini] 429 on ${model}, attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        if (is429(err)) {
          console.warn(`[Gemini] ${model} exhausted, trying next model...`);
          break; // try next model
        }
        throw err;
      }
    }
  }
  throw new Error("All Gemini models rate-limited. Please wait a minute and try again.");
}

// ── API Functions ────────────────────────────────────────────

const ANALYSIS_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    musicAndPacing: { type: "STRING" as const },
    sceneBreakdown: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          scene_id: { type: "INTEGER" as const },
          type: { type: "STRING" as const, description: "Marketing purpose + roll type, e.g. 'product (C-Roll)' or 'benefit (A-Roll)'" },
          time: { type: "STRING" as const, description: "Precise timestamp range, e.g. '2.5s - 4.0s'" },
          visual: { type: "STRING" as const, description: "Rich visual description: subject, camera, lighting, colors, motion, anatomical structures if applicable" },
          speech: { type: "STRING" as const, description: "EXACT voiceover text and/or text overlays. Use 'VO: [speech] | TEXT: [overlay]' format" },
        },
        required: ["scene_id", "type", "time", "visual", "speech"] as const,
      },
    },
  },
  required: ["musicAndPacing", "sceneBreakdown"] as const,
};

/**
 * Analyze a video directly using Gemini File API — no frame extraction needed.
 * Uploads the video bytes to Gemini, waits for processing, then analyzes.
 * This avoids Vercel's 4.5MB payload limit entirely.
 */
export async function analyzeVideoFromBytes(
  videoBuffer: Buffer,
  mimeType: string = "video/mp4"
): Promise<VideoAnalysis> {
  const ai = getClient();

  // Upload video to Gemini File API
  const uploadedFile = await ai.files.upload({
    file: new Blob([new Uint8Array(videoBuffer)], { type: mimeType }),
    config: { mimeType },
  });

  if (!uploadedFile.name) throw new Error("File upload returned no name");

  // Wait for file to be processed (ACTIVE state)
  let file = await ai.files.get({ name: uploadedFile.name });
  const maxWait = 120_000; // 2 minutes
  const start = Date.now();
  while (file.state === "PROCESSING" && Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 3000));
    file = await ai.files.get({ name: uploadedFile.name });
  }
  if (file.state !== "ACTIVE") {
    throw new Error(`Video processing failed: state=${file.state}`);
  }

  const parts: Part[] = [
    {
      text: `Analyze this video ad in full detail.

IMPORTANT: This is a video AD — scenes change rapidly (every 1-4 seconds). Cut scenes at every visual change. Make sure you cover the ENTIRE video from start to finish. Extract the COMPLETE voiceover/text for each scene. Transcribe audio precisely.`,
    },
    {
      fileData: { fileUri: file.uri!, mimeType: file.mimeType! },
    },
  ];

  const result = await callWithRetry(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: VIDEO_ANALYSIS_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    });
    return JSON.parse(response.text!.trim()) as VideoAnalysis;
  });

  // Clean up uploaded file
  try { await ai.files.delete({ name: uploadedFile.name }); } catch {}

  return result;
}

export async function analyzeVideoFrames(
  frames: string[],
  fps: number,
  duration: number,
  audioBase64?: string
): Promise<VideoAnalysis> {
  const ai = getClient();

  // Send all frames (up to 60) for full video coverage
  const maxFrames = 60;
  const sampled =
    frames.length <= maxFrames
      ? frames
      : Array.from({ length: maxFrames }, (_, i) =>
          frames[Math.floor((i / maxFrames) * frames.length)]
        );

  // Calculate the timestamp of each sampled frame for Gemini
  const frameTimestamps = sampled.map((_, i) => {
    const frameIdx = frames.length <= maxFrames ? i : Math.floor((i / maxFrames) * frames.length);
    return (frameIdx / Math.max(fps, 0.5)).toFixed(1);
  });

  const hasAudio = !!audioBase64;

  const parts: Part[] = [
    {
      text: `Analyze these ${sampled.length} frames from a ${duration.toFixed(1)}-second video, captured at ${fps.toFixed(1)} FPS.
Frame timestamps: ${frameTimestamps.map((t, i) => `Frame ${i + 1} = ${t}s`).join(", ")}.
${hasAudio ? "\nAUDIO TRACK INCLUDED: The audio from the original video is attached below. Use it to extract the EXACT spoken words (voiceover/dialogue) for each scene. Transcribe the audio precisely — do NOT guess from visual text overlays alone. Match each spoken segment to its corresponding scene timestamp." : "\nNo audio track available — extract speech from visible text overlays only."}

IMPORTANT: This is a video AD — scenes change rapidly (every 1-4 seconds). Cut scenes at every visual change. The full video is ${duration.toFixed(1)} seconds — make sure you cover ALL of it from 0s to ${duration.toFixed(1)}s. A ${Math.round(duration)}-second ad should have ${Math.max(8, Math.round(duration / 3))}-${Math.round(duration / 1.5)}+ scenes. Extract the COMPLETE voiceover/text for each scene.`,
    },
  ];

  // Add audio track FIRST if available (Gemini processes audio for transcription)
  if (hasAudio) {
    parts.push({
      inlineData: { mimeType: "audio/mp3", data: audioBase64 },
    });
  }

  // Then add all visual frames
  for (const frame of sampled) {
    const base64 = frame.includes(",") ? frame.split(",")[1] : frame;
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
  }

  return callWithRetry(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: VIDEO_ANALYSIS_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    });
    return JSON.parse(response.text!.trim()) as VideoAnalysis;
  });
}

export interface ScriptScene {
  sceneType: string;
  dialogue: string;
  direction: string;
}

export interface CreativeStrategy {
  motivator?: string;
  emotionalTone?: string;
  storylineType?: string;
}

export async function generateClonedScript(
  analysis: VideoAnalysis,
  bigIdea: string,
  productImage: string,
  productInfo?: string,
  targetAudience?: string,
  creatorImage?: string,
  strategy?: CreativeStrategy
): Promise<ScriptScene[]> {
  const ai = getClient();

  // Build an explicit scene list so Gemini knows exactly how many scenes to write
  const sceneList = analysis.sceneBreakdown
    .map(
      (sc) =>
        `  Scene ${sc.scene_id} [${sc.type}] (${sc.time}): Visual: "${sc.visual}" | Speech: "${sc.speech}"`
    )
    .join("\n");

  // Build creative strategy block
  const strategyLines: string[] = [];
  if (strategy?.motivator) strategyLines.push(`**PRIMARY MOTIVATOR:** ${strategy.motivator} — The hook and overall persuasion angle MUST use this motivator. Refer to the Motivator Framework in the system instructions for hook patterns.`);
  if (strategy?.emotionalTone) strategyLines.push(`**EMOTIONAL TONE:** ${strategy.emotionalTone} — ALL scenes must maintain this tone consistently in language, energy, and word choice.`);
  if (strategy?.storylineType) strategyLines.push(`**STORYLINE TYPE:** ${strategy.storylineType} — The narrative arc should follow this storyline structure. Adapt the original scene flow to fit.`);
  const strategyBlock = strategyLines.length > 0
    ? `\n\n## CREATIVE STRATEGY (apply these across the entire script)\n${strategyLines.join("\n")}`
    : "";

  const promptText = `**Original Ad has ${analysis.sceneBreakdown.length} scenes. You MUST write exactly ${analysis.sceneBreakdown.length} scenes.**

**Original Scene Breakdown:**
${sceneList}

**Music & Pacing:** ${analysis.musicAndPacing}

**NEW Product Big Idea:** ${bigIdea}
**NEW Product Info:** ${productInfo || "Not provided."}
**NEW Target Audience:** ${targetAudience || "Not provided."}${strategyBlock}

Write a complete ${analysis.sceneBreakdown.length}-scene script. Each scene needs 2-4 sentences of natural spoken dialogue.`;

  const parts: Part[] = [
    { text: promptText },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: productImage.includes(",")
          ? productImage.split(",")[1]
          : productImage,
      },
    },
  ];

  if (creatorImage) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: creatorImage.includes(",")
          ? creatorImage.split(",")[1]
          : creatorImage,
      },
    });
  }

  return callWithRetry(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: CLONED_SCRIPT_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            scenes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  sceneType: { type: "STRING", description: "Marketing purpose (problem, product, benefit, CTA, etc.)" },
                  dialogue: { type: "STRING", description: "Full voiceover/spoken text for this scene. 2-4 sentences minimum." },
                  direction: { type: "STRING", description: "Brief visual/tone direction note" },
                },
                required: ["sceneType", "dialogue", "direction"],
              },
            },
          },
          required: ["scenes"],
        },
      },
    });
    const result = JSON.parse(response.text!.trim());
    return result.scenes as ScriptScene[];
  });
}

export async function generateClonedStoryboard(
  analysis: VideoAnalysis,
  script: string,
  productImage: string,
  productInfo?: string,
  targetAudience?: string,
  creatorImage?: string,
  strategy?: CreativeStrategy
): Promise<StoryboardScene[]> {
  const ai = getClient();

  // Build creative strategy visual direction
  const strategyLines: string[] = [];
  if (strategy?.emotionalTone) strategyLines.push(`**EMOTIONAL TONE:** ${strategy.emotionalTone} — Drive lighting, color palette, and visual energy to match this tone. See system instructions for tone-to-visual mapping.`);
  if (strategy?.storylineType) strategyLines.push(`**STORYLINE TYPE:** ${strategy.storylineType} — Use camera work and settings that match this storyline type. See system instructions for storyline-to-visual mapping.`);
  if (strategy?.motivator) strategyLines.push(`**MOTIVATOR:** ${strategy.motivator} — The visual hook (scene 1) must visually reinforce this motivator.`);
  const strategyBlock = strategyLines.length > 0
    ? `\n\n## VISUAL STRATEGY (apply to all image/video prompts)\n${strategyLines.join("\n")}`
    : "";

  const promptText = `**Original Ad Analysis:**\n${JSON.stringify(analysis, null, 2)}\n\n**New Script:**\n${script}\n\n**New Product Info:** ${productInfo || "Not provided."}\n**New Target Audience:** ${targetAudience || "Not provided."}${strategyBlock}`;

  const parts: Part[] = [
    { text: promptText },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: productImage.includes(",")
          ? productImage.split(",")[1]
          : productImage,
      },
    },
  ];

  if (creatorImage) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: creatorImage.includes(",")
          ? creatorImage.split(",")[1]
          : creatorImage,
      },
    });
  }

  // For many scenes, tell Gemini to keep prompts concise to avoid output truncation
  const sceneCount = analysis.sceneBreakdown.length;
  const conciseSuffix = sceneCount > 10
    ? "\n\nIMPORTANT: This ad has many scenes. Keep each imagePrompt and videoPrompt to 300 words MAX. Write prompts as plain text paragraphs, NOT JSON objects. Prioritize the most impactful visual details."
    : "\n\nWrite imagePrompt and videoPrompt as plain text paragraphs (not JSON objects).";
  parts[0] = { text: (parts[0] as { text: string }).text + conciseSuffix };

  return callWithRetry(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: CLONED_STORYBOARD_INSTRUCTION,
        maxOutputTokens: 65536,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            scenes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  rollType: { type: "STRING", description: "One of: aroll, broll, croll" },
                  voiceoverScript: { type: "STRING" },
                  voiceoverGuide: { type: "STRING" },
                  imagePrompt: { type: "STRING" },
                  videoPrompt: { type: "STRING" },
                },
                required: [
                  "rollType",
                  "voiceoverScript",
                  "voiceoverGuide",
                  "imagePrompt",
                  "videoPrompt",
                ],
              },
            },
          },
          required: ["scenes"],
        },
      },
    });

    const raw = response.text!.trim();
    let result: { scenes: Array<{
      rollType?: string;
      voiceoverScript: string;
      voiceoverGuide: string;
      imagePrompt: string | object;
      videoPrompt: string | object;
    }> };

    try {
      result = JSON.parse(raw);
    } catch {
      // Attempt to repair truncated JSON — find last complete scene object
      const repaired = repairTruncatedScenesJson(raw);
      result = JSON.parse(repaired);
    }

    return result.scenes.map(
      (s) => createDefaultScene({
        ...s,
        imagePrompt: typeof s.imagePrompt === "object" ? JSON.stringify(s.imagePrompt, null, 2) : s.imagePrompt,
        videoPrompt: typeof s.videoPrompt === "object" ? JSON.stringify(s.videoPrompt, null, 2) : s.videoPrompt,
        rollType: (["aroll", "broll", "croll"].includes(s.rollType || "") ? s.rollType : undefined) as RollType | undefined,
      })
    );
  });
}

/**
 * Attempts to repair a truncated JSON response from Gemini.
 * Finds the last complete object in the scenes array and closes the JSON.
 */
function repairTruncatedScenesJson(raw: string): string {
  // Find the last complete "videoPrompt" value (last fully closed scene)
  // Strategy: find all '}' positions and try to parse with closing brackets
  const lastCloseBrace = raw.lastIndexOf("}");
  if (lastCloseBrace === -1) throw new Error("Cannot repair JSON: no closing brace found");

  // Try progressively from the end to find valid JSON
  for (let i = lastCloseBrace; i >= 0; i--) {
    if (raw[i] !== "}") continue;
    const candidate = raw.slice(0, i + 1) + "]}";
    try {
      const parsed = JSON.parse(candidate);
      if (parsed.scenes && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        console.warn(`[Gemini] Repaired truncated storyboard JSON — recovered ${parsed.scenes.length} scenes`);
        return candidate;
      }
    } catch {
      continue;
    }
  }
  throw new Error("Cannot repair truncated JSON response from Gemini. Try again with fewer scenes.");
}

export async function generateTTS(
  text: string,
  guide: string,
  voice: string,
  globalInstruction?: string
): Promise<string> {
  const ai = getClient();

  let textToSpeak = text;
  if (guide) textToSpeak = `(${guide}) ${text}`;
  if (globalInstruction)
    textToSpeak = `[Overall tone: ${globalInstruction}] ${textToSpeak}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: textToSpeak }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (response as any).candidates[0].content.parts[0].inlineData.data;
}

export async function enhancePrompt(
  projectContext: string,
  scene: StoryboardScene,
  promptType: "image" | "video",
  productImage?: string,
  creatorImage?: string
): Promise<string> {
  const ai = getClient();

  const textPrompt = `**Project-Level Context:**\n${projectContext}\n\n**Scene-Level Context:**\n- Voiceover Script: "${scene.voiceoverScript}"\n- Existing Image Prompt: "${scene.imagePrompt}"\n- Existing Video Prompt: "${scene.videoPrompt}"\n\n**Your Task:** Generate an enhanced **${promptType === "image" ? "Image Prompt" : "Video Motion Prompt"}** for this scene.`;

  const parts: Part[] = [{ text: textPrompt }];

  if (productImage) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: productImage.includes(",")
          ? productImage.split(",")[1]
          : productImage,
      },
    });
  }
  if (creatorImage) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: creatorImage.includes(",")
          ? creatorImage.split(",")[1]
          : creatorImage,
      },
    });
  }

  return callWithRetry(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: ENHANCE_PROMPT_INSTRUCTION,
        temperature: 0.7,
      },
    });
    return response.text!.trim();
  });
}
