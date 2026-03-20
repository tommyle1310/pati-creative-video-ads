/**
 * /api/briefs/[id] — Get or archive a single brief
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { id } = await params;

  try {
    const brief = await prisma.brief.findUnique({ where: { id } });
    if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    return NextResponse.json({ brief });
  } catch (err) {
    console.error("Brief fetch error:", err);
    return NextResponse.json({ error: "Failed to load brief" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { id } = await params;

  try {
    const body = await request.json();
    const brief = await prisma.brief.update({
      where: { id },
      data: { isArchived: body.isArchived ?? false },
    });
    return NextResponse.json({ brief });
  } catch (err) {
    console.error("Brief update error:", err);
    return NextResponse.json({ error: "Failed to update brief" }, { status: 500 });
  }
}
