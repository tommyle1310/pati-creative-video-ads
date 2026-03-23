/**
 * /api/product-profiles — Save and load product landing page data
 * GET: List all product profiles
 * POST: Create or update a product profile (upsert by name)
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  try {
    const profiles = await prisma.productProfile.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ profiles });
  } catch (err) {
    console.error("Product profiles list error:", err);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  try {
    const body = await request.json();
    const { name, landingPageUrls, bigIdea, productInfo, targetAudience } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const profile = await prisma.productProfile.upsert({
      where: { name: name.trim() },
      create: {
        name: name.trim(),
        landingPageUrls: landingPageUrls || [],
        bigIdea: bigIdea || null,
        productInfo: productInfo || null,
        targetAudience: targetAudience || null,
      },
      update: {
        landingPageUrls: landingPageUrls || [],
        bigIdea: bigIdea || null,
        productInfo: productInfo || null,
        targetAudience: targetAudience || null,
      },
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (err) {
    console.error("Product profile save error:", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
