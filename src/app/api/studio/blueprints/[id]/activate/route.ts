import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

// POST /api/studio/blueprints/[id]/activate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const target = await prisma.promptBlueprint.findUnique({
      where: { id },
      select: { id: true, type: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Deactivate all of same type, then activate this one
    // (individual updates — Neon HTTP adapter doesn't support transactions or updateMany)
    const activeOnes = await prisma.promptBlueprint.findMany({
      where: { type: target.type, isActive: true },
      select: { id: true },
    });
    for (const a of activeOnes) {
      if (a.id !== id) {
        await prisma.promptBlueprint.update({
          where: { id: a.id },
          data: { isActive: false },
        });
      }
    }
    const blueprint = await prisma.promptBlueprint.update({
      where: { id },
      data: { isActive: true },
    });

    return NextResponse.json({ blueprint });
  } catch (err) {
    console.error("[Blueprints] Activate error:", err);
    return NextResponse.json({ error: "Failed to activate" }, { status: 500 });
  }
}
