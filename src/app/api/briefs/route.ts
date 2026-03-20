/**
 * /api/briefs — Brief generation and listing
 * POST: Generate a new brief (calls Claude Sonnet)
 * GET: List all briefs
 */
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

const SYSTEM_PROMPT = `You are an elite DTC supplement creative strategist.
You work for Wellness Nest, a supplement brand portfolio.

Your job: analyze winning competitor ads and generate an actionable creative brief
that our team can execute TOMORROW to compete and dominate.

BRAND CONTEXT:
- FusiForce: World's first creatine gummies with INDIVIDUAL POUCHES (not jars).
  5g clinical dose per serving. ISO 17025 post-manufacturing lab tested.
  90-day empty-bottle money-back guarantee. Markets: US, UK, AU.
- MenoMate: Menopause support supplement targeting women 45-65 with hip/joint pain.
- FloraFresh: Gut health probiotic supplement.
- Shilajit: Energy/vitality supplement for men 35-55. Available as resin and gummies.

OUTPUT FORMAT: return valid JSON matching this exact structure:
{
  "briefTitle": "string",
  "winningPatternSummary": "string (2-3 sentences)",
  "recommendedFormat": "string (e.g. '9:16 vertical, 60-90s, voiceover-led UGC')",
  "targetAudience": "string",
  "hookApproach": {
    "hookType": "string",
    "hooks": ["string (3 specific hook options)"]
  },
  "messagingAngle": "string",
  "offerStructure": "string",
  "scriptOutline": {
    "phases": [
      {
        "phase": "string (HOOK / AGITATE / REVEAL / PROOF / CTA)",
        "duration": "string (e.g. '0-5s')",
        "direction": "string",
        "textSupers": ["string"]
      }
    ]
  },
  "differentiators": ["string (3-5 items)"],
  "referenceAds": [
    {
      "brand": "string",
      "whatToSteal": "string",
      "whatToImprove": "string"
    }
  ],
  "productionNotes": "string"
}

RULES:
- Every hook option must be specific and ready-to-film, not generic
- Never use "--" (double dashes) or em dashes in any hook or caption text
- Never use generic filler like "game-changer", "revolutionary", "best-in-class"
- Adapt the winning pattern to our product's unique advantages
- Always include our 90-day guarantee (FusiForce) or relevant trust signal
- Script phases should map to specific timecodes
- Differentiators must reference things competitors DON'T have
- Be bold and specific, not safe and generic`;

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const { adIds, targetProduct, targetMarket, additionalContext } = body;

    if (!adIds?.length || !targetProduct || !targetMarket) {
      return NextResponse.json({ error: "adIds, targetProduct, and targetMarket are required" }, { status: 400 });
    }

    // Fetch the reference ads
    const ads = await prisma.adRecord.findMany({
      where: { id: { in: adIds.slice(0, 3) } },
    });

    if (ads.length === 0) {
      return NextResponse.json({ error: "No ads found for the given IDs" }, { status: 404 });
    }

    // Build the user prompt
    const adSummaries = ads.map((ad: {
      brand: string; region: string; adScore: number; longevityDays: number;
      hookType: string; hook: string; primaryAngle: string; frameworkName: string;
      concept: string; keyTakeaways: string; productionFormula: string;
    }, i: number) => `
--- REFERENCE AD ${i + 1} ---
Brand: ${ad.brand}
Market: ${ad.region}
AdScore: ${ad.adScore}
Longevity: ${ad.longevityDays} days
Hook Type: ${ad.hookType}
Hook: ${ad.hook}
Primary Angle: ${ad.primaryAngle}
Framework: ${ad.frameworkName}
Concept: ${ad.concept}
Key Takeaways: ${ad.keyTakeaways}
Production Formula: ${ad.productionFormula}
`).join("\n");

    const userPrompt = `Generate a creative brief for ${targetProduct} in the ${targetMarket} market.

Based on these ${ads.length} winning competitor ad(s):

${adSummaries}

${additionalContext ? `Additional context from user: ${additionalContext}` : ""}

Return ONLY valid JSON matching the specified structure. No markdown, no preamble.`;

    // Call Claude Sonnet
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Claude API error:", errData);
      return NextResponse.json({ error: "Brief generation failed" }, { status: 502 });
    }

    const data = await res.json();
    let briefText = data.content?.[0]?.text || "";

    // Post-process: remove dashes
    briefText = briefText.replace(/--|—/g, ", ");

    // Parse JSON from response
    let briefJson;
    try {
      // Handle potential markdown code blocks
      const jsonMatch = briefText.match(/```(?:json)?\s*([\s\S]*?)```/);
      briefJson = JSON.parse(jsonMatch ? jsonMatch[1] : briefText);
    } catch {
      // If JSON parsing fails, wrap in a simple structure
      briefJson = { briefTitle: "Generated Brief", rawText: briefText };
    }

    // Save to DB
    const brief = await prisma.brief.create({
      data: {
        targetProduct,
        targetMarket,
        basedOnAdIds: adIds,
        briefJson,
        userContext: additionalContext || null,
      },
    });

    return NextResponse.json({
      id: brief.id,
      generatedAt: brief.createdAt,
      basedOnAds: adIds,
      targetProduct,
      targetMarket,
      brief: briefJson,
    }, { status: 201 });
  } catch (err) {
    console.error("Brief generation error:", err);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  try {
    const briefs = await prisma.brief.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ briefs });
  } catch (err) {
    console.error("Briefs list error:", err);
    return NextResponse.json({ error: "Failed to load briefs" }, { status: 500 });
  }
}
