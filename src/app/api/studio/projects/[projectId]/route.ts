import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json(
      { error: "Database not available" },
      { status: 503 }
    );

  const { projectId } = await params;

  try {
    const project = await prisma.studioProject.findUnique({
      where: { id: projectId },
    });
    if (!project)
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );

    return NextResponse.json({ project });
  } catch (err) {
    console.error("Studio project get error:", err);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json(
      { error: "Database not available" },
      { status: 503 }
    );

  const { projectId } = await params;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.step !== undefined) data.step = body.step;
    if (body.stateJson !== undefined) data.stateJson = body.stateJson;

    const project = await prisma.studioProject.update({
      where: { id: projectId },
      data,
    });

    return NextResponse.json({ project });
  } catch (err) {
    console.error("Studio project update error:", err);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json(
      { error: "Database not available" },
      { status: 503 }
    );

  const { projectId } = await params;

  try {
    await prisma.studioProject.delete({ where: { id: projectId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Studio project delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
