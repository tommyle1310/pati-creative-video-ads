import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

// GET /api/studio/blueprints/[id] — full content
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const blueprint = await prisma.promptBlueprint.findUnique({
      where: { id },
    });

    if (!blueprint) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ blueprint });
  } catch (err) {
    console.error("[Blueprints] GET [id] error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PATCH /api/studio/blueprints/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, content, variant } = body;

    const existing = await prisma.promptBlueprint.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Bump version if content changed
    const contentChanged = content !== undefined && content !== existing.content;

    const blueprint = await prisma.promptBlueprint.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(variant !== undefined && { variant }),
        ...(contentChanged && { version: existing.version + 1 }),
      },
    });

    return NextResponse.json({ blueprint });
  } catch (err) {
    console.error("[Blueprints] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/studio/blueprints/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const existing = await prisma.promptBlueprint.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Don't delete the last active blueprint for a type
    if (existing.isActive) {
      return NextResponse.json(
        { error: "Cannot delete the active blueprint. Activate another one first." },
        { status: 400 }
      );
    }

    await prisma.promptBlueprint.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Blueprints] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
