// ── KIE (Kling 3.0) Service (server-side only) ────────────────
// Handles KIE API calls for Kling 3.0 image and video generation.

const KIE_BASE = "https://api.kie.ai/api/v1/jobs";

function getApiKey() {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error("KIE_API_KEY not set");
  return key;
}

// ── Image Generation (Nano Banana Pro) ───────────────────────

export async function generateImageKie(
  prompt: string,
  aspectRatio: string,
  characterUrl?: string,
  productUrl?: string
): Promise<string> {
  const apiKey = getApiKey();

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    resolution: "1K",
    output_format: "png",
  };

  // Nano Banana Pro uses image_input array for reference images
  // Pass both character + product refs so the model can match them
  const imageRefs: string[] = [];
  if (characterUrl) imageRefs.push(characterUrl);
  if (productUrl) imageRefs.push(productUrl);
  if (imageRefs.length > 0) {
    input.image_input = imageRefs;
  }

  const body = {
    model: "nano-banana-pro",
    input,
  };

  const res = await fetch(`${KIE_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`KIE image gen failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(`KIE error: ${json.msg || JSON.stringify(json)}`);
  }

  return json.data.taskId;
}

// ── Video Generation ─────────────────────────────────────────

export async function generateVideoKie(
  prompt: string,
  aspectRatio: string,
  startImageUrl: string,
  duration: number = 5,
  mode: "std" | "pro" = "std"
): Promise<string> {
  const apiKey = getApiKey();

  // Clamp duration to KIE's 3-15 range
  const clampedDuration = Math.max(3, Math.min(15, duration));

  const body = {
    model: "kling-3.0/video",
    input: {
      prompt,
      image_urls: [startImageUrl],
      sound: false,
      duration: String(clampedDuration),
      aspect_ratio: aspectRatio, // "16:9", "9:16", "1:1"
      mode,
      multi_shots: false,
      multi_prompt: [],
    },
  };

  const res = await fetch(`${KIE_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`KIE video gen failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(`KIE error: ${json.msg || JSON.stringify(json)}`);
  }

  return json.data.taskId;
}

// ── Job Status ──────────────────────────────────────────────

export interface KieJobResult {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  url?: string;
  error?: string;
}

export async function checkKieJobStatus(taskId: string): Promise<KieJobResult> {
  const apiKey = getApiKey();

  const res = await fetch(`${KIE_BASE}/recordInfo?taskId=${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`KIE job status failed: ${res.status}`);
  }

  const json = await res.json();
  const data = json.data;

  // Map KIE state to our unified format
  // KIE states: waiting, queuing, generating, success, fail
  let status: KieJobResult["status"];
  switch (data?.state) {
    case "success":
      status = "COMPLETED";
      break;
    case "fail":
      status = "FAILED";
      break;
    case "generating":
      status = "PROCESSING";
      break;
    default:
      // waiting, queuing
      status = "PENDING";
  }

  // KIE returns resultJson as a JSON string with resultUrls array
  let url: string | undefined;
  if (status === "COMPLETED" && data?.resultJson) {
    try {
      const result = typeof data.resultJson === "string"
        ? JSON.parse(data.resultJson)
        : data.resultJson;
      url = result?.resultUrls?.[0];
    } catch {
      // resultJson might not be valid JSON
    }
  }

  return {
    status,
    url,
    error: data?.failMsg || undefined,
  };
}
