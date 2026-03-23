import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { seedDefaultsIfNeeded } from "@/lib/studio/blueprints";
import { PROMPT_TYPES } from "@/lib/studio/default-prompts";

// GET /api/studio/blueprints?type=analyze
export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ blueprints: [] });
  }

  try {
    // Lazy seed on first access
    await seedDefaultsIfNeeded();

    const type = req.nextUrl.searchParams.get("type");
    const where = type ? { type } : {};

    const blueprints = await prisma.promptBlueprint.findMany({
      where,
      orderBy: [{ type: "asc" }, { isActive: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        variant: true,
        version: true,
        isDefault: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ blueprints });
  } catch (err) {
    console.error("[Blueprints] GET error:", err);
    return NextResponse.json({ blueprints: [] });
  }
}

// POST /api/studio/blueprints
export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { title, description, content, type, variant } = body;

    if (!title || !content || !type) {
      return NextResponse.json(
        { error: "title, content, and type are required" },
        { status: 400 }
      );
    }

    if (!PROMPT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${PROMPT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const blueprint = await prisma.promptBlueprint.create({
      data: {
        title,
        description: description || null,
        content,
        type,
        variant: variant || "custom",
        version: 1,
        isDefault: false,
        isActive: false,
      },
    });

    return NextResponse.json({ blueprint });
  } catch (err) {
    console.error("[Blueprints] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create blueprint" },
      { status: 500 }
    );
  }
}
