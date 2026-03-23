import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

// Helper: fetch brand with relations (no transaction needed for findUnique)
async function fetchBrandWithRelations(prisma: NonNullable<ReturnType<typeof getPrisma>>, id: string) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) return null;
  const products = await prisma.product.findMany({ where: { brandId: id } });
  const characters = await prisma.character.findMany({ where: { brandId: id } });
  return { ...brand, products, characters };
}

// GET /api/brand-config — list all brands with products and characters
export async function GET() {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  try {
    const allBrands = await prisma.brand.findMany({ orderBy: { updatedAt: "desc" } });
    const brands = await Promise.all(
      allBrands.map(async (b) => {
        const products = await prisma.product.findMany({ where: { brandId: b.id } });
        const characters = await prisma.character.findMany({ where: { brandId: b.id } });
        return { ...b, products, characters };
      })
    );
    return NextResponse.json({ brands });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

// POST /api/brand-config — create a brand
export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  try {
    const body = await req.json();
    const { name, logoUrl } = body;

    if (!name?.trim())
      return NextResponse.json({ error: "name required" }, { status: 400 });

    // Check if exists first — no upsert (uses transactions)
    const existing = await prisma.brand.findUnique({ where: { name: name.trim() } });
    let brandId: string;
    if (existing) {
      await prisma.brand.update({
        where: { id: existing.id },
        data: { logoUrl: logoUrl || undefined },
      });
      brandId = existing.id;
    } else {
      const created = await prisma.brand.create({
        data: { name: name.trim(), logoUrl: logoUrl || null },
      });
      brandId = created.id;
    }

    // Fetch with relations separately (no transaction)
    const brand = await fetchBrandWithRelations(prisma, brandId);
    return NextResponse.json({ brand });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
