import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

// Helper: fetch brand with relations via separate queries (no transaction)
async function fetchBrandFull(prisma: NonNullable<ReturnType<typeof getPrisma>>, id: string) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) return null;
  const products = await prisma.product.findMany({ where: { brandId: id } });
  const characters = await prisma.character.findMany({ where: { brandId: id } });
  return { ...brand, products, characters };
}

// GET /api/brand-config/:id
export async function GET(_req: NextRequest, ctx: Ctx) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { id } = await ctx.params;
  try {
    const brand = await fetchBrandFull(prisma, id);
    if (!brand)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ brand });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

// PUT /api/brand-config/:id — update brand, sync products/characters
// All individual operations, no transactions
export async function PUT(req: NextRequest, ctx: Ctx) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const { name, logoUrl, products, characters } = body;

    // Update brand itself
    await prisma.brand.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
    });

    // Sync products
    if (Array.isArray(products)) {
      const incomingIds = new Set(
        products.filter((p: { id?: string }) => p.id).map((p: { id: string }) => p.id)
      );

      // Delete removed products one by one
      const existing = await prisma.product.findMany({ where: { brandId: id }, select: { id: true } });
      for (const ep of existing) {
        if (!incomingIds.has(ep.id)) {
          await prisma.product.delete({ where: { id: ep.id } });
        }
      }

      // Create or update each
      for (const p of products) {
        const data = {
          name: p.name || "Untitled",
          landingPageUrls: p.landingPageUrls || [],
          images: p.images || [],
          bigIdea: p.bigIdea || null,
          productInfo: p.productInfo || null,
          targetAudience: p.targetAudience || null,
        };
        if (p.id) {
          await prisma.product.update({ where: { id: p.id }, data });
        } else {
          await prisma.product.create({ data: { brandId: id, ...data } });
        }
      }
    }

    // Sync characters
    if (Array.isArray(characters)) {
      const incomingIds = new Set(
        characters.filter((c: { id?: string }) => c.id).map((c: { id: string }) => c.id)
      );

      const existing = await prisma.character.findMany({ where: { brandId: id }, select: { id: true } });
      for (const ec of existing) {
        if (!incomingIds.has(ec.id)) {
          await prisma.character.delete({ where: { id: ec.id } });
        }
      }

      for (const c of characters) {
        const data = {
          name: c.name || "Untitled",
          description: c.description || null,
          imageUrl: c.imageUrl || null,
          voiceId: c.voiceId || null,
          voiceSource: c.voiceSource || null,
          voiceName: c.voiceName || null,
        };
        if (c.id) {
          await prisma.character.update({ where: { id: c.id }, data });
        } else {
          await prisma.character.create({ data: { brandId: id, ...data } });
        }
      }
    }

    // Fetch updated brand with relations
    const updated = await fetchBrandFull(prisma, id);
    return NextResponse.json({ brand: updated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

// DELETE /api/brand-config/:id — delete children first, then brand
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const prisma = getPrisma();
  if (!prisma)
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { id } = await ctx.params;
  try {
    // Delete children one by one (no deleteMany — uses transactions)
    const products = await prisma.product.findMany({ where: { brandId: id }, select: { id: true } });
    for (const p of products) {
      await prisma.product.delete({ where: { id: p.id } });
    }
    const chars = await prisma.character.findMany({ where: { brandId: id }, select: { id: true } });
    for (const c of chars) {
      await prisma.character.delete({ where: { id: c.id } });
    }
    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
