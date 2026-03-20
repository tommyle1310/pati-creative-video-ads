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

  // Video ads change visuals frequently — extract ~2 frames/second
  // for accurate scene-cut detection. Cap at 120 frames.
  const interval = 0.5; // every 0.5 seconds
  const maxFrames = 120;
  const timestamps: number[] = [];

  for (let t = 0; t < duration; t += interval) {
    timestamps.push(Math.round(t * 100) / 100); // avoid float drift
  }
  // Always include the last moment
  if (timestamps.length === 0 || timestamps[timestamps.length - 1] < duration - 0.3) {
    timestamps.push(Math.max(0, duration - 0.2));
  }

  return timestamps.slice(0, maxFrames);
}

async function extractFrames(
  videoPath: string,
  jobDir: string,
  duration: number
): Promise<string[]> {
  const timestamps = getTimestamps(duration);

  // Use a single FFmpeg pass with fps filter for efficiency (2 fps)
  const outputPattern = path.join(jobDir, "frame_%04d.jpg");
  try {
    await run("ffmpeg", [
      "-i", videoPath,
      "-vf", "fps=2",
      "-q:v", "4",
      "-y", outputPattern,
    ], 120000); // 2 min timeout for longer videos
  } catch {
    // Fallback: extract per-timestamp if fps filter fails
    const framePaths: string[] = [];
    for (const ts of timestamps.slice(0, 60)) {
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

  // Collect all extracted frames in order
  const framePaths: string[] = [];
  const files = fs.readdirSync(jobDir)
    .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
    .sort();
  for (const file of files) {
    const fp = path.join(jobDir, file);
    if (fs.statSync(fp).size > 500) {
      framePaths.push(fp);
    }
  }

  // Cap at 120 frames
  return framePaths.slice(0, 120);
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
