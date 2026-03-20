/**
 * POST /api/studio/extract-frames
 * Downloads a video and extracts frames server-side using FFmpeg.
 *
 * Body: { videoUrl: string } OR FormData with "video" file
 * Returns: { frames: string[], duration: number, format: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const TMP_DIR = path.join(process.cwd(), ".tmp", "studio-frames");

function run(cmd: string, args: string[], timeout = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.slice(-500))));
    proc.on("error", (e) => reject(e));
    setTimeout(() => { proc.kill(); reject(new Error("timeout")); }, timeout);
  });
}

async function getDuration(videoPath: string): Promise<number> {
  try {
    const out = await run("ffprobe", [
      "-v", "quiet", "-print_format", "json", "-show_format", videoPath,
    ]);
    const info = JSON.parse(out);
    return parseFloat(info.format?.duration || "0");
  } catch {
    return 0;
  }
}

async function getFormat(videoPath: string): Promise<string> {
  try {
    const out = await run("ffprobe", [
      "-v", "quiet", "-print_format", "json", "-show_streams",
      "-select_streams", "v:0", videoPath,
    ]);
    const info = JSON.parse(out);
    const s = info.streams?.[0];
    if (s?.width && s?.height) {
      const w = s.width, h = s.height;
      if (Math.abs(w / h - 9 / 16) < 0.1) return "9:16";
      if (Math.abs(w / h - 16 / 9) < 0.1) return "16:9";
      if (Math.abs(w / h - 1) < 0.1) return "1:1";
      if (Math.abs(w / h - 4 / 5) < 0.1) return "4:5";
    }
  } catch {}
  return "unknown";
}

function getTimestamps(duration: number): number[] {
  if (duration <= 0) return [0];

  // For studio: extract more frames for better scene analysis
  // ~1 frame per 3 seconds, plus key structural points
  const timestamps = new Set<number>();

  // Key structural points (hook, early, mid, CTA)
  timestamps.add(0);
  if (duration > 3) timestamps.add(2);
  if (duration > 7) timestamps.add(5);
  if (duration > 15) timestamps.add(Math.floor(duration * 0.25));
  if (duration > 10) timestamps.add(Math.floor(duration * 0.5));
  if (duration > 20) timestamps.add(Math.floor(duration * 0.75));
  if (duration > 10) timestamps.add(Math.max(Math.floor(duration - 3), 6));

  // Fill in ~every 3s for coverage
  for (let t = 0; t < duration - 1; t += 3) {
    timestamps.add(Math.floor(t));
  }

  return [...timestamps].filter((t) => t < duration).sort((a, b) => a - b).slice(0, 15);
}

async function extractFrames(
  videoPath: string,
  jobDir: string,
  duration: number
): Promise<string[]> {
  const timestamps = getTimestamps(duration);
  const framePaths: string[] = [];

  for (const ts of timestamps) {
    const framePath = path.join(jobDir, `frame_${ts}s.jpg`);
    try {
      await run("ffmpeg", [
        "-ss", String(ts), "-i", videoPath,
        "-vframes", "1", "-q:v", "4", "-y", framePath,
      ], 15000);
      if (fs.existsSync(framePath) && fs.statSync(framePath).size > 500) {
        framePaths.push(framePath);
      }
    } catch {
      // skip this timestamp
    }
  }

  return framePaths;
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  // Use fetch with User-Agent to download
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

export async function POST(req: NextRequest) {
  const jobDir = path.join(TMP_DIR, `job-${Date.now()}`);
  fs.mkdirSync(jobDir, { recursive: true });
  const videoPath = path.join(jobDir, "video.mp4");

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await req.formData();
      const file = formData.get("video") as File | null;
      if (!file) return NextResponse.json({ error: "No video file" }, { status: 400 });
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(videoPath, Buffer.from(bytes));
    } else {
      // JSON with videoUrl
      const { videoUrl } = await req.json();
      if (!videoUrl) return NextResponse.json({ error: "No videoUrl" }, { status: 400 });
      await downloadVideo(videoUrl, videoPath);
    }

    if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size < 1000) {
      return NextResponse.json({ error: "Video download failed or file too small" }, { status: 400 });
    }

    const duration = await getDuration(videoPath);
    const format = await getFormat(videoPath);
    const framePaths = await extractFrames(videoPath, jobDir, duration);

    if (framePaths.length === 0) {
      return NextResponse.json({ error: "FFmpeg could not extract any frames" }, { status: 500 });
    }

    // Convert frames to base64
    const frames = framePaths.map((fp) => {
      const buf = fs.readFileSync(fp);
      return `data:image/jpeg;base64,${buf.toString("base64")}`;
    });

    return NextResponse.json({
      frames,
      duration,
      format,
      fps: frames.length / Math.max(duration, 1),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Frame extraction failed";
    console.error("[studio/extract-frames]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    // Clean up
    try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}
  }
}
