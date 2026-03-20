/**
 * GET /api/ads/compare?ids=cuid1,cuid2,cuid3
 * Returns full AdRecords + computed shared patterns + AI verdict (Haiku).
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

function findSharedPatterns(ads: Array<{
  hookType: string; primaryAngle: string; frameworkName: string;
  creativePattern: string; longevityDays: number; adScore: number;
  durationSeconds: number | null; hook: string; concept: string;
}>) {
  const hookTypes = ads.map((a) => a.hookType).filter(Boolean);
  const angles = ads.map((a) => a.primaryAngle).filter(Boolean);
  const frameworks = ads.map((a) => a.frameworkName).filter(Boolean);
  const patterns = ads.map((a) => a.creativePattern).filter(Boolean);

  const allSame = (arr: string[]) => arr.length > 0 && new Set(arr).size === 1;

  const durations = ads.map((a) => a.durationSeconds).filter((d): d is number => d != null);

  // Extract common keywords from hook + concept
  const allText = ads.map((a) => `${a.hook} ${a.concept}`).join(" ").toLowerCase();
  const words = allText.split(/\W+/).filter((w) => w.length > 4);
  const freq: Record<string, number> = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  const commonKeywords = Object.entries(freq)
    .filter(([, count]) => count >= ads.length)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  return {
    sameHookType: allSame(hookTypes),
    hookType: allSame(hookTypes) ? hookTypes[0] : null,
    sameAngle: allSame(angles),
    angle: allSame(angles) ? angles[0] : null,
    sameFramework: allSame(frameworks),
    framework: allSame(frameworks) ? frameworks[0] : null,
    sameCreativePattern: allSame(patterns),
    creativePattern: allSame(patterns) ? patterns[0] : null,
    averageLongevity: Math.round(ads.reduce((s, a) => s + a.longevityDays, 0) / ads.length),
    averageAdScore: Math.round(ads.reduce((s, a) => s + a.adScore, 0) / ads.length * 10) / 10,
    averageDuration: durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0,
    durationRange: durations.length > 0 ? { min: Math.min(...durations), max: Math.max(...durations) } : { min: 0, max: 0 },
    commonKeywords,
  };
}

async function generateVerdict(ads: Array<{
  brand: string; hookType: string; primaryAngle: string; hook: string;
  concept: string; frameworkName: string; longevityDays: number; adScore: number;
}>): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "AI verdict unavailable (no API key).";

  try {
    const adSummaries = ads.map((a, i) =>
      `Ad ${i + 1} (${a.brand}): hookType=${a.hookType}, angle=${a.primaryAngle}, framework=${a.frameworkName}, longevity=${a.longevityDays}d, score=${a.adScore}`
    ).join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `You are an ad creative strategist. Analyze these ${ads.length} winning ads and state in 2 sentences what pattern they share that makes them winners, and what a competitor should copy. Never use double dashes or em dashes.\n\n${adSummaries}`,
        }],
      }),
    });

    if (!res.ok) return "AI verdict temporarily unavailable.";
    const data = await res.json();
    const text = data.content?.[0]?.text || "No verdict generated.";
    return text.replace(/--|—/g, ", ");
  } catch {
    return "AI verdict temporarily unavailable.";
  }
}

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const idsParam = request.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam.split(",").filter(Boolean).slice(0, 3);

  if (ids.length < 2) {
    return NextResponse.json({ error: "Provide 2-3 ad IDs" }, { status: 400 });
  }

  try {
    const ads = await prisma.adRecord.findMany({
      where: { id: { in: ids } },
    });

    if (ads.length < 2) {
      return NextResponse.json({ error: "Could not find all requested ads" }, { status: 404 });
    }

    const sharedPatterns = findSharedPatterns(ads);
    const verdict = await generateVerdict(ads);

    return NextResponse.json({
      ads,
      sharedPatterns: { ...sharedPatterns, verdict },
    });
  } catch (err) {
    console.error("Compare error:", err);
    return NextResponse.json({ error: "Comparison failed" }, { status: 500 });
  }
}
