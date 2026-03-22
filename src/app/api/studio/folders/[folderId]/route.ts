import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { folderId } = await params;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.parentId !== undefined) data.parentId = body.parentId || null;

    const folder = await prisma.studioFolder.update({
      where: { id: folderId },
      data,
    });

    return NextResponse.json({ folder });
  } catch (err) {
    console.error("Folder update error:", err);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { folderId } = await params;

  try {
    await prisma.studioFolder.delete({ where: { id: folderId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Folder delete error:", err);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
