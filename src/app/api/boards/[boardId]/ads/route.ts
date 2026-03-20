/**
 * /api/boards/[boardId]/ads — Save/list ads in a board
 * POST: Save an ad to board { adId, notes? }
 * GET: List saved ads for this board
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { boardId } = await params;

  try {
    const body = await request.json();
    const { adId, notes } = body;

    if (!adId) {
      return NextResponse.json({ error: "adId is required" }, { status: 400 });
    }

    // Check board exists
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    // Check ad exists
    const ad = await prisma.adRecord.findUnique({ where: { id: adId } });
    if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

    const savedAd = await prisma.savedAd.create({
      data: {
        boardId,
        adId,
        notes: notes || null,
      },
    });

    return NextResponse.json({ savedAd }, { status: 201 });
  } catch (err) {
    // Handle unique constraint violation (already saved)
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Ad already saved to this board" }, { status: 409 });
    }
    console.error("Save ad error:", err);
    return NextResponse.json({ error: "Failed to save ad" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { boardId } = await params;

  try {
    const savedAds = await prisma.savedAd.findMany({
      where: { boardId },
      orderBy: { savedAt: "desc" },
      include: { ad: true },
    });

    return NextResponse.json({ savedAds });
  } catch (err) {
    console.error("List saved ads error:", err);
    return NextResponse.json({ error: "Failed to list saved ads" }, { status: 500 });
  }
}
