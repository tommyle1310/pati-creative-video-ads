import { NextRequest, NextResponse } from "next/server";
import { uploadMedia } from "@/lib/studio/vidtory";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // FormData upload — accepts raw file, converts to base64 data URL for Vidtory
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const dataUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;
      const url = await uploadMedia(dataUrl);
      return NextResponse.json({ url });
    }

    // Legacy JSON with dataUrl (for small files like images)
    const { dataUrl } = await req.json();
    if (!dataUrl) {
      return NextResponse.json({ error: "Missing dataUrl" }, { status: 400 });
    }
    const url = await uploadMedia(dataUrl);
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
