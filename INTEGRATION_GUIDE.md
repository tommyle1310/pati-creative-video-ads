# PATI Studio — Full Integration Guide

> **Purpose:** This document is a standalone reference for replicating the PATI Studio video ad generation pipeline in any new project. It covers every API, every data type, and the exact step-by-step flow — from analyzing an input video ad to producing a better version with your own brand/product/character.

---

## Table of Contents

1. [High-Level Concept](#1-high-level-concept)
2. [The Two Main Workflows](#2-the-two-main-workflows)
3. [API Keys & Settings](#3-api-keys--settings)
4. [TypeScript Data Models](#4-typescript-data-models)
5. [API Reference: Gemini (Script & Analysis)](#5-api-reference-gemini-script--analysis)
6. [API Reference: Vidtory (Image & Video Generation)](#6-api-reference-vidtory-image--video-generation)
7. [Pipeline A: UGC Video Maker (From Scratch)](#7-pipeline-a-ugc-video-maker-from-scratch)
8. [Pipeline B: Video Cloner (Analyze → Improve)](#8-pipeline-b-video-cloner-analyze--improve)
9. [Image Generation — Detailed](#9-image-generation--detailed)
10. [Video Generation — Detailed](#10-video-generation--detailed)
11. [TTS Audio Generation](#11-tts-audio-generation)
12. [Prompt Engineering: System Instructions](#12-prompt-engineering-system-instructions)
13. [Vite Proxy Config for CORS](#13-vite-proxy-config-for-cors)
14. [Putting It All Together: The "Better Than Original" Flow](#14-putting-it-all-together-the-better-than-original-flow)

---

## 1. High-Level Concept

```
INPUT: A competitor's video ad (or just product info)
  │
  ▼
STEP 1: AI ANALYSIS (Gemini 2.5-pro)
  - Extract keyframes from video
  - Analyze scene-by-scene: type, timing, visuals, speech
  │
  ▼
STEP 2: SCRIPT GENERATION (Gemini 2.5-flash)
  - Generate a NEW script matching the original structure
  - But for YOUR product, YOUR audience, YOUR brand
  │
  ▼
STEP 3: STORYBOARD GENERATION (Gemini 2.5-pro)
  - For each scene: imagePrompt + videoPrompt + voiceoverGuide
  - Prompts are crafted to recreate the original's layout/angle but with new content
  │
  ▼
STEP 4: IMAGE GENERATION (Vidtory API)
  - Generate a starting frame image for each scene
  - Uses your product image + character image as references
  │
  ▼
STEP 5: VIDEO CLIP GENERATION (Vidtory API)
  - Each generated image → short video clip (image-to-video)
  - Motion guided by the videoPrompt
  │
  ▼
STEP 6: TTS VOICEOVER (Gemini TTS)
  - Generate voiceover audio for each scene
  │
  ▼
OUTPUT: Scene-by-scene assets (images, video clips, audio)
  - Better quality, your brand, same winning structure
```

---

## 2. The Two Main Workflows

### Workflow A: "From Scratch" (UGC Video Maker)
- User provides: product image, creator image, product info, video angle, audience, CTA
- AI generates a complete storyboard from zero
- Then generates images → videos → audio for each scene

### Workflow B: "Clone & Improve" (Video Cloner) ← **THIS IS WHAT YOU WANT**
- User provides: an existing competitor video ad
- AI analyzes it frame-by-frame
- AI generates a new script mimicking the structure but for YOUR product
- AI generates better image prompts + video prompts
- Then generates images → videos → audio that are better than the original

---

## 3. API Keys & Settings

Stored in `localStorage` under key `patiStudioSettings`.

```typescript
interface Settings {
    geminiApiKey: string;    // Google Gemini API key (for script gen, analysis, TTS)
    brianApiKey: string;     // Vidtory API key (for image & video generation)
    telegramBotToken: string;
    telegramChatId: string;
    telegramTopicId: string;
    defaultImageModel: 'classic' | 'nano1' | 'nano2';
}
```

**Required for the core pipeline:**
| Key | Service | Used For |
|-----|---------|----------|
| `geminiApiKey` | Google Gemini | Script generation, video analysis, prompt enhancement, TTS |
| `brianApiKey` | Vidtory (`bapi.vidtory.net`) | Image generation, video generation, media upload |

---

## 4. TypeScript Data Models

### StoryboardScene — The core unit of output

```typescript
interface StoryboardScene {
  id: string;                     // crypto.randomUUID()
  voiceoverScript: string;        // The spoken text for this scene
  voiceoverGuide: string;         // Tone/delivery instructions (e.g. "excited, genuine")
  imagePrompt: string;            // Prompt for generating the starting frame image
  videoPrompt: string;            // Prompt for the motion/action in the video clip
  images: string[];               // URLs of generated images
  selectedImageForVideo?: string; // Which image to use as the video starting frame
  videos: VideoData[];            // Generated video clips
  audioUrl?: string;              // Generated TTS audio URL

  // Enhancement modifiers (prepended to prompts before generation)
  imageFocusObject?: string;      // "Focus on: {value}. {imagePrompt}"
  imageCameraAngle?: string;      // "{value} shot. {imagePrompt}"
  videoCameraMovement?: string;   // Appended to video prompt
  videoShootingEffect?: string;   // Appended to video prompt

  // UI state flags
  isGeneratingImage: boolean;
  isGeneratingVideo?: boolean;
  isGeneratingAudio?: boolean;
  imageGenerationError: string | null;
  videoGenerationError?: string | null;
  audioGenerationError?: string | null;
  includeDialogueInPrompt?: boolean; // Default true — adds voiceover text to video prompt
}
```

### VideoData

```typescript
interface VideoData {
  url: string;                // Video URL from Vidtory
  mediaGenerationId: string;  // Job ID for tracking
  seed: number;               // Generation seed
  upscaledUrl?: string;       // Not used currently
}
```

### VideoAnalysis — Output from video frame analysis

```typescript
interface VideoAnalysis {
  musicAndPacing: string;           // Overall description of music/rhythm
  sceneBreakdown: SceneBreakdown[]; // Per-scene analysis
}

interface SceneBreakdown {
  scene_id: number;    // Sequential, starting from 1
  type: string;        // "problem" | "product" | "benefit" | "proof" | "social-proof" | "mechanism" | "offer" | "CTA"
  time: string;        // "00:00-00:03" format
  visual: string;      // What's happening visually
  speech: string;      // Voiceover/text transcript
}
```

---

## 5. API Reference: Gemini (Script & Analysis)

All Gemini calls use the `@google/genai` SDK.

### 5.1 Initialize Client

```typescript
import { GoogleGenAI, Type, Modality, Part } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_API_KEY" });
```

### 5.2 Analyze Video Frames (Video Cloner — Step 1)

Extracts keyframes from a video, sends them to Gemini for scene-by-scene analysis.

```typescript
const analyzeVideoFrames = async (
    frames: string[],    // Array of base64 data URLs (keyframes extracted from video)
    fps: number,         // Capture rate (e.g. 2 FPS)
    duration: number     // Video duration in seconds
): Promise<VideoAnalysis> => {

    const parts: Part[] = [
        { text: `Analyze these ${frames.length} frames from a ${duration.toFixed(1)}-second video, captured at ${fps} FPS.` }
    ];
    frames.forEach(frame => {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: frame.split(',')[1] } });
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',    // Use pro for analysis quality
        contents: { parts },
        config: {
            systemInstruction: videoAnalysisSystemInstruction,  // See Section 12
            responseMimeType: 'application/json',
            responseSchema: videoAnalysisSchema,                // See Section 12
        }
    });

    return JSON.parse(response.text.trim()) as VideoAnalysis;
};
```

**Key details:**
- Model: `gemini-2.5-pro` (better analysis quality)
- Input: Array of base64 JPEG frames (extracted client-side from the video using canvas)
- Output: Structured JSON with scene-by-scene breakdown
- The system instruction tells Gemini to identify scenes, label their marketing purpose, and describe visuals + speech

### 5.3 Generate Cloned Script (Video Cloner — Step 2)

Takes the analysis + your product info → generates a new script that matches the original structure.

```typescript
const generateClonedScript = async (
    analysis: VideoAnalysis,            // From step 5.2
    newBigIdea: string,                 // Core message for new product
    newProductImageUrl: string,         // base64 data URL of your product
    newProductInfo?: string,            // Product description
    newTargetAudience?: string,         // Who this is for
    newReviewerImageUrl?: string        // Optional: your creator/model image
): Promise<string> => {

    const promptText = `**Original Ad Analysis:**\n${JSON.stringify(analysis, null, 2)}\n\n**New Big Idea:** ${newBigIdea}\n**New Product Info:** ${newProductInfo || 'Not provided.'}\n**New Target Audience:** ${newTargetAudience || 'Not provided.'}`;

    const parts: Part[] = [
        { text: promptText },
        { inlineData: { mimeType: 'image/jpeg', data: newProductImageUrl.split(',')[1] } },
    ];
    if (newReviewerImageUrl) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: newReviewerImageUrl.split(',')[1] } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',    // Flash is sufficient for script writing
        contents: { parts },
        config: {
            systemInstruction: clonedScriptSystemInstruction,  // See Section 12
            responseMimeType: 'application/json',
            responseSchema: {
                type: "OBJECT",
                properties: {
                    script: { type: "STRING", description: "Full script, lines separated by \\n" }
                },
                required: ["script"]
            },
        }
    });

    const result = JSON.parse(response.text.trim());
    return result.script;  // Multi-line string, one line per scene
};
```

**Key details:**
- Model: `gemini-2.5-flash`
- Input: original analysis JSON + new product image + new product info
- Output: A script string with N lines (same N as original ad's scene count)
- The system instruction enforces: same scene count, same scene type sequence, new product messaging

### 5.4 Generate Cloned Storyboard Prompts (Video Cloner — Step 3)

Takes the analysis + new script → generates imagePrompt + videoPrompt for each scene.

```typescript
const generateClonedPromptsFromScript = async (
    analysis: VideoAnalysis,
    newScript: string,                  // From step 5.3
    newProductImageUrl: string,
    newProductInfo?: string,
    newTargetAudience?: string,
    newReviewerImageUrl?: string
): Promise<StoryboardScene[]> => {

    const promptText = `**Original Ad Analysis:**\n${JSON.stringify(analysis, null, 2)}\n\n**New Script:**\n${newScript}\n\n**New Product Info:** ${newProductInfo || 'Not provided.'}\n**New Target Audience:** ${newTargetAudience || 'Not provided.'}`;

    const parts: Part[] = [
        { text: promptText },
        { inlineData: { mimeType: 'image/jpeg', data: newProductImageUrl.split(',')[1] } },
    ];
    if (newReviewerImageUrl) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: newReviewerImageUrl.split(',')[1] } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',      // Pro for higher quality prompts
        contents: { parts },
        config: {
            systemInstruction: clonedStoryboardSystemInstruction,  // See Section 12
            responseMimeType: 'application/json',
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
                                videoPrompt: { type: "STRING" }
                            },
                            required: ["voiceoverScript", "voiceoverGuide", "imagePrompt", "videoPrompt"]
                        }
                    }
                },
                required: ["scenes"]
            },
        }
    });

    const result = JSON.parse(response.text.trim());
    return result.scenes.map(mapSceneDefaults);
};
```

**Key details:**
- Model: `gemini-2.5-pro` (pro for high-quality visual prompts)
- Input: original analysis + new script + product/character images
- Output: Array of `StoryboardScene` objects with imagePrompt, videoPrompt, voiceoverGuide per scene
- The system instruction tells Gemini to **recreate the same layout/camera angle/visual structure** from the original but with new product/character

### 5.5 Generate Voiceover Script (UGC — From Scratch)

```typescript
const generateVoiceoverScript = async (
    videoAngle: string,          // "Honest Review", "Problem/Solution", etc.
    theme: string,               // Same as videoAngle (legacy compat)
    language: string,            // "English" or "Vietnamese"
    ctaMessage: string,          // "Link in bio!"
    productImageUrl: string,     // base64 data URL
    productDescription?: string,
    targetAudience?: string,
    reviewerImageUrl?: string    // Optional creator image
): Promise<string> => {

    const parts: Part[] = [
        { text: `Video Angle/Core Idea: ${videoAngle}\nCall to Action: ${ctaMessage}\nProduct Info: ${productDescription}\nTarget Audience: ${targetAudience}` },
        { inlineData: { mimeType: 'image/jpeg', data: productImageUrl.split(',')[1] } },
    ];
    if (reviewerImageUrl) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: reviewerImageUrl.split(',')[1] } });
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
            systemInstruction: scriptSystemInstruction + `\n\n**Output Language:** You MUST generate the script strictly in **${language}**.`,
            responseMimeType: "application/json",
            responseSchema: scriptSchema,
            temperature: 0.8,
            topP: 0.95,
        },
    });

    return JSON.parse(response.text.trim()).script;
};
```

### 5.6 Generate Prompts From Script (UGC — From Scratch)

```typescript
const generatePromptsFromScript = async (
    voiceoverScript: string,
    videoAngle: string,
    theme: string,
    language: string,
    productImageUrl: string,
    environmentUrls: string[],      // Currently unused (pass empty array)
    reviewerImageUrl?: string
): Promise<StoryboardScene[]> => {

    const parts: Part[] = [
        { text: `**Finalized Voiceover Script:**\n${voiceoverScript}\n\n**Video Angle/Core Idea:** ${videoAngle}` },
        { inlineData: { mimeType: 'image/jpeg', data: productImageUrl.split(',')[1] } },
    ];
    if (reviewerImageUrl) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: reviewerImageUrl.split(',')[1] } });
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
            systemInstruction: promptsSystemInstruction + `\n\n**Output Language:** You MUST generate all prompts strictly in **${language}**.`,
            responseMimeType: "application/json",
            responseSchema: promptsSchema,
        },
    });

    return JSON.parse(response.text.trim()).scenes.map(mapSceneDefaults);
};
```

### 5.7 Enhance a Single Prompt (AI-Assisted Prompt Improvement)

```typescript
const generateEnhancedPrompt = async (
    projectContext: string,          // Stringified summary of project info
    scene: StoryboardScene,
    promptType: 'image' | 'video',
    productImageUrl?: string,        // base64
    characterImageUrl?: string       // base64
): Promise<string> => {

    const textPrompt = `**Project-Level Context:**\n${projectContext}\n\n**Scene-Level Context:**\n- Voiceover Script: "${scene.voiceoverScript}"\n- Existing Image Prompt: "${scene.imagePrompt}"\n- Existing Video Prompt: "${scene.videoPrompt}"\n\n**Your Task:** Generate an enhanced **${promptType === 'image' ? 'Image Prompt' : 'Video Motion Prompt'}** for this scene.`;

    const parts: Part[] = [{ text: textPrompt }];
    if (productImageUrl) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: productImageUrl.split(',')[1] } });
    }
    if (characterImageUrl) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: characterImageUrl.split(',')[1] } });
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
            systemInstruction: enhancedPromptSystemInstruction,
            temperature: 0.7,
        },
    });

    return response.text.trim(); // Returns raw text prompt, not JSON
};
```

---

## 6. API Reference: Vidtory (Image & Video Generation)

**Base URL:** `https://bapi.vidtory.net`
**Auth:** Header `x-api-key: YOUR_VIDTORY_API_KEY`

All generation is **asynchronous**: you submit a job, get a `generationHistoryId`, then poll for completion.

### 6.1 Upload Media

Upload a base64 image to get a hosted URL (required before image/video generation).

```
POST /media/upload
Content-Type: multipart/form-data
x-api-key: {apiKey}

Body: FormData with field "file" (File object)

Response:
{
  "data": {
    "url": "https://..."   // Hosted image URL
  }
}
```

```typescript
const uploadMedia = async (dataUrl: string, apiKey: string): Promise<string> => {
    const file = base64ToFile(dataUrl);  // Convert data URL → File object
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: formData,
    });

    const json = await response.json();
    return (json.data || json).url;  // Return the hosted URL
};
```

### 6.2 Generate Image

```
POST /generative-core/image
Content-Type: application/json
x-api-key: {apiKey}

Body:
{
  "prompt": "A woman holding a skincare bottle in a bright bathroom...",
  "aspectRatio": "IMAGE_ASPECT_RATIO_PORTRAIT",   // or LANDSCAPE, SQUARE
  "sampleCharacterUrl": "https://...",              // Optional: character reference image URL
  "refImageUrl": "https://...",                     // Optional: product/subject reference URL
  "styleImageUrl": "https://...",                   // Optional: style reference URL
  "model": "optional-model-override"                // Optional
}

Response:
{
  "data": {
    "generationHistoryId": "job-uuid-here"
  }
}
```

**Aspect ratio mapping:**
| Input | API Value |
|-------|-----------|
| `16:9` | `IMAGE_ASPECT_RATIO_LANDSCAPE` |
| `9:16` | `IMAGE_ASPECT_RATIO_PORTRAIT` |
| `1:1` | `IMAGE_ASPECT_RATIO_SQUARE` |

**Image reference fields:**
| Field | Purpose | Source |
|-------|---------|--------|
| `sampleCharacterUrl` | Character/creator face reference | Creator image (uploaded first) |
| `refImageUrl` | Product/subject reference | Product image (uploaded first) |
| `styleImageUrl` | Style transfer reference | Optional style image |

```typescript
const generateImageWithVidtory = async ({
    prompt,
    aspectRatio,          // "IMAGE_ASPECT_RATIO_PORTRAIT" etc.
    characterUrls = [],   // Creator/model images (data URLs, auto-uploaded)
    subjectUrls = [],     // Product images (data URLs, auto-uploaded)
    styleUrl,             // Optional style image
    model,                // Optional model override
}: GenerateImageParams): Promise<string[]> => {

    const apiKey = getApiKey();
    const body: Record<string, any> = { prompt, aspectRatio };

    // Upload and attach character reference
    if (characterUrls.length > 0) {
        body.sampleCharacterUrl = await uploadMedia(characterUrls[0], apiKey);
    }

    // Upload and attach product reference
    if (subjectUrls.length > 0) {
        body.refImageUrl = await uploadMedia(subjectUrls[0], apiKey);
    }

    if (styleUrl) {
        body.styleImageUrl = await uploadMedia(styleUrl, apiKey);
    }

    const response = await fetch(`${API_BASE_URL}/generative-core/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(body),
    });

    const json = await response.json();
    const jobId = (json.data || json).generationHistoryId;

    // Poll until complete
    const result = await pollForJobCompletion(jobId, apiKey);
    return [result.url];  // Returns array of image URLs
};
```

### 6.3 Generate Video (Image-to-Video)

```
POST /generative-core/video
Content-Type: application/json
x-api-key: {apiKey}

Body:
{
  "prompt": "The woman slowly lifts the product bottle and smiles at camera...",
  "aspectRatio": "IMAGE_ASPECT_RATIO_PORTRAIT",
  "duration": 5,
  "refImageUrl": "https://..."   // The starting frame image URL (uploaded first)
}

Response:
{
  "data": {
    "generationHistoryId": "job-uuid-here"
  }
}
```

```typescript
const generateVideoWithVidtory = async ({
    prompt,
    startImageUrl,        // base64 data URL or hosted URL
    aspectRatio,          // "16:9" | "9:16"
    duration = 5,         // seconds
}: GenerateVideoParams): Promise<{ videoUrl: string; mediaGenerationId: string }> => {

    const apiKey = getApiKey();
    const arEnum = aspectRatio === '16:9' ? 'IMAGE_ASPECT_RATIO_LANDSCAPE' : 'IMAGE_ASPECT_RATIO_PORTRAIT';

    // Upload the starting frame image if it's base64
    const resolvedImageUrl = startImageUrl.startsWith('data:')
        ? await uploadMedia(startImageUrl, apiKey)
        : startImageUrl;

    const body = {
        prompt,
        aspectRatio: arEnum,
        duration,
        refImageUrl: resolvedImageUrl,
    };

    const response = await fetch(`${API_BASE_URL}/generative-core/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(body),
    });

    const json = await response.json();
    const jobId = (json.data || json).generationHistoryId;

    // Poll with longer intervals (video takes longer)
    const result = await pollForJobCompletion(jobId, apiKey, 10000, 900000);
    return { videoUrl: result.url, mediaGenerationId: jobId };
};
```

### 6.4 Poll for Job Completion

Both image and video generation are async. Use this polling pattern:

```
GET /generative-core/jobs/{generationHistoryId}/status
x-api-key: {apiKey}

Response:
{
  "data": {
    "status": "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
    "result": {
      "url": "https://...",    // Available when COMPLETED
      "type": "image" | "video"
    },
    "error": "..."             // Available when FAILED
  }
}
```

```typescript
const pollForJobCompletion = async (
    jobId: string,
    apiKey: string,
    pollIntervalMs: number = 5000,    // 5s for images
    timeoutMs: number = 300000        // 5min for images, 15min for videos
): Promise<{ url: string; type: string }> => {

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const response = await fetch(
            `${API_BASE_URL}/generative-core/jobs/${jobId}/status`,
            { headers: { 'x-api-key': apiKey } }
        );

        const json = await response.json();
        const data = json.data || json;

        if (data.status === 'COMPLETED') {
            return { url: data.result.url, type: data.result.type || 'image' };
        }
        if (data.status === 'FAILED') {
            throw new Error(`Job failed: ${data.error || 'Unknown'}`);
        }

        // PENDING or PROCESSING — wait and retry
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Processing timed out.');
};
```

**Recommended poll settings:**
| Generation Type | Poll Interval | Timeout |
|----------------|---------------|---------|
| Image | 5,000ms (5s) | 300,000ms (5min) |
| Video | 10,000ms (10s) | 900,000ms (15min) |

### 6.5 Retry Logic

Both image and video generation include retry logic for transient "Job ID is missing" errors:

```typescript
const MAX_RETRIES = 3;
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
        // ... make API call and poll ...
        return result;
    } catch (error) {
        if (error.message.includes('Job ID is missing') && attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, attempt * 3000)); // 3s, 6s backoff
            continue;
        }
        throw error;
    }
}
```

---

## 7. Pipeline A: UGC Video Maker (From Scratch)

### Step-by-step flow:

```
1. User uploads product image(s) + optional creator image(s)
2. User fills in: videoAngle, productInfo, targetAudience, ctaMessage, language

3. GENERATE SCRIPT:
   generateVoiceoverScript(videoAngle, ..., productImageBase64, creatorImageBase64)
   → Returns multi-line script string

4. User reviews/edits the script

5. GENERATE STORYBOARD:
   generatePromptsFromScript(script, videoAngle, ..., productImageBase64, creatorImageBase64)
   → Returns StoryboardScene[] with imagePrompt + videoPrompt per scene

6. User reviews/edits each scene's prompts

7. GENERATE IMAGES (per scene, concurrency=5):
   generateImage({
     provider: 'lehuyducanh',      // Vidtory
     prompt: scene.imagePrompt,
     characterUrls: [creatorBase64],
     subjectUrls: [productBase64],
     aspectRatio: '9:16',
   })
   → Returns image URLs, stored in scene.images[]

8. User selects best image per scene (scene.selectedImageForVideo)

9. GENERATE VIDEOS (per scene):
   generateVideo({
     provider: 'lehuyducanh',
     prompt: "Motion/Action: " + scene.videoPrompt + "\nDialogue: " + scene.voiceoverScript,
     imageUrl: scene.selectedImageForVideo,
     aspectRatio: '9:16',
   })
   → Returns video URL, stored in scene.videos[]

10. GENERATE AUDIO (per scene, concurrency=5):
    generateSpeechForScene(scene.voiceoverScript, scene.voiceoverGuide, 'Kore')
    → Returns base64 audio, converted to blob URL
```

---

## 8. Pipeline B: Video Cloner (Analyze → Improve)

### This is the "input video ad → better output" flow:

```
1. User uploads a competitor's video ad

2. EXTRACT KEYFRAMES (client-side):
   - Use HTML <video> + <canvas> to extract frames at ~2 FPS
   - Convert each frame to base64 JPEG

3. ANALYZE VIDEO:
   analyzeVideoFrames(frames[], fps, duration)
   → Returns VideoAnalysis { musicAndPacing, sceneBreakdown[] }
   → Each scene has: scene_id, type, time, visual, speech

4. User provides NEW product info:
   - Product image + optional creator image
   - New Big Idea (core message)
   - New Product Info
   - New Target Audience

5. GENERATE CLONED SCRIPT:
   generateClonedScript(analysis, newBigIdea, productImageBase64, productInfo, audience, creatorImageBase64)
   → Returns new script with SAME number of lines as original scenes
   → Each line matches the original scene's marketing purpose (problem, benefit, CTA, etc.)

6. User reviews/edits the cloned script

7. GENERATE CLONED STORYBOARD:
   generateClonedPromptsFromScript(analysis, newScript, productImageBase64, productInfo, audience, creatorImageBase64)
   → Returns StoryboardScene[] with imagePrompt + videoPrompt per scene
   → Prompts recreate the original's layout/camera angle but with new product/character

8. GENERATE IMAGES per scene (same as Pipeline A step 7)

9. SELECT IMAGES per scene

10. GENERATE VIDEOS per scene (same as Pipeline A step 9)

11. GENERATE AUDIO per scene (same as Pipeline A step 10)
```

### What makes the output "better than original":

1. **AI-Enhanced Prompts**: Gemini generates detailed, optimized prompts based on analyzing what worked in the original
2. **Professional Image Generation**: Vidtory generates high-quality images with character + product consistency
3. **Prompt Enhancement**: Users can click "Enhance" on any scene to let AI improve the prompt further
4. **Scene Enrichment**: Users can "enrich" a scene (split it into 2 more dynamic sub-scenes)
5. **Multiple Variants**: Generate multiple image variants per scene, pick the best one
6. **Same Structure, Better Execution**: The cloned script follows the exact winning formula (scene types, pacing) but with better visuals

---

## 9. Image Generation — Detailed

### How the final image prompt is constructed:

```typescript
// Start with the AI-generated imagePrompt
let finalPrompt = scene.imagePrompt;

// Prepend focus object if set
if (scene.imageFocusObject) {
    finalPrompt = `Focus on: ${scene.imageFocusObject}. ${finalPrompt}`;
}

// Prepend camera angle if set
if (scene.imageCameraAngle) {
    finalPrompt = `${scene.imageCameraAngle} shot. ${finalPrompt}`;
}
```

### How reference images are mapped:

```typescript
// Product images → subjectUrls → becomes refImageUrl on Vidtory API
// Creator images → characterUrls → becomes sampleCharacterUrl on Vidtory API
// Both are base64 data URLs, auto-uploaded to Vidtory before generation

const imageUrls = await generateImage({
    provider: 'lehuyducanh',
    prompt: finalPrompt,
    characterUrls: creatorImageBase64s,   // → sampleCharacterUrl
    subjectUrls: productImageBase64s,     // → refImageUrl
    aspectRatio: '9:16',                  // → IMAGE_ASPECT_RATIO_PORTRAIT
});
```

### Concurrency for batch generation:

```typescript
// Generate all scene images with concurrency limit of 5
const tasks = scenes.map(scene => () => handleGenerateImage(scene.id));
await runTasksWithConcurrency(tasks, 5);
```

---

## 10. Video Generation — Detailed

### How the final video prompt is constructed:

```typescript
let finalPrompt = `Motion/Action: ${scene.videoPrompt}`;

// Include dialogue context (default: true)
if (scene.includeDialogueInPrompt !== false) {
    finalPrompt = `The creator is speaking.\n${finalPrompt}`;
    if (globalVoiceInstruction) {
        finalPrompt += `\nDialogue style: "${globalVoiceInstruction}"`;
    }
    finalPrompt += `\nDialogue in English: "${scene.voiceoverScript}"`;
}

// Always append this to avoid AI-generated background music
finalPrompt += '\n\nNo Music Background';
```

### The image-to-video flow:

```
scene.selectedImageForVideo (base64 or URL)
  → Upload to Vidtory if base64 (POST /media/upload)
  → POST /generative-core/video with refImageUrl + prompt
  → Poll /generative-core/jobs/{id}/status
  → Get video URL when COMPLETED
  → Store in scene.videos[]
```

---

## 11. TTS Audio Generation

Uses Gemini's built-in TTS (not a separate API).

```typescript
const generateSpeechForScene = async (
    script: string,
    guide: string,          // Tone/delivery instruction
    voice: string,          // "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr"
    globalInstruction?: string
): Promise<string> => {

    let textToSpeak = script;
    if (guide) textToSpeak = `(${guide}) ${script}`;
    if (globalInstruction) textToSpeak = `[Overall tone: ${globalInstruction}] ${textToSpeak}`;

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

    // Returns base64 audio data
    return response.candidates[0].content.parts[0].inlineData.data;
};
```

**Available voices:** Kore, Puck, Charon, Fenrir, Zephyr

---

## 12. Prompt Engineering: System Instructions

These are the critical system instructions that make the AI output high quality. Copy these exactly.

### 12.1 Video Analysis System Instruction

```
You are a professional video ad deconstructor. Your mission is to analyze a sequence of keyframes
from a video ad and output a structured breakdown in JSON format.

Tasks:
1. Automatically cut scenes by timestamp based on the frame sequence.
2. Label each scene's marketing purpose: problem, product, benefit, proof, social-proof, mechanism, offer, CTA.
3. Extract: visual description, voiceover/text transcript, overall music/pacing summary.

Output: JSON object with sceneBreakdown[] and musicAndPacing.
```

### 12.2 Cloned Script System Instruction

```
You are an expert scriptwriter for high-converting short-form video ads.
Create a NEW script for a NEW product that strictly follows the structure of the original ad.

Rules:
- Same number of scenes as original
- Same sequence of scene types (problem → product → benefit → etc.)
- Rhythm matches the original's musicAndPacing
- Language/tone appropriate for the new target audience
- Incorporates new product info and big idea
```

### 12.3 Cloned Storyboard System Instruction

```
You are an expert video director specializing in recreating successful ad structures.

For each scene:
1. Look at the original scene's type, time, and visual description
2. Recreate the same layout, camera angle, and visual elements
3. Replace the original product/subject with the new product
4. Replace the character with the new character image (or invent one fitting the audience)
5. Ensure motion/action fits within the original scene's time duration
```

### 12.4 UGC Script System Instruction

```
You are a UGC scriptwriting expert. Create authentic, high-converting scripts.

Structure:
1. Hook — relatable problem or surprising statement
2. Introduce Problem — personal struggle
3. The Discovery — introduce the product with skepticism
4. Show Don't Tell — routine + benefits
5. The Result — tangible outcome
6. Call to Action — friendly recommendation
```

### 12.5 UGC Prompts System Instruction

```
You are a UGC Video Director. Create prompts that look authentically filmed on a phone.

Rules:
- Natural lighting, simple compositions, "shot on smartphone" aesthetic
- Invent relatable, everyday settings (kitchen, bathroom, desk, car)
- Phone-friendly shots: selfie-style, POV, top-down, mirror shot
- Maintain consistent character and product appearance across all scenes
```

### 12.6 Enhanced Prompt System Instruction

```
You are an expert creative director and prompt engineer.
Take a simple scene description and expand it into a professional-grade prompt.

For Image Prompt: rich paragraph with composition, camera angle, lighting, colors, mood.
For Video Motion Prompt: concise action description with camera + subject movement.
```

---

## 13. Vite Proxy Config for CORS

In development, the Vidtory API requires a proxy to bypass CORS:

```typescript
// vite.config.ts
export default defineConfig({
    server: {
        port: 3001,
        proxy: {
            '/vidtory-api': {
                target: 'https://bapi.vidtory.net',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/vidtory-api/, ''),
                headers: { 'Origin': '' },
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq) => {
                        proxyReq.removeHeader('origin');
                        proxyReq.removeHeader('referer');
                        proxyReq.removeHeader('cookie');
                    });
                },
            },
        },
    },
});
```

In `lehuyducanhService.ts`:
```typescript
const API_BASE_URL = import.meta.env.DEV ? '/vidtory-api' : 'https://bapi.vidtory.net';
```

---

## 14. Putting It All Together: The "Better Than Original" Flow

Here is the complete integration recipe for your new project:

### Prerequisites
```
npm install @google/genai
```

### Step-by-step implementation:

```typescript
// === STEP 1: Extract frames from input video ===
// (Client-side using HTML5 video + canvas)
const extractFrames = async (videoFile: File, fps = 2): Promise<{ frames: string[], duration: number }> => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    await new Promise(r => video.onloadedmetadata = r);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const frames: string[] = [];
    const interval = 1 / fps;

    for (let time = 0; time < video.duration; time += interval) {
        video.currentTime = time;
        await new Promise(r => video.onseeked = r);
        ctx.drawImage(video, 0, 0);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
    }

    return { frames, duration: video.duration };
};

// === STEP 2: Analyze the video ===
const analysis = await analyzeVideoFrames(frames, 2, duration);
// analysis.sceneBreakdown = [{ scene_id: 1, type: "problem", time: "00:00-00:03", visual: "...", speech: "..." }, ...]

// === STEP 3: Generate new script for YOUR product ===
const newScript = await generateClonedScript(
    analysis,
    "This serum changed my skin in 2 weeks",   // Your big idea
    productImageBase64,                          // Your product image
    "Hyaluronic acid serum, 30ml, reduces wrinkles",  // Your product info
    "Women 25-45 interested in skincare",        // Your target audience
    creatorImageBase64                           // Your brand creator
);

// === STEP 4: Generate storyboard (image + video prompts) ===
const scenes = await generateClonedPromptsFromScript(
    analysis, newScript, productImageBase64,
    productInfo, targetAudience, creatorImageBase64
);

// === STEP 5: Generate images for each scene ===
for (const scene of scenes) {
    const imageUrls = await generateImageWithVidtory({
        prompt: scene.imagePrompt,
        aspectRatio: "IMAGE_ASPECT_RATIO_PORTRAIT",
        characterUrls: [creatorImageBase64],    // Your creator
        subjectUrls: [productImageBase64],      // Your product
    });
    scene.images = imageUrls;
    scene.selectedImageForVideo = imageUrls[0];
}

// === STEP 6: Generate video clips for each scene ===
for (const scene of scenes) {
    const { videoUrl } = await generateVideoWithVidtory({
        prompt: `Motion/Action: ${scene.videoPrompt}\nThe creator is speaking.\nDialogue: "${scene.voiceoverScript}"\n\nNo Music Background`,
        startImageUrl: scene.selectedImageForVideo,
        aspectRatio: "9:16",
        duration: 5,
    });
    scene.videos = [{ url: videoUrl, mediaGenerationId: '', seed: 0 }];
}

// === STEP 7: Generate TTS audio for each scene ===
for (const scene of scenes) {
    const audioBase64 = await generateSpeechForScene(
        scene.voiceoverScript,
        scene.voiceoverGuide,
        'Kore'  // or Puck, Charon, Fenrir, Zephyr
    );
    // Convert base64 to playable blob URL
    const audioBlob = new Blob(
        [Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))],
        { type: 'audio/wav' }
    );
    scene.audioUrl = URL.createObjectURL(audioBlob);
}

// === DONE ===
// Each scene now has:
//   - voiceoverScript (text)
//   - images[] (generated image URLs)
//   - videos[] (generated video clip URLs)
//   - audioUrl (TTS voiceover)
//
// Assemble these into your final video using any video editor or ffmpeg.
```

### Summary of all API calls in the pipeline:

| Step | API | Model/Endpoint | Input | Output |
|------|-----|---------------|-------|--------|
| Analyze Video | Gemini | `gemini-2.5-pro` | Keyframes (base64 images) | `VideoAnalysis` JSON |
| Generate Script | Gemini | `gemini-2.5-flash` | Analysis + product info | Script string |
| Generate Storyboard | Gemini | `gemini-2.5-pro` | Analysis + script + images | `StoryboardScene[]` |
| Enhance Prompt | Gemini | `gemini-2.5-flash` | Scene context + images | Enhanced prompt text |
| Generate Image | Vidtory | `POST /generative-core/image` | Prompt + reference images | Image URL |
| Generate Video | Vidtory | `POST /generative-core/video` | Prompt + starting image | Video URL |
| Poll Status | Vidtory | `GET /generative-core/jobs/{id}/status` | Job ID | Status + result URL |
| Upload Media | Vidtory | `POST /media/upload` | File (multipart) | Hosted URL |
| Generate TTS | Gemini | `gemini-2.5-flash-preview-tts` | Text + voice name | Base64 audio |

---

*This document was generated from the PATI Studio codebase. All code patterns, API contracts, and system instructions are production-tested.*
