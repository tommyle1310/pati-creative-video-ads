/**
 * POST /api/analyze — Analyze a single ad from URL or uploaded video
 *
 * Body (JSON): { url: string } — Meta Ad Library URL or direct video URL
 * Body (FormData): video file upload
 *
 * Returns: full analysis + transcript
 */
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  let videoUrl = "";
  let adLibraryUrl = "";
  let uploadedFilePath = "";

  try {
    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await request.formData();
      const file = formData.get("video") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No video file provided" }, { status: 400 });
      }

      const tmpDir = path.join(process.cwd(), ".tmp", "analyze");
      fs.mkdirSync(tmpDir, { recursive: true });

      uploadedFilePath = path.join(tmpDir, `upload-${Date.now()}.mp4`);
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(uploadedFilePath, Buffer.from(bytes));
      videoUrl = uploadedFilePath;
    } else {
      // JSON body with URL
      const body = await request.json();
      const url = (body.url || "").trim();
      if (!url) {
        return NextResponse.json({ error: "No URL provided" }, { status: 400 });
      }

      // Detect if it's a Meta Ad Library URL or direct video URL
      if (url.includes("facebook.com/ads/library")) {
        adLibraryUrl = url;
        // Extract ad ID from URL
        const match = url.match(/[?&]id=(\d+)/);
        if (match) {
          adLibraryUrl = url;
        }
      } else {
        videoUrl = url;
      }
    }

    // Run Python analysis script
    const result = await runAnalysis(videoUrl, adLibraryUrl, uploadedFilePath);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Analyze] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  } finally {
    // Clean up uploaded file
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch { /* ignore */ }
    }
  }
}

function runAnalysis(
  videoUrl: string,
  adLibraryUrl: string,
  uploadedFilePath: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const toolsDir = path.join(process.cwd(), "tools");
    const scriptPath = path.join(toolsDir, "analyze_single.py");
    const tmpDir = path.join(process.cwd(), ".tmp", "analyze");

    const args = [scriptPath, "--output-dir", tmpDir];

    if (uploadedFilePath) {
      args.push("--video-file", uploadedFilePath);
    } else if (videoUrl) {
      args.push("--video-url", videoUrl);
    } else if (adLibraryUrl) {
      args.push("--ad-url", adLibraryUrl);
    }

    const proc = spawn("python", args, {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error("[Analyze] stderr:", stderr);
        reject(new Error(`Analysis failed (exit ${code}): ${stderr.slice(-500)}`));
        return;
      }

      try {
        const lines = stdout.trim().split("\n");
        const jsonLine = lines[lines.length - 1];
        const result = JSON.parse(jsonLine);
        resolve(result);
      } catch {
        reject(new Error("Failed to parse analysis output"));
      }
    });

    proc.on("error", (err) => reject(err));

    // 5 minute timeout
    setTimeout(() => {
      proc.kill();
      reject(new Error("Analysis timed out (5 min)"));
    }, 300_000);
  });
}
