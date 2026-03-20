/**
 * GET /api/trending — Trending ads leaderboard
 * Computes trending score at query time from data signals.
 * Query params: limit, market, minLongevity, hookType, period
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

function computeTrendingScore(
  ad: {
    longevityDays: number;
    impressionsUpper: string | null;
    adIterationCount: number | null;
    adScore: number;
    adStartDate: string | null;
  },
  maxLongevity: number,
  maxImpressionsMid: number,
  maxIterations: number
): number {
  // Longevity signal (35%)
  const longevityNorm = maxLongevity > 0 ? ad.longevityDays / maxLongevity : 0;

  // Impressions signal (20%)
  const impressionsMid = ad.impressionsUpper ? parseInt(ad.impressionsUpper) * 0.75 : 250000;
  const impressionsNorm = maxImpressionsMid > 0 ? impressionsMid / maxImpressionsMid : 0;

  // Iteration signal (20%)
  const iterations = ad.adIterationCount || 1;
  const iterationsNorm = maxIterations > 0 ? iterations / maxIterations : 0;

  // Recency signal (15%) — linear decay over 180 days
  let recencyBoost = 0.5; // default if no start date
  if (ad.adStartDate) {
    const daysSinceStart = Math.max(0, (Date.now() - new Date(ad.adStartDate).getTime()) / 86400000);
    recencyBoost = Math.max(0, 1 - daysSinceStart / 180);
  }

  // AdScore signal (10%)
  const adScoreNorm = ad.adScore / 10;

  const score =
    Math.min(longevityNorm, 1) * 0.35 +
    Math.min(impressionsNorm, 1) * 0.20 +
    Math.min(iterationsNorm, 1) * 0.20 +
    recencyBoost * 0.15 +
    adScoreNorm * 0.10;

  return Math.round(score * 100) / 10; // 0-10 scale, 1 decimal
}

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10), 200);
  const market = sp.get("market") || "ALL";
  const minLongevity = parseInt(sp.get("minLongevity") || "14", 10);
  const hookType = sp.get("hookType") || "";
  const period = sp.get("period") || "all";

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: "active",
      longevityDays: { gte: minLongevity },
      videoUrl: { not: null },
    };

    if (market !== "ALL") where.region = market;
    if (hookType) where.hookType = { contains: hookType, mode: "insensitive" };

    // Period filter
    if (period !== "all") {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 0;
      if (days > 0) {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        where.crawledAt = { gte: cutoff };
      }
    }

    const ads = await prisma.adRecord.findMany({
      where,
      orderBy: { adScore: "desc" },
      take: 500, // get a big pool to compute trending scores
    });

    if (ads.length === 0) {
      return NextResponse.json({ ads: [], hookTypes: [] });
    }

    // Compute normalization factors
    const maxLongevity = Math.max(...ads.map((a: { longevityDays: number }) => a.longevityDays));
    const maxImpressionsMid = Math.max(
      ...ads.map((a: { impressionsUpper: string | null }) =>
        a.impressionsUpper ? parseInt(a.impressionsUpper) * 0.75 : 250000
      )
    );
    const maxIterations = Math.max(
      ...ads.map((a: { adIterationCount: number | null }) => a.adIterationCount || 1)
    );

    // Score and sort
    const scored = ads
      .map((ad: { longevityDays: number; impressionsUpper: string | null; adIterationCount: number | null; adScore: number; adStartDate: string | null }) => ({
        ...ad,
        trendingScore: computeTrendingScore(ad, maxLongevity, maxImpressionsMid, maxIterations),
      }))
      .sort((a: { trendingScore: number }, b: { trendingScore: number }) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    // Get distinct hook types for filter dropdown
    const hookTypes = await prisma.adRecord.groupBy({
      by: ["hookType"],
      where: { hookType: { not: "" } },
    });

    return NextResponse.json({
      ads: scored,
      hookTypes: hookTypes.map((h: { hookType: string }) => h.hookType).filter(Boolean),
    });
  } catch (err) {
    console.error("Trending query error:", err);
    return NextResponse.json({ error: "Failed to load trending" }, { status: 500 });
  }
}
