/**
 * GET /api/top-winners — Select top N ads with diversity constraints
 * Query params: n (number of ads, default 5, max 50)
 *
 * Selection algorithm (from winning-video-ads.md Part 6):
 * 1. Hard exclusions (too new, no analysis)
 * 2. Anchor: top 1 per market
 * 3. Pattern diversity fill
 * 4. Score fill with brand cap (max 2/brand) + hook cap (max 40%)
 * 5. Underexploited archetype bonus (if N >= 10)
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

interface AdRow {
  id: string;
  brand: string;
  region: string;
  adScore: number;
  longevityDays: number;
  adIterationCount: number | null;
  hookType: string;
  creativePattern: string;
  primaryAngle: string;
  frameworkName: string;
  hook: string;
  concept: string;
  scriptBreakdown: string;
  visual: string;
  psychology: string;
  cta: string;
  keyTakeaways: string;
  productionFormula: string;
  adLibraryId: string;
  adLibraryUrl: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  videoFormat: string | null;
  landingPageUrl: string;
  foreplayUrl: string;
  impressionsUpper: string | null;
  pageName: string | null;
  adStartDate: string | null;
  isActive: boolean;
  status: string;
}

interface SelectedAd extends AdRow {
  rank: number;
  selectionReason: string;
  isUnderexploitedArchetype: boolean;
  underexploitedNote: string | null;
}

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const n = Math.min(Math.max(parseInt(searchParams.get("n") || "5", 10), 1), 50);

  try {
    // Fetch all ads sorted by adScore DESC
    const allAds = (await prisma.adRecord.findMany({
      orderBy: { adScore: "desc" },
    })) as unknown as AdRow[];

    if (allAds.length === 0) {
      return NextResponse.json({
        selectedAds: [],
        selectionMeta: {
          totalInDb: 0,
          totalEligible: 0,
          requested: n,
          returned: 0,
          marketsRepresented: [],
          patternsRepresented: [],
        },
      });
    }

    // Step 1: Hard exclusions (relaxed for large N to avoid running out of candidates)
    const strictEligible = allAds.filter((ad) => {
      if (!ad.hook && !ad.concept) return false;
      if (ad.longevityDays < 14) return false;
      if ((ad.adIterationCount ?? 1) === 1 && ad.longevityDays < 30) return false;
      return true;
    });

    // If strict filtering leaves fewer than N candidates, relax to just "has analysis"
    const eligible = strictEligible.length >= n
      ? strictEligible
      : allAds.filter((ad) => !!(ad.hook || ad.concept));

    const selected: SelectedAd[] = [];
    const usedIds = new Set<string>();
    const brandCount = new Map<string, number>();

    // Brand cap scales with N: 2 for small selections, more for larger ones
    const maxPerBrand = n <= 10 ? 2 : n <= 20 ? 3 : Math.ceil(n / 8);

    function canSelect(ad: AdRow): boolean {
      if (usedIds.has(ad.adLibraryId)) return false;
      if ((brandCount.get(ad.brand) ?? 0) >= maxPerBrand) return false;
      return true;
    }

    function addAd(ad: AdRow, reason: string, isUnderexploited = false, underNote: string | null = null) {
      if (!canSelect(ad)) return false;
      selected.push({
        ...ad,
        rank: selected.length + 1,
        selectionReason: reason,
        isUnderexploitedArchetype: isUnderexploited,
        underexploitedNote: underNote,
      });
      usedIds.add(ad.adLibraryId);
      brandCount.set(ad.brand, (brandCount.get(ad.brand) ?? 0) + 1);
      return true;
    }

    // Step 2: Anchor — top 1 per market
    const markets = [...new Set(eligible.map((a) => a.region))];
    for (const market of markets) {
      if (selected.length >= n) break;
      const best = eligible.find((a) => a.region === market && canSelect(a));
      if (best) {
        addAd(best, `Top AdScore in ${market} market (anchor)`);
      }
    }

    // Step 3: Pattern diversity fill
    const allPatterns = [
      "Problem-First UGC",
      "Result-First Scroll Stop",
      "Curiosity Gap",
      "Social Proof Cascade",
      "Comparison/Versus",
      "Authority Demo",
    ];
    const representedPatterns = new Set(selected.map((a) => a.creativePattern));
    for (const pattern of allPatterns) {
      if (selected.length >= n) break;
      if (representedPatterns.has(pattern)) continue;
      const best = eligible.find((a) => a.creativePattern === pattern && canSelect(a));
      if (best) {
        addAd(best, `Pattern diversity: best ${pattern}`);
        representedPatterns.add(pattern);
      }
    }

    // Step 4: Score fill with caps
    for (const ad of eligible) {
      if (selected.length >= n) break;
      if (!canSelect(ad)) continue;

      // Hook type cap: max 40% of N from any single hookType
      const hookCounts = new Map<string, number>();
      for (const s of selected) {
        hookCounts.set(s.hookType, (hookCounts.get(s.hookType) ?? 0) + 1);
      }
      const maxHook = Math.ceil(n * 0.4);
      if ((hookCounts.get(ad.hookType) ?? 0) >= maxHook) continue;

      addAd(ad, `High AdScore (${ad.adScore.toFixed(1)}) with brand/hook diversity`);
    }

    // Step 5: Underexploited archetype bonus (if N >= 10)
    if (n >= 10 && selected.length < n) {
      // Find pattern with lowest frequency but highest avg longevity in eligible pool
      const patternStats = new Map<string, { count: number; totalLongevity: number }>();
      for (const ad of eligible) {
        if (!ad.creativePattern || ad.creativePattern === "Unclassifiable") continue;
        const s = patternStats.get(ad.creativePattern) ?? { count: 0, totalLongevity: 0 };
        s.count++;
        s.totalLongevity += ad.longevityDays;
        patternStats.set(ad.creativePattern, s);
      }

      let bestPattern: string | null = null;
      let bestScore = -1;
      for (const [pattern, stats] of patternStats) {
        if (stats.count === 0) continue;
        const avgLongevity = stats.totalLongevity / stats.count;
        // Score = avg longevity / frequency (reward rare + long-running)
        const score = avgLongevity / stats.count;
        if (score > bestScore) {
          bestScore = score;
          bestPattern = pattern;
        }
      }

      if (bestPattern) {
        const alreadyHas = selected.some((s) => s.isUnderexploitedArchetype);
        if (!alreadyHas) {
          const candidate = eligible.find(
            (a) => a.creativePattern === bestPattern && canSelect(a)
          );
          if (candidate) {
            const stats = patternStats.get(bestPattern)!;
            addAd(
              candidate,
              `Underexploited archetype: ${bestPattern}`,
              true,
              `${bestPattern} appears ${stats.count} times in ${eligible.length} eligible ads, avg longevity ${Math.round(stats.totalLongevity / stats.count)} days — rare pattern with strong staying power`
            );
          }
        }
      }
    }

    // Re-number ranks
    selected.forEach((ad, i) => {
      ad.rank = i + 1;
    });

    const finalPatterns = [...new Set(selected.map((a) => a.creativePattern).filter(Boolean))];
    const finalMarkets = [...new Set(selected.map((a) => a.region))];

    return NextResponse.json({
      selectedAds: selected,
      selectionMeta: {
        totalInDb: allAds.length,
        totalEligible: eligible.length,
        requested: n,
        returned: selected.length,
        marketsRepresented: finalMarkets,
        patternsRepresented: finalPatterns,
        exclusionsApplied: allAds.length - eligible.length,
        strictEligible: strictEligible.length,
        maxPerBrand,
      },
    });
  } catch (err) {
    console.error("Top winners error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
