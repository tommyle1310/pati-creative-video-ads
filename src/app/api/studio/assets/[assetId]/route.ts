import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { assetId } = await params;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.folderId !== undefined) data.folderId = body.folderId || null;

    const asset = await prisma.studioAsset.update({
      where: { id: assetId },
      data,
    });

    return NextResponse.json({ asset });
  } catch (err) {
    console.error("Asset update error:", err);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { assetId } = await params;

  try {
    await prisma.studioAsset.delete({ where: { id: assetId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Asset delete error:", err);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
