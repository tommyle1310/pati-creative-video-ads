/**
 * POST /api/studio/extract-frames
 * Downloads a video, generates thumbnails for client preview,
 * and analyzes via Gemini File API (video uploaded directly to Gemini).
 *
 * Body: { videoUrl: string, analyze?: boolean }
 * Returns: { frames: string[], duration: number, format: string, fps: number, analysis?: VideoAnalysis }
 *
 * NOTE: No longer accepts FormData uploads. Client must provide a video URL.
 * For user-uploaded videos, upload to Vidtory first to get a URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { analyzeVideoFromBytes } from "@/lib/studio/gemini";
import { analyzeVideoFrames as claudeAnalyze } from "@/lib/studio/claude";
import { transcribeAudioFile } from "@/lib/studio/transcribe";
import { getAiProvider } from "@/lib/studio/ai-provider";
import { getActivePrompt } from "@/lib/studio/blueprints";

// Allow up to 5 minutes for download + Gemini analysis
export const maxDuration = 300;

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

async function downloadVideo(url: string, outputPath: string): Promise<void> {
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
    const body = await req.json();
    if (!body.videoUrl) {
      return NextResponse.json({ error: "No videoUrl provided" }, { status: 400 });
    }
    const shouldAnalyze = !!body.analyze;

    await downloadVideo(body.videoUrl, videoPath);

    if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size < 1000) {
      return NextResponse.json({ error: "Video download failed or file too small" }, { status: 400 });
    }

    const duration = await getDuration(videoPath);
    const format = await getFormat(videoPath);

    // Generate tiny thumbnails (120px wide, low quality) for client preview strip
    const thumbDir = path.join(jobDir, "thumbs");
    fs.mkdirSync(thumbDir, { recursive: true });
    let thumbnails: string[] = [];
    try {
      const thumbPattern = path.join(thumbDir, "thumb_%04d.jpg");
      await run("ffmpeg", [
        "-i", videoPath,
        "-vf", "fps=1,scale=120:-1",
        "-q:v", "8",
        "-y", thumbPattern,
      ], 120000);
      const thumbFiles = fs.readdirSync(thumbDir)
        .filter((f) => f.startsWith("thumb_") && f.endsWith(".jpg"))
        .sort();
      thumbnails = thumbFiles.slice(0, 60).map((f) => {
        const buf = fs.readFileSync(path.join(thumbDir, f));
        return `data:image/jpeg;base64,${buf.toString("base64")}`;
      });
    } catch {
      // If thumbnail generation fails, return empty array — not critical
      console.warn("[studio/extract-frames] Thumbnail generation failed");
    }

    const fps = Math.max(thumbnails.length, 1) / Math.max(duration, 1);

    // Analyze video
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysis: any = undefined;
    if (shouldAnalyze) {
      try {
        const systemInstruction = await getActivePrompt("analyze");
        const overrides = systemInstruction ? { systemInstruction } : undefined;
        const provider = getAiProvider();

        if (provider === "claude") {
          // Claude path: extract hi-res frames + audio with ffmpeg, transcribe, then analyze
          // 1. Extract hi-res frames (480px wide) for Claude vision
          const hiResDir = path.join(jobDir, "hires");
          fs.mkdirSync(hiResDir, { recursive: true });
          const hiResPattern = path.join(hiResDir, "frame_%04d.jpg");
          await run("ffmpeg", [
            "-i", videoPath,
            "-vf", `fps=2,scale=480:-1`,
            "-q:v", "4",
            "-y", hiResPattern,
          ], 120000);
          const hiResFiles = fs.readdirSync(hiResDir)
            .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
            .sort()
            .slice(0, 30); // max 30 frames (Claude will sample down to 20)
          const hiResFrames = hiResFiles.map((f) => {
            const buf = fs.readFileSync(path.join(hiResDir, f));
            return buf.toString("base64");
          });
          const hiResFps = Math.max(hiResFrames.length, 1) / Math.max(duration, 1);

          // 2. Extract audio and transcribe with Groq Whisper
          let transcript: string | undefined;
          try {
            const audioPath = path.join(jobDir, "audio.wav");
            await run("ffmpeg", [
              "-i", videoPath,
              "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
              "-t", "90", // cap at 90s
              "-y", audioPath,
            ], 30000);
            if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) {
              transcript = await transcribeAudioFile(audioPath);
            }
          } catch (e) {
            console.warn("[studio/extract-frames] Audio extraction/transcription failed:", e);
          }

          // 3. Analyze with Claude
          analysis = await claudeAnalyze(hiResFrames, hiResFps, duration, undefined, overrides, transcript);
        } else {
          // Gemini path: upload entire video to Gemini File API
          const videoBuffer = fs.readFileSync(videoPath);
          analysis = await analyzeVideoFromBytes(videoBuffer, "video/mp4", overrides);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Analysis failed";
        console.error("[studio/extract-frames] analysis error:", msg);
        return NextResponse.json({
          frames: thumbnails,
          duration,
          format,
          fps,
          analysisError: msg,
        });
      }
    }

    return NextResponse.json({
      frames: thumbnails,
      duration,
      format,
      fps,
      analysis,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Frame extraction failed";
    console.error("[studio/extract-frames]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}
  }
}
