import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
  _count: { assets: number };
}

function buildTree(
  folders: { id: string; name: string; parentId: string | null; _count: { assets: number } }[]
): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function GET() {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "Database not available" }, { status: 503 });

  try {
    const folders = await prisma.studioFolder.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { assets: true } } },
    });

    const tree = buildTree(folders);
    return NextResponse.json({ folders, tree });
  } catch (err) {
    console.error("Folders list error:", err);
    return NextResponse.json({ error: "Failed to load folders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "Database not available" }, { status: 503 });

  try {
    const body = await request.json();
    const { name, parentId } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    const folder = await prisma.studioFolder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    console.error("Folder create error:", err);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
