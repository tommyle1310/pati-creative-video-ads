import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json(
      { error: "Database not available" },
      { status: 503 }
    );

  try {
    const projects = await prisma.studioProject.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        step: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("Studio projects list error:", err);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json(
      { error: "Database not available" },
      { status: 503 }
    );

  try {
    const body = await request.json();
    const { name, step, stateJson } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const project = await prisma.studioProject.create({
      data: {
        name: name.trim(),
        step: step || 1,
        stateJson: stateJson || {},
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("Studio project create error:", err);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
