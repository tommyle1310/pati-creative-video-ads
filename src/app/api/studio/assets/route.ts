import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "image" | "video"
  const folderId = searchParams.get("folderId"); // null = root
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (folderId === "root") {
      where.folderId = null;
    } else if (folderId) {
      where.folderId = folderId;
    }
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [assets, total] = await Promise.all([
      prisma.studioAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          folder: { select: { id: true, name: true, parentId: true } },
        },
      }),
      prisma.studioAsset.count({ where }),
    ]);

    return NextResponse.json({ assets, total });
  } catch (err) {
    console.error("Assets list error:", err);
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "Database not available" }, { status: 503 });

  try {
    const body = await request.json();
    const { type, url, name, folderId, metadata } = body;

    if (!type || !url || !name) {
      return NextResponse.json(
        { error: "type, url, and name are required" },
        { status: 400 }
      );
    }

    const asset = await prisma.studioAsset.create({
      data: {
        type,
        url,
        name: name.trim(),
        folderId: folderId || null,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    console.error("Asset create error:", err);
    return NextResponse.json({ error: "Failed to save asset" }, { status: 500 });
  }
}
