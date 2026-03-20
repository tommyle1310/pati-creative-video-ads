/**
 * /api/boards/[boardId] — Single board operations
 * GET: Board details + all saved ads with full AdRecord data
 * PATCH: Update board name/description/color/icon
 * DELETE: Delete board (cascade deletes SavedAds)
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { boardId } = await params;

  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        savedAds: {
          orderBy: { savedAt: "desc" },
          include: { ad: true },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({ board });
  } catch (err) {
    console.error("Board detail error:", err);
    return NextResponse.json({ error: "Failed to load board" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { boardId } = await params;

  try {
    const body = await request.json();
    const data: Record<string, string> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.color !== undefined) data.color = body.color;
    if (body.icon !== undefined) data.icon = body.icon;

    const board = await prisma.board.update({
      where: { id: boardId },
      data,
    });

    return NextResponse.json({ board });
  } catch (err) {
    console.error("Board update error:", err);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { boardId } = await params;

  try {
    await prisma.board.delete({ where: { id: boardId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Board delete error:", err);
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}
