/**
 * /api/boards — Board CRUD
 * POST: Create board { name, description?, color?, icon? }
 * GET: List all boards with ad counts
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  try {
    const boards = await prisma.board.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { savedAds: true } },
        savedAds: {
          take: 3,
          orderBy: { savedAt: "desc" },
          include: { ad: { select: { videoUrl: true, brand: true, thumbnailUrl: true } } },
        },
      },
    });

    return NextResponse.json({
      boards: boards.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        color: b.color,
        icon: b.icon,
        adCount: b._count.savedAds,
        previewAds: b.savedAds.map((sa) => ({
          brand: sa.ad.brand,
          videoUrl: sa.ad.videoUrl,
          thumbnailUrl: sa.ad.thumbnailUrl,
        })),
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Boards list error:", err);
    return NextResponse.json({ error: "Failed to load boards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  try {
    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Board name is required" }, { status: 400 });
    }

    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: description || null,
        color: color || "#7F77DD",
        icon: icon || "bookmark",
      },
    });

    return NextResponse.json({ board }, { status: 201 });
  } catch (err) {
    console.error("Board create error:", err);
    return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
  }
}
