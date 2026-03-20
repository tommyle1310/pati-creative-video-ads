/**
 * GET /api/brands?q={partial_name}
 * Brand autocomplete — returns distinct brands with ad counts.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const q = request.nextUrl.searchParams.get("q") || "";

  try {
    // Get all ads matching the query, grouped by brand + pageName + region
    const where = q
      ? {
          OR: [
            { brand: { contains: q, mode: "insensitive" as const } },
            { pageName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const results = await prisma.adRecord.groupBy({
      by: ["brand", "pageName", "region"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const brands = results.map((r: { brand: string; pageName: string | null; region: string; _count: { id: number } }) => ({
      brand: r.brand,
      pageName: r.pageName,
      market: r.region,
      adCount: r._count.id,
    }));

    return NextResponse.json({ brands });
  } catch (err) {
    console.error("Brand autocomplete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}
