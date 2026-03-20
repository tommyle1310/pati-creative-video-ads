/**
 * GET /api/trending — Trending ads leaderboard
 * "Trending" = rising fast recently, NOT all-time best.
 * Rewards velocity (impressions/day, iterations/day) and recency.
 * Query params: limit, market, minLongevity, hookType, period, maxAge
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
  maxImpressionsPerDay: number,
  maxIterationsPerDay: number
): number {
  const days = Math.max(ad.longevityDays, 1);

  // Recency (35%) — how recently the ad started. Linear decay over 365 days.
  // A 2-week-old ad gets ~0.96, a 6-month-old gets ~0.5, a 1-year-old gets ~0.
  let recency = 0.3; // default if no start date
  if (ad.adStartDate) {
    const daysSinceStart = Math.max(0, (Date.now() - new Date(ad.adStartDate).getTime()) / 86400000);
    recency = Math.max(0, 1 - daysSinceStart / 365);
  }

  // Impression velocity (25%) — impressions per day, not raw total.
  // A 30-day ad with 1M impressions beats a 700-day ad with 1M impressions.
  const impressionsMid = ad.impressionsUpper ? parseInt(ad.impressionsUpper) * 0.75 : 250000;
  const impressionsPerDay = impressionsMid / days;
  const impVelocityNorm = maxImpressionsPerDay > 0 ? impressionsPerDay / maxImpressionsPerDay : 0;

  // Iteration velocity (20%) — iterations per day. Scaling signal.
  // Brand duplicating the creative fast = confirmed winner being scaled.
  const iterations = ad.adIterationCount || 1;
  const iterationsPerDay = iterations / days;
  const iterVelocityNorm = maxIterationsPerDay > 0 ? iterationsPerDay / maxIterationsPerDay : 0;

  // Longevity floor (10%) — still alive after some time = not a flop.
  // Caps at 90 days — beyond that, no extra credit for trending.
  const longevityNorm = Math.min(ad.longevityDays / 90, 1);

  // AdScore (10%) — the base data-driven quality score.
  const adScoreNorm = ad.adScore / 10;

  const score =
    recency * 0.35 +
    Math.min(impVelocityNorm, 1) * 0.25 +
    Math.min(iterVelocityNorm, 1) * 0.20 +
    longevityNorm * 0.10 +
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
  // Max age: exclude ancient ads from trending (default 365 days)
  const maxAge = parseInt(sp.get("maxAge") || "365", 10);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: "active",
      longevityDays: { gte: minLongevity, lte: maxAge },
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

    // Compute velocity normalization factors (per-day, not raw totals)
    const maxImpressionsPerDay = Math.max(
      ...ads.map((a: { impressionsUpper: string | null; longevityDays: number }) => {
        const mid = a.impressionsUpper ? parseInt(a.impressionsUpper) * 0.75 : 250000;
        return mid / Math.max(a.longevityDays, 1);
      })
    );
    const maxIterationsPerDay = Math.max(
      ...ads.map((a: { adIterationCount: number | null; longevityDays: number }) =>
        (a.adIterationCount || 1) / Math.max(a.longevityDays, 1)
      )
    );

    // Score and sort
    const scored = ads
      .map((ad: { longevityDays: number; impressionsUpper: string | null; adIterationCount: number | null; adScore: number; adStartDate: string | null }) => ({
        ...ad,
        trendingScore: computeTrendingScore(ad, maxImpressionsPerDay, maxIterationsPerDay),
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
