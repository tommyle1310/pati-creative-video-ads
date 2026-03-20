/**
 * GET /api/video-proxy?url={encoded_fbcdn_url}
 * Proxies fbcdn video URLs to avoid CORS issues.
 * Validates URL, streams response with correct Content-Type.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate it's a Facebook CDN video URL
  try {
    const parsed = new URL(url);
    const isValid =
      parsed.protocol === "https:" &&
      (parsed.hostname.includes("fbcdn.net") ||
        parsed.hostname.includes("facebook.com") ||
        parsed.hostname.includes("fb.com"));
    if (!isValid) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Malformed URL" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      const status = response.status === 403 || response.status === 410 ? 410 : response.status;
      return NextResponse.json(
        { error: "Video unavailable or expired" },
        { status }
      );
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const body = response.body;

    if (!body) {
      return NextResponse.json({ error: "Empty response from video server" }, { status: 502 });
    }

    return new NextResponse(body as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Video proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 502 }
    );
  }
}
