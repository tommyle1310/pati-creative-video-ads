/**
 * /api/boards/[boardId]/ads/[savedAdId] — Update/remove a saved ad
 * PATCH: Update notes
 * DELETE: Remove ad from board
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; savedAdId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { savedAdId } = await params;

  try {
    const body = await request.json();
    const savedAd = await prisma.savedAd.update({
      where: { id: savedAdId },
      data: { notes: body.notes ?? null },
    });

    return NextResponse.json({ savedAd });
  } catch (err) {
    console.error("Update saved ad error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string; savedAdId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { savedAdId } = await params;

  try {
    await prisma.savedAd.delete({ where: { id: savedAdId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove saved ad error:", err);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}
