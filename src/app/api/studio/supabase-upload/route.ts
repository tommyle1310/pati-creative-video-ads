import { NextRequest, NextResponse } from "next/server";
import { supabase, STUDIO_BUCKET } from "@/lib/supabase";

function getExtFromContentType(ct: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };
  return map[ct] || "bin";
}

/**
 * Upload media to Supabase Storage.
 *
 * Accepts either:
 *  - FormData with a "file" field (for blob/local files)
 *  - JSON { url, type } where url is a remote URL to fetch & re-upload
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let buffer: Buffer;
    let mimeType: string;
    let folder: string;

    if (contentType.includes("multipart/form-data")) {
      // FormData upload (source video, etc.)
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const assetType = (formData.get("type") as string) || "misc";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const arrayBuf = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
      mimeType = file.type || "application/octet-stream";
      folder = assetType; // "image", "video", "source"
    } else {
      // JSON upload (fetch remote URL and re-upload)
      const body = await request.json();
      const { url, type } = body;

      if (!url || typeof url !== "string") {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }

      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch: ${res.status}` },
          { status: 502 }
        );
      }

      const arrayBuf = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
      mimeType = res.headers.get("content-type") || "application/octet-stream";
      folder = type || "misc";
    }

    const ext = getExtFromContentType(mimeType);
    const filePath = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STUDIO_BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from(STUDIO_BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (err) {
    console.error("Supabase upload route error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
