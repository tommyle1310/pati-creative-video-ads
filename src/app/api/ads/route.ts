/**
 * GET /api/ads — Query stored ad records with filtering & sorting
 * Query params:
 *   region, brand, minScore, maxScore, hookType, creativePattern,
 *   minLongevity, maxLongevity, minIterations, maxIterations,
 *   sort (adScore|longevityDays|adIterationCount|durationSeconds), order (asc|desc),
 *   limit, offset
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;

  // Filters
  const region = searchParams.get("region");
  const brand = searchParams.get("brand");
  const minScore = searchParams.get("minScore");
  const maxScore = searchParams.get("maxScore");
  const hookType = searchParams.get("hookType");
  const creativePattern = searchParams.get("creativePattern");
  const minLongevity = searchParams.get("minLongevity");
  const maxLongevity = searchParams.get("maxLongevity");
  const minIterations = searchParams.get("minIterations");
  const maxIterations = searchParams.get("maxIterations");

  // Sort
  const sortField = searchParams.get("sort") || "adScore";
  const sortOrder = searchParams.get("order") || "desc";

  // Pagination
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (region) where.region = region;
    if (brand) where.brand = { contains: brand, mode: "insensitive" };
    if (hookType) where.hookType = { contains: hookType, mode: "insensitive" };
    if (creativePattern) where.creativePattern = creativePattern;

    if (minScore || maxScore) {
      where.adScore = {};
      if (minScore) where.adScore.gte = parseFloat(minScore);
      if (maxScore) where.adScore.lte = parseFloat(maxScore);
    }

    if (minLongevity || maxLongevity) {
      where.longevityDays = {};
      if (minLongevity) where.longevityDays.gte = parseInt(minLongevity);
      if (maxLongevity) where.longevityDays.lte = parseInt(maxLongevity);
    }

    if (minIterations || maxIterations) {
      where.adIterationCount = {};
      if (minIterations) where.adIterationCount.gte = parseInt(minIterations);
      if (maxIterations) where.adIterationCount.lte = parseInt(maxIterations);
    }

    // Validate sort field
    const allowedSorts = ["adScore", "longevityDays", "adIterationCount", "durationSeconds", "brand", "region", "crawledAt"];
    const safeSort = allowedSorts.includes(sortField) ? sortField : "adScore";
    const safeOrder = sortOrder === "asc" ? "asc" : "desc";

    const [ads, total] = await Promise.all([
      prisma.adRecord.findMany({
        where,
        orderBy: { [safeSort]: safeOrder },
        skip: offset,
        take: limit,
      }),
      prisma.adRecord.count({ where }),
    ]);

    // Also get available filter values for the UI
    const [regions, patterns, brands] = await Promise.all([
      prisma.adRecord.groupBy({ by: ["region"] }),
      prisma.adRecord.groupBy({ by: ["creativePattern"] }),
      prisma.adRecord.groupBy({ by: ["brand"] }),
    ]);

    return NextResponse.json({
      ads,
      total,
      limit,
      offset,
      filters: {
        regions: regions.map((r: { region: string }) => r.region),
        patterns: patterns.map((p: { creativePattern: string }) => p.creativePattern).filter(Boolean),
        brands: brands.map((b: { brand: string }) => b.brand),
      },
    });
  } catch (err) {
    console.error("Ads query error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 },
    );
  }
}
