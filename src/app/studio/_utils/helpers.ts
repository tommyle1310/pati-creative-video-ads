import type { JobStatusResponse } from "@/lib/studio/types";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB — safely under Claude's 5MB limit

/**
 * Resize a base64 data-URL image so its raw base64 stays under 4MB.
 * Uses client-side canvas. If already small enough, returns as-is.
 */
export function resizeImageForApi(
  dataUrl: string,
  maxBytes = MAX_IMAGE_BYTES
): Promise<string> {
  // Measure raw base64 size (strip the data:...;base64, prefix)
  const commaIdx = dataUrl.indexOf(",");
  const raw = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const byteSize = Math.ceil((raw.length * 3) / 4);
  if (byteSize <= maxBytes) return Promise.resolve(dataUrl);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      let quality = 0.8;

      // Scale down progressively until under limit
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const attempt = (): string => {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL("image/jpeg", quality);
      };

      // First try: just re-encode at lower quality at original size
      let result = attempt();
      let resultSize = Math.ceil(((result.length - result.indexOf(",") - 1) * 3) / 4);

      // Scale down if still too large
      while (resultSize > maxBytes && (width > 200 || quality > 0.3)) {
        if (quality > 0.4) {
          quality -= 0.15;
        } else {
          width = Math.round(width * 0.7);
          height = Math.round(height * 0.7);
        }
        result = attempt();
        resultSize = Math.ceil(((result.length - result.indexOf(",") - 1) * 3) / 4);
      }

      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image for resize"));
    img.src = dataUrl;
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function pollJob(
  jobId: string,
  intervalMs: number,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (signal?.aborted) throw new Error("Cancelled");
    const res = await fetch(`/api/studio/job-status?jobId=${jobId}`);
    const data: JobStatusResponse = await res.json();
    if (data.status === "COMPLETED" && data.url) return data.url;
    if (data.status === "FAILED")
      throw new Error(data.error || "Job failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out");
}

export async function pollKieJob(
  jobId: string,
  intervalMs: number,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (signal?.aborted) throw new Error("Cancelled");
    const res = await fetch(`/api/studio/kie-job-status?jobId=${jobId}`);
    const data: JobStatusResponse = await res.json();
    if (data.status === "COMPLETED" && data.url) return data.url;
    if (data.status === "FAILED")
      throw new Error(data.error || "KIE job failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("KIE job timed out");
}

export function pcmToWav(audioBase64: string): string {
  const pcmBytes = Uint8Array.from(atob(audioBase64), (c) =>
    c.charCodeAt(0)
  );
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBytes.length;
  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(44 + dataSize);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(pcmBytes, 44);

  const blob = new Blob([wavBytes], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}
