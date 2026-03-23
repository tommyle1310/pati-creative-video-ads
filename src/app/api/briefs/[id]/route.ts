/**
 * /api/briefs/[id] — Get, update, or delete a single brief
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
    const data: Record<string, unknown> = {};
    if (body.isArchived !== undefined) data.isArchived = body.isArchived;
    if (body.notes !== undefined) data.notes = body.notes;

    const brief = await prisma.brief.update({
      where: { id },
      data,
    });
    return NextResponse.json({ brief });
  } catch (err) {
    console.error("Brief update error:", err);
    return NextResponse.json({ error: "Failed to update brief" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const { id } = await params;

  try {
    await prisma.brief.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Brief delete error:", err);
    return NextResponse.json({ error: "Failed to delete brief" }, { status: 500 });
  }
}
