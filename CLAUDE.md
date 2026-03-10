# Project Antigravity — Project Constitution

## Data Schemas

### AdRecord
The canonical output record for every analysed ad. 8 analysis fields + scoring + metadata.

```typescript
interface AdRecord {
  brand: string;
  foreplayUrl: string;
  landingPageUrl: string;
  hook: string;
  concept: string;
  scriptBreakdown: string;
  visual: string;
  psychology: string;
  cta: string;
  keyTakeaways: string;
  productionFormula: string;
  adScore: number;          // 0–10
  longevityDays: number;
  hookType: string;
  primaryAngle: string;
  frameworkName: string;
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
  // New fields (v2)
  adStartDate?: string;       // Raw ISO date from ad_delivery_start_time
  adIterationCount?: number;   // "X ads use this creative and text"
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
  mode: "demo" | "full";
  status: "queued" | "scoring" | "crawling" | "analysing" | "building_excel" | "complete" | "failed";
  progress: number;           // 0–100
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

## Behavioral Rules

1. **Filter Order**: Stage 1 (Metadata + OCR) → Stage 2 (Haiku) → Stage 3 (Sonnet). NEVER skip a stage.
2. **Video Only**: `media_type=video`, `active_status=active` on every Apify/Meta call. No images. No carousels.
3. **Fixed 15 Brands**: Pipeline uses a hardcoded list of 15 target brands (not dynamic discovery). Each brand has a known landing page URL.
4. **Min 5 Ads/Brand**: Each brand MUST have at least 5 video ads. If Apify returns fewer, retry with broader search.
5. **Demo Mode**: 5 ads per brand × 15 brands = 75 total.
6. **Full Mode**: 20 ads per brand × 15 brands = 300 total.
6. **OR Logic**: Stage 1 passes if metadata_pass OR ocr_pass. Not AND.
7. **Delta Crawl**: Check `adLibraryId` uniqueness before any processing.
8. **Foreplay Fallback**: Switch to scraper silently on API failure. Error only if BOTH fail.
9. **Cost Gate**: Haiku ($0.0002) always runs before Sonnet ($0.03).
10. **Meta Rate Limit**: Max 150 calls/hour (safety margin below 200 limit).

## Scoring Formulas

### Competitor Scoring
```
CompetitorScore = (AdCount × 0.30) + (Longevity × 0.35) + (Omnichannel × 0.20) + (MarketFit × 0.15)
```

### Ad Scoring
```
AdScore = (LongevityScore × 0.50) + (ImpressionsScore × 0.30) + (DurationScore × 0.20)
LongevityScore = min(longevityDays / 90, 1.0) × 10
ImpressionsScore = log10(impressions_upper) / log10(10_000_000) × 10
DurationScore = min(durationSeconds / 120, 1.0) × 10
```

## Architectural Invariants

1. Never skip the OCR gate — even if metadata passes, OCR enriches the record.
2. Never exceed 20 relevant ads per brand (100 fetched max).
3. Never write a record to DB without `adScore` computed.
4. Never output an Excel without all 4 tabs.
5. Never commit API keys to version control.
6. Always sort Tab 1 by `adScore` DESC.

## Analysis Quality Rules

- `hook` must contain: named hook TYPE + "Why it stops the scroll" paragraph
- `scriptBreakdown` must contain: named framework + numbered beats with timecodes
- `keyTakeaways` must contain: ≥2 ✅ STEAL + ≥2 🔨 KAIZEN + 1 🚀 UPGRADE with FusiForce implementation
- `productionFormula` must contain: FORMAT line + ≥5 phases + each phase has screen direction + 📝 voiceover + 🖥 TEXT SUPER
- `hookType` and `primaryAngle` must be extracted short strings (not full paragraphs) for Excel filtering

## Target Keywords
```python
TARGET_KEYWORDS = ["creatine", "gummies", "gummy", "crealyte", "gummie"]
EXCLUDE_KEYWORDS = ["protein powder", "pre-workout", "preworkout", "whey", "bcaa"]
```
