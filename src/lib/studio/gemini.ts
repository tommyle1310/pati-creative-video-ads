// ── Gemini Service (server-side only) ─────────────────────────
// Handles all Google Gemini API calls for the Studio pipeline.

import { GoogleGenAI, Modality, type Part } from "@google/genai";
import type { VideoAnalysis, StoryboardScene } from "./types";
import { createDefaultScene } from "./types";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey: key });
}

// ── System Instructions ──────────────────────────────────────

const VIDEO_ANALYSIS_INSTRUCTION = `You are a professional video ad deconstructor. Your mission is to analyze a sequence of keyframes from a video ad and output a structured breakdown in JSON format.

Tasks:
1. Automatically cut scenes by timestamp based on the frame sequence.
2. Label each scene's marketing purpose: problem, product, benefit, proof, social-proof, mechanism, offer, CTA.
3. Extract: visual description, voiceover/text transcript, overall music/pacing summary.

Output: JSON object with sceneBreakdown[] and musicAndPacing.`;

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

OUTPUT FORMAT:
Return a JSON object with a "scenes" array. Each element has:
- "sceneType": the marketing purpose (matching the original scene type)
- "dialogue": the full voiceover/spoken text for that scene (2-4 sentences, detailed)
- "direction": brief visual/tone note for the scene`;

const CLONED_STORYBOARD_INSTRUCTION = `You are an expert video director specializing in recreating successful ad structures.

For each scene:
1. Look at the original scene's type, time, and visual description
2. Recreate the same layout, camera angle, and visual elements
3. Replace the original product/subject with the new product
4. Replace the character with the new character image (or invent one fitting the audience)
5. Ensure motion/action fits within the original scene's time duration`;

const ENHANCE_PROMPT_INSTRUCTION = `You are an expert creative director and prompt engineer.
Take a simple scene description and expand it into a professional-grade prompt.

For Image Prompt: rich paragraph with composition, camera angle, lighting, colors, mood.
For Video Motion Prompt: concise action description with camera + subject movement.

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
          type: { type: "STRING" as const },
          time: { type: "STRING" as const },
          visual: { type: "STRING" as const },
          speech: { type: "STRING" as const },
        },
        required: ["scene_id", "type", "time", "visual", "speech"] as const,
      },
    },
  },
  required: ["musicAndPacing", "sceneBreakdown"] as const,
};

export async function analyzeVideoFrames(
  frames: string[],
  fps: number,
  duration: number
): Promise<VideoAnalysis> {
  const ai = getClient();

  // Keep max 10 frames — evenly sampled across the video
  const maxFrames = 10;
  const sampled =
    frames.length <= maxFrames
      ? frames
      : Array.from({ length: maxFrames }, (_, i) =>
          frames[Math.floor((i / maxFrames) * frames.length)]
        );

  const parts: Part[] = [
    {
      text: `Analyze these ${sampled.length} frames from a ${duration.toFixed(1)}-second video, captured at ${fps} FPS.`,
    },
  ];
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

export async function generateClonedScript(
  analysis: VideoAnalysis,
  bigIdea: string,
  productImage: string,
  productInfo?: string,
  targetAudience?: string,
  creatorImage?: string
): Promise<ScriptScene[]> {
  const ai = getClient();

  // Build an explicit scene list so Gemini knows exactly how many scenes to write
  const sceneList = analysis.sceneBreakdown
    .map(
      (sc) =>
        `  Scene ${sc.scene_id} [${sc.type}] (${sc.time}): Visual: "${sc.visual}" | Speech: "${sc.speech}"`
    )
    .join("\n");

  const promptText = `**Original Ad has ${analysis.sceneBreakdown.length} scenes. You MUST write exactly ${analysis.sceneBreakdown.length} scenes.**

**Original Scene Breakdown:**
${sceneList}

**Music & Pacing:** ${analysis.musicAndPacing}

**NEW Product Big Idea:** ${bigIdea}
**NEW Product Info:** ${productInfo || "Not provided."}
**NEW Target Audience:** ${targetAudience || "Not provided."}

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
  creatorImage?: string
): Promise<StoryboardScene[]> {
  const ai = getClient();

  const promptText = `**Original Ad Analysis:**\n${JSON.stringify(analysis, null, 2)}\n\n**New Script:**\n${script}\n\n**New Product Info:** ${productInfo || "Not provided."}\n**New Target Audience:** ${targetAudience || "Not provided."}`;

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
        systemInstruction: CLONED_STORYBOARD_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            scenes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  voiceoverScript: { type: "STRING" },
                  voiceoverGuide: { type: "STRING" },
                  imagePrompt: { type: "STRING" },
                  videoPrompt: { type: "STRING" },
                },
                required: [
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

    const result = JSON.parse(response.text!.trim());
    return result.scenes.map(
      (s: {
        voiceoverScript: string;
        voiceoverGuide: string;
        imagePrompt: string;
        videoPrompt: string;
      }) => createDefaultScene(s)
    );
  });
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
