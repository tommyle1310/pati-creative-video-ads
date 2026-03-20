// ── Vidtory Service (server-side only) ────────────────────────
// Handles all Vidtory API calls for image/video generation.

const VIDTORY_BASE = "https://bapi.vidtory.net";

function getApiKey() {
  const key = process.env.VIDTORY_API_KEY;
  if (!key) throw new Error("VIDTORY_API_KEY not set");
  return key;
}

function headers(apiKey: string, json = true) {
  const h: Record<string, string> = { "x-api-key": apiKey };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// ── Upload ───────────────────────────────────────────────────

/** Convert a base64 data URL to a Blob for form upload. */
function base64ToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
  const bytes = Buffer.from(b64, "base64");
  return new Blob([bytes], { type: mime });
}

export async function uploadMedia(dataUrl: string): Promise<string> {
  const apiKey = getApiKey();
  const blob = base64ToBlob(dataUrl);
  const form = new FormData();
  form.append("file", blob, "upload.jpg");

  const res = await fetch(`${VIDTORY_BASE}/media/upload`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.data || json).url;
}

// ── Image Generation ─────────────────────────────────────────

const ASPECT_MAP: Record<string, string> = {
  "16:9": "IMAGE_ASPECT_RATIO_LANDSCAPE",
  "9:16": "IMAGE_ASPECT_RATIO_PORTRAIT",
  "1:1": "IMAGE_ASPECT_RATIO_SQUARE",
};

export async function generateImage(
  prompt: string,
  aspectRatio: string,
  characterUrl?: string,
  productUrl?: string
): Promise<string> {
  const apiKey = getApiKey();
  const body: Record<string, unknown> = {
    prompt,
    aspectRatio: ASPECT_MAP[aspectRatio] || "IMAGE_ASPECT_RATIO_PORTRAIT",
  };
  if (characterUrl) body.sampleCharacterUrl = characterUrl;
  if (productUrl) body.refImageUrl = productUrl;

  const res = await fetch(`${VIDTORY_BASE}/generative-core/image`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Image gen failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.data || json).generationHistoryId;
}

// ── Video Generation ─────────────────────────────────────────

export async function generateVideo(
  prompt: string,
  aspectRatio: string,
  refImageUrl: string,
  duration = 5
): Promise<string> {
  const apiKey = getApiKey();
  const body = {
    prompt,
    aspectRatio: ASPECT_MAP[aspectRatio] || "IMAGE_ASPECT_RATIO_PORTRAIT",
    duration,
    refImageUrl,
  };

  const res = await fetch(`${VIDTORY_BASE}/generative-core/video`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Video gen failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.data || json).generationHistoryId;
}

// ── Job Polling ──────────────────────────────────────────────

export interface JobResult {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  url?: string;
  type?: string;
  error?: string;
}

export async function checkJobStatus(jobId: string): Promise<JobResult> {
  const apiKey = getApiKey();
  const res = await fetch(
    `${VIDTORY_BASE}/generative-core/jobs/${jobId}/status`,
    { headers: { "x-api-key": apiKey } }
  );

  if (!res.ok) throw new Error(`Job status failed: ${res.status}`);
  const json = await res.json();
  const data = json.data || json;

  return {
    status: data.status,
    url: data.result?.url,
    type: data.result?.type,
    error: data.error,
  };
}

/** Server-side polling loop — use for short jobs only (images). */
export async function pollUntilComplete(
  jobId: string,
  intervalMs = 5000,
  timeoutMs = 300000
): Promise<{ url: string; type: string }> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await checkJobStatus(jobId);

    if (result.status === "COMPLETED" && result.url) {
      return { url: result.url, type: result.type || "image" };
    }
    if (result.status === "FAILED") {
      throw new Error(`Job failed: ${result.error || "Unknown"}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Processing timed out.");
}
