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

    // Transaction: deactivate all of same type, then activate this one
    const [, blueprint] = await prisma.$transaction([
      prisma.promptBlueprint.updateMany({
        where: { type: target.type, isActive: true },
        data: { isActive: false },
      }),
      prisma.promptBlueprint.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    return NextResponse.json({ blueprint });
  } catch (err) {
    console.error("[Blueprints] Activate error:", err);
    return NextResponse.json({ error: "Failed to activate" }, { status: 500 });
  }
}
