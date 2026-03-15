# Project Antigravity — Project Constitution

## Core Principle
**Data picks the winners. AI describes them. Humans decide what to build.**

Sonnet classifies (hookType, creativePattern, framework) — it NEVER scores creative quality.
Winner detection uses objective data signals: longevity, impressions, iteration count, duration.

## Data Schemas

### AdRecord
The canonical output record for every analysed ad. 8 analysis fields + classification + scoring + metadata.

```typescript
interface AdRecord {
  brand: string;
  foreplayUrl: string;
  landingPageUrl: string;
  // Analysis Fields (8 — rich paragraphs from Sonnet)
  hook: string;
  concept: string;
  scriptBreakdown: string;
  visual: string;
  psychology: string;
  cta: string;
  keyTakeaways: string;
  productionFormula: string;
  // Scoring (data-driven, NOT AI opinion)
  adScore: number;          // 0–10 composite
  longevityDays: number;
  // Classification (Sonnet descriptive, NOT quality score)
  hookType: string;
  primaryAngle: string;
  frameworkName: string;
  creativePattern: string;  // One of: Problem-First UGC | Result-First Scroll Stop | Curiosity Gap | Social Proof Cascade | Comparison/Versus | Authority Demo
  // Crawl Metadata
  adLibraryId: string;
  adLibraryUrl: string;
  region: "US" | "UK" | "AU";
  keyword: string;
  status: "active" | "inactive" | "partial";
  crawledAt: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  videoFormat?: "9:16" | "1:1" | "16:9" | "4:5" | "unknown";
  // V2 fields
  adStartDate?: string;       // Raw ISO date from ad_delivery_start_time
  adIterationCount?: number;   // "X ads use this creative and text" — key scaling signal
  isActive: boolean;           // From Meta Ad Library active status
  impressionsLower?: string;
  impressionsUpper?: string;
  spendLower?: string;
  spendUpper?: string;
  spendCurrency?: string;
  pageId?: string;
  pageName?: string;
}
```

### CompetitorScore
```typescript
interface CompetitorScore {
  brand: string;
  region: "US" | "UK" | "AU";
  adCountScore: number;       // 1–3
  longevityScore: number;     // 1–3
  omnichannelScore: number;   // 1–3
  marketFitScore: number;     // 0–3
  compositeScore: number;     // weighted sum
  activeAdCount: number;
  oldestAdDays: number;
  platforms: string[];
  marketsServed: string[];
}
```

### CrawlJob
```typescript
interface CrawlJob {
  id: string;
  markets: ("US" | "UK" | "AU")[];
  keyword: string;
  yourBrand: string;
  status: "queued" | "scoring" | "crawling" | "analysing" | "building_excel" | "complete" | "failed";
  adsProcessed: number;
  adsTotal: number;
  currentBrand?: string;
  currentRegion?: string;
  excelPath?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}
```

## Pipeline Architecture (v2 — Bulk-First)

```
Phase 1: BULK CRAWL — 1 Apify call per market (3 max, ~10 min)
Phase 2: METADATA FILTER — keyword check on all ads (instant, free)
Phase 3: GROUP BY BRAND — cluster by page_name, enforce diversity (top 20 brands)
Phase 4: PRE-RANK — score by data signals BEFORE any AI (instant)
Phase 5: AI ANALYSIS — Sonnet on top-ranked ads only (~$0.03/ad)
Phase 6: STRATEGIC SUMMARY — pattern aggregation (1 Sonnet call)
```

Key design: Crawl ALL first, then filter/rank/analyze top-down. No Haiku pre-screen (metadata filter after keyword search is sufficient). Pre-rank by AdScore BEFORE Sonnet so best ads get analyzed, not random ones.

## Behavioral Rules

1. **Bulk-First**: Crawl all markets in Phase 1 (1 Apify call per market), then filter/rank/analyze. Never interleave crawl+analyze per brand.
2. **Video Only**: `media_type=video`, `active_status=active` on every Apify/Meta call. No images. No carousels.
3. **Dynamic Brand Discovery**: Pipeline searches by keyword via Apify per market, discovers brands dynamically from results (grouped by `page_name`). 15 known brands serve as FALLBACK if discovery returns too few (<5) brands.
4. **Brand Verification**: Every ad must have a non-empty `page_name`. Reject ads with missing page_name. For fallback brands, additionally check `link_url` domain match OR `page_name` alias match.
5. **Brand Diversity**: Top 20 brands by ad count, top 5 ads per brand by pre-score. Prevents one brand from dominating results.
6. **Pre-Ranking**: All ads get pre-scored by data signals (longevity, impressions, iterations) BEFORE Sonnet. Best ads analyzed first.
7. **No Haiku Stage**: Metadata keyword filter after keyword-targeted Apify search is sufficient. Haiku pre-screen eliminated (saves ~$0.015/crawl + latency).
8. **Delta Crawl**: Check `adLibraryId` uniqueness before any processing.
9. **GSheet Rate Limit**: Max 60 requests/minute. Add sleep(2) between tab operations. Retry with exponential backoff on 429.
10. **AI Never Scores Quality**: Sonnet classifies hookType, creativePattern, framework. It NEVER rates hook effectiveness, retention, or conversion quality. Those signals come from data only.

## Scoring Formulas

### Ad Scoring (Data-Driven)
```
AdScore = (LongevityScore × 0.40) + (ImpressionsScore × 0.25) + (IterationScore × 0.25) + (DurationScore × 0.10)

LongevityScore   = min(longevityDays / 90, 1.0) × 10
ImpressionsScore = log10(impressions_upper) / log10(10_000_000) × 10
IterationScore   = min(adIterationCount / 10, 1.0) × 10
DurationScore    = min(durationSeconds / 120, 1.0) × 10
```

**Why these weights:**
- Longevity (40%): Strongest proxy for ROI. Brand keeps paying = it converts. Caveat: VC-backed brands may run unprofitable ads for awareness — longevity signal is strongest for bootstrapped/performance-focused brands.
- Impressions (25%): Meta's algorithm serves it at scale = it performs. Uses **upper bound** of Meta's impression range (Meta only provides ranges, not exact numbers). Default: 500,000 when data is missing.
- Iteration Count (25%): Brand scaling the creative = proven winner. Most underused signal.
- Duration (10%): Weak signal alone, but validates engagement when combined with longevity.

### Competitor Scoring
```
CompetitorScore = (AdCount × 0.30) + (Longevity × 0.35) + (Omnichannel × 0.20) + (MarketFit × 0.15)
```

## Architectural Invariants

1. Bulk crawl first, analyze later. Never interleave crawl+analyze per brand.
2. Never exceed 5 analyzed ads per brand or 20 brands per crawl.
3. Never write a record to DB without `adScore` computed.
4. Never output a Google Sheet or Excel without all 5 tabs (Tab 5: Strategic Summary is conditional on summary data).
5. Never commit API keys or credentials.json to version control.
6. Always sort Tab 1 by `adScore` DESC.
7. Never have Sonnet score creative quality — classification only.
8. Always pre-rank ads by data signals BEFORE running Sonnet analysis.
9. Reject ads with empty/missing `page_name` — never assume brand identity.

## Analysis Quality Rules

- `hook` must contain: named hook TYPE + "Why it stops the scroll" paragraph
- `scriptBreakdown` must contain: named framework + numbered beats with timecodes
- `keyTakeaways` must contain: ≥2 STEAL + ≥2 KAIZEN + 1 UPGRADE with FusiForce implementation
- `productionFormula` must contain: FORMAT line + ≥5 phases + each phase has screen direction + voiceover + TEXT SUPER
- `hookType` and `primaryAngle` must be extracted short strings (not full paragraphs) for filtering
- `creativePattern` must be EXACTLY one of 7 closed-set values: `Problem-First UGC` | `Result-First Scroll Stop` | `Curiosity Gap` | `Social Proof Cascade` | `Comparison/Versus` | `Authority Demo` | `Unclassifiable` (fallback only). Never invent new categories.
- Top 5 Winners excludes: `longevityDays < 14` OR (`adIterationCount == 1 AND longevityDays < 30`)
- Pattern aggregation (Top 5, strategic summary) runs per-market, not globally

## Target Keywords
```python
TARGET_KEYWORDS = ["creatine", "gummies", "gummy", "crealyte", "gummie"]
EXCLUDE_KEYWORDS = ["protein powder", "pre-workout", "preworkout", "whey", "bcaa"]
```

## Reference Documents
- `SKILL.md` — Full system blueprint (architecture, specs, pipeline flow)
- `BLAST.md` — Protocol + operating principles
- `winning-video-ads.md` — Expert framework for winner identification (7-Signal Scorecard, creative patterns, EDGE brief)
- `task.md` — Project objective and north star
