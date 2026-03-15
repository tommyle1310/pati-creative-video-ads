# SKILL.md — Project Antigravity v6.0

**Competitive Ad Intelligence Tool → Data-Driven Winner Detection → Google Sheet Intelligence**

Stack: Meta Ad Library (via Apify) · Claude Sonnet · Python · Next.js · Neon PostgreSQL · Google Sheets · openpyxl

---

## 0. BLAST PROTOCOL — MANDATORY EXECUTION ORDER

This system is built under the B.L.A.S.T. protocol. No phase may be skipped.

| Letter | Phase | Description |
|--------|-------|-------------|
| **B** | Blueprint | This SKILL.md IS the Blueprint. Read fully before touching code. |
| **L** | Link | Verify ALL API connections before any crawl logic is written. |
| **A** | Architect | Build in the 3 layers: SOPs (`architecture/`) → Navigation → Tools (`tools/`) |
| **S** | Stylize | Google Sheet output rendered per tab spec before any user sees raw data. |
| **T** | Trigger | Deployment to production. Deploy only after S is validated. |

Project Constitution (`CLAUDE.md`) must contain:
- Data schemas (`AdRecord`, `CompetitorScore`, `CrawlJob`)
- Behavioral rules (filter logic, capping logic, scoring formulas)
- Architectural invariants (never skip OCR gate, never exceed 20 relevant ads/brand)

---

## 1. SYSTEM OVERVIEW

**North Star**: Identify the most successful creatine gummy competitor ads across US/UK/AU markets using **data-driven signals** (longevity, impressions, iteration count), run forensic AI analysis on each, and deliver a ready-to-act Google Sheet — so FusiForce's creative team can 10x their ad performance by studying what actually works.

**Key Principle**: Data picks the winners. AI describes them. Humans decide what to build.

```
INPUT
  markets:    ["US", "UK", "AU"]   ← user selects on dashboard
  keyword:    "creatine gummies"
  your_brand: "FusiForce"

      │
      ▼

BULK-FIRST PIPELINE (v2)
  Phase 1: BULK CRAWL — 1 Apify call per market (3 max, ~10 min)
  Phase 2: METADATA FILTER — keyword check on all ads (instant, free)
  Phase 3: GROUP BY BRAND — cluster by page_name, enforce diversity (top 20)
  Phase 4: PRE-RANK — score by data signals BEFORE AI (instant)
  Phase 5: AI ANALYSIS — Sonnet on top-ranked ads only (~$0.03/ad)
  Phase 6: STRATEGIC SUMMARY — pattern aggregation (1 Sonnet call)
  → Save to DB + Google Sheet on complete

      │
      ▼

OUTPUT
  Neon PostgreSQL: AdRecord[] (source of truth)
  Google Sheet: 5-tab intelligence file (primary output)
    📋 Ad Intelligence Records (32 columns, sorted by AdScore DESC)
    🎬 Production Formulas (phase-by-phase shoot briefs)
    ⚡ Key Takeaways (STEAL / KAIZEN / UPGRADE)
    📖 Legend & Instructions
    🏆 Strategic Summary (dominant patterns, top 5, recommendations)
  Excel: .xlsx backup (same 5 tabs, styled with openpyxl)
```

---

## 2. DYNAMIC BRAND DISCOVERY

Pipeline searches keyword broadly via Apify per market → discovers brands dynamically by grouping on `page_name`. Most active brands (by ad count) are processed first.

- **Primary**: Keyword search returns all matching ads, grouped by page_name
- **Fallback**: 15 known brands (`FALLBACK_BRANDS` in pipeline.py) supplement discovery if too few brands found (<5)
- **Diversity**: Top 20 brands by ad count, top 5 ads per brand by pre-score
- This approach finds NEW competitors automatically — not just the ones we already know about

**Brand Verification** (for fallback brands only):
1. Check ad's `link_url` against brand's known `landing_page` domain (strongest signal)
2. Check ad's `page_name` against brand name + aliases (fuzzy match)
3. If neither matches → reject the ad

---

## 3. BULK-FIRST PIPELINE (v2)

### Architecture
```
Phase 1: BULK CRAWL    — 1 Apify call per market (3 max, ~10 min total)
Phase 2: METADATA FILTER — keyword check on all ads (instant, free)
Phase 3: GROUP BY BRAND — cluster by page_name, enforce diversity
Phase 4: PRE-RANK      — score by data signals BEFORE AI (instant)
Phase 5: AI ANALYSIS   — Sonnet on top-ranked ads only (~$0.03/ad)
Phase 6: SUMMARY       — pattern aggregation (1 Sonnet call)
```

### Phase 1 — BULK CRAWL
One Apify call per market returns ~100-200 ads each. Total: 3 calls for US/UK/AU (~10 min).

### Phase 2 — METADATA FILTER (Free, instant)
- Check ad text for target keywords (`creatine, gummies, gummy, crealyte, gummie`)
- Reject if exclude keywords found (`protein powder, pre-workout, whey, bcaa`)
- Require non-empty `page_name` (brand identity)
- Require video URL
- No Haiku pre-screen — metadata filter after keyword search is sufficient

### Phase 3 — GROUP BY BRAND
- Cluster by `page_name` (case-insensitive)
- Sort brands by ad count DESC (most active first)
- If <5 brands discovered, supplement with FALLBACK_BRANDS (targeted Apify search)
- Cap at 20 brands max

### Phase 4 — PRE-RANK (Data-driven, no AI)
- Compute lightweight AdScore using raw metadata (longevity, impressions, iterations)
- For each brand, pick top 5 ads by pre-score
- Sort entire queue by pre-score DESC — best ads analyzed first

### Phase 5 — SONNET FULL ANALYSIS (~$0.03/ad)

**Purpose**: Produce 8-field forensic breakdown + classify creative pattern.

Sonnet receives: transcript + first frame image + metadata. Produces structured JSON:
- `hook` — Named hook TYPE + "Why it stops the scroll" (psychological mechanism)
- `concept` — Big Idea + strategic architecture + secondary angles
- `scriptBreakdown` — Named framework + numbered beats with timecodes
- `visual` — A-Roll / B-Roll / C-Roll breakdown
- `psychology` — Cognitive biases triggered + regional resonance
- `cta` — Mechanism + offer + landing page job
- `keyTakeaways` — ≥2 STEAL + ≥2 KAIZEN + 1 UPGRADE (all reference FusiForce)
- `productionFormula` — FORMAT + 5 phases, each with screen direction + voiceover + TEXT SUPER

**Sonnet also classifies** (descriptive, NOT scoring):
- `hookType` — short string for filtering (e.g., "Problem-Curiosity Hook")
- `primaryAngle` — short string (e.g., "Taste-first positioning")
- `frameworkName` — short string (e.g., "PAS Compression")
- `creativePattern` — **MUST be exactly one of**: `Problem-First UGC` | `Result-First Scroll Stop` | `Curiosity Gap` | `Social Proof Cascade` | `Comparison/Versus` | `Authority Demo`

**IMPORTANT**: Sonnet NEVER scores quality. It classifies and describes. Winner detection comes from data signals only.

---

## 4. AD SCORING — DATA-DRIVEN WINNER DETECTION

```
AdScore = (LongevityScore × 0.40) + (ImpressionsScore × 0.25) + (IterationScore × 0.25) + (DurationScore × 0.10)

LongevityScore   = min(longevityDays / 90, 1.0) × 10
ImpressionsScore = log10(impressions_upper) / log10(10_000_000) × 10
IterationScore   = min(adIterationCount / 10, 1.0) × 10
DurationScore    = min(durationSeconds / 120, 1.0) × 10
```

Score range: 0–10. Sorted DESC in Google Sheet Tab 1.

**Why these signals work:**
- **Longevity (40%)**: Ad running 90+ days = brand keeps paying = it converts. Strongest proxy for ROI.
- **Impressions (25%)**: More impressions = Meta's algorithm serves it = it performs.
- **Iteration Count (25%)**: Brand duplicating/scaling a creative = proven winner. Most underused signal.
- **Duration (10%)**: Longer ads that stay live = viewers watch through = engagement.

### Minimum Data Threshold (Top 5 Winners only)
All ads get scored and appear in Tab 1 (nothing is hidden). But for **Top 5 Winners ranking**, exclude ads that are too new to judge:
- `longevityDays < 14` → exclude from Top 5 (still in testing phase)
- `adIterationCount == 1 AND longevityDays < 30` → exclude from Top 5 (single test, not yet validated)

These ads still appear in the full sheet — the creative team might spot something early. But they don't compete for Top 5 until the data proves they're real performers.

### Market-Specific Patterns
Pattern aggregation (Top 5 Winners, strategic summary) MUST run **per market**, not globally. A winning hook type in the US gym-bro market may fail in the AU women's wellness market. Google Sheet Tab 1 has a MARKET column for filtering.

---

## 5. DASHBOARD

### Start Crawl
- User selects markets (US/UK/AU toggle buttons)
- Single "Start Crawl" button → toggles to "Stop Crawl" during pipeline
- No mode selector (demo/full removed)
- Default: 5 ads per brand

### Live Progress
- Replaces progress bar with **activity feed**: current brand, current stage, ads processed count
- No percentage (misleading when brand count varies)

### Intelligence Data
- "Open Google Sheet" link (fixed URL)
- "Re-sync Sheet" button (clears + rewrites all data tabs from DB)

### Top Winners Intelligence
- Slider (3–20) + "Find Top N Winners" button
- Queries `/api/top-winners?n=N` with diversity-constrained selection algorithm
- Displays: rank, brand, market, pattern badge, AdScore, quick stats
- Expandable cards: hook analysis, concept, script, visual, psychology, CTA, takeaways, production formula
- Diversity constraints: max 2/brand, max 40% one hookType, 1+ per market, pattern diversity fill
- Underexploited archetype bonus (N ≥ 10): rare pattern with strongest longevity = moat opportunity

### Stop Crawl
- Kills Python process immediately
- Keeps all records saved so far (incremental saves after each brand)
- Job marked as "complete" with partial data

---

## 6. GOOGLE SHEET — PRIMARY OUTPUT

**Sheet**: "Antigravity Intelligence" (fixed, reused — service account Drive quota is full)
**URL**: `https://docs.google.com/spreadsheets/d/1UIFNVFXM67OOfUMZDJUCUv1YjGC9myTKyN6QL8qbLFo`

### Sync Strategy
- During crawl: sync every 3 brands + final brand
- Uses batch operations: `clear()` → `update([headers + all_rows])` → `freeze()` per tab
- Rate limit: 60 requests/min. Add `time.sleep(2)` between tab operations.
- Retry with exponential backoff on 429 errors (20s, 40s, 80s)

### Tab 1 — "Ad Intelligence Records" (32 columns)
Sorted by AdScore DESC. All metadata + analysis fields. Hyperlinked ad/landing page URLs.

### Tab 2 — "Production Formulas" (7 columns)
Hook Type, Primary Angle, Framework, Full Production Formula. Filter by hook type to find patterns.

### Tab 3 — "Key Takeaways" (6 columns)
STEAL / KAIZEN / UPGRADE pre-parsed from keyTakeaways field.

### Tab 4 — "Legend & Instructions"
Field definitions, scoring explanation, brand context.

---

## 7. SYSTEM ARCHITECTURE

```
antigravity/
├── CLAUDE.md                    ← Project Constitution (schemas + rules)
├── SKILL.md                     ← This file (blueprint)
├── BLAST.md                     ← Protocol + principles
├── winning-video-ads.md         ← Expert framework for winner identification
├── .env                         ← API keys (NEVER commit)
├── credentials.json             ← Google service account (NEVER commit)
├── task_plan.md / findings.md / progress.md
│
├── tools/                       ← Layer 3: Python scripts
│   ├── pipeline.py              ← Main orchestrator (incremental saves, delta crawl, GSheet sync)
│   ├── apify_crawler.py         ← Apify actor for Meta Ad Library search
│   ├── ocr_gate.py              ← Stage 1: Metadata + Tesseract OCR
│   ├── video_enricher.py        ← Download + FFmpeg + faster-whisper transcription
│   ├── prescreen.py             ← Stage 2: Claude Haiku binary filter
│   ├── record_generator.py      ← Stage 3: Claude Sonnet analysis + scoring
│   ├── gsheet_writer.py         ← Google Sheets writer (5-tab, dedup by adLibraryId)
│   └── excel_builder.py         ← 5-tab Excel output (openpyxl)
│
├── src/                         ← Next.js dashboard + API
│   ├── app/
│   │   ├── dashboard/page.tsx   ← Main dashboard UI
│   │   ├── api/crawl/route.ts   ← POST start crawl, GET poll status
│   │   ├── api/resync/route.ts  ← POST re-sync DB → Google Sheet
│   │   └── api/export/route.ts  ← GET xlsx download or sheet URL
│   ├── components/
│   │   ├── CrawlLauncher.tsx
│   │   └── CrawlProgress.tsx
│   └── lib/db/prisma.ts
│
├── prisma/schema.prisma         ← DB schema (Neon PostgreSQL)
├── data/                        ← Excel output files
└── .tmp/                        ← Ephemeral workspace (job data, skip lists)
```

---

## 8. COST MODEL

| Operation | Per Ad | 75 ads (20 brands × ~5) |
|-----------|--------|------------------------|
| Apify crawl (3 calls) | ~$0.005 | ~$0.38 |
| Metadata filter | $0 | $0 |
| Claude Sonnet | $0.03 | $2.25 |
| Strategic summary | $0.03 | $0.03 |
| Google Sheet sync | $0 | $0 |
| **TOTAL** | | **~$2.66** |

Bulk-first architecture means Sonnet only runs on pre-ranked top ads (best ROI per dollar spent).

---

## 9. NON-NEGOTIABLE RULES

1. `media_type=video`, `active_status=active` on every Apify/Meta call. No images. No carousels.
2. Bulk-first: Crawl ALL markets first, then filter/rank/analyze. Never interleave crawl+analyze per brand.
3. Pre-rank ads by data signals BEFORE running Sonnet analysis. Best ads analyzed first.
4. Reject ads with empty/missing `page_name` — never assume brand identity.
5. `hook` must contain: named hook TYPE + "Why it stops the scroll" paragraph.
6. `scriptBreakdown` must contain: named framework + numbered beats with timecodes.
7. `keyTakeaways` must contain: ≥2 STEAL + ≥2 KAIZEN + 1 UPGRADE with FusiForce implementation.
8. `productionFormula` must contain: FORMAT line + ≥5 phases + each phase has direction + voiceover + TEXT SUPER.
9. `hookType` and `primaryAngle` must be short strings (not full paragraphs) for filtering.
10. `adScore` must be computed before any output. No unscored records.
11. Delta crawl must check `adLibraryId` uniqueness before processing.
12. Never exceed 5 analyzed ads per brand or 20 brands per crawl.
13. Google Sheet Tab 1 must be sorted by `adScore` DESC.
14. Never commit API keys or credentials.json to version control.
15. **Sonnet classifies creative patterns — it NEVER scores quality.** Winner detection is data-driven only.
16. AdScore formula: Longevity 40% + Impressions 25% + Iterations 25% + Duration 10%.
17. Top Winners selection uses diversity constraints: max 2/brand, max 40% one hookType, 1+ per market.

---

## 10. DELTA CRAWL

When crawling again after a previous run:
1. Before pipeline starts: query DB for all existing `adLibraryId` values → write to skip list file
2. Pipeline reads skip list → skips any ad already in DB
3. Only new ads go through Stage 1→2→3 → saves AI cost
4. Google Sheet gets cleared + rewritten with ALL records (old + new) sorted by AdScore

---

## 11. IMPLEMENTED FEATURES

### Top Winners Intelligence ✅
- Dashboard section with slider (3–20) + button
- `/api/top-winners` route with diversity-constrained selection algorithm
- Expandable cards with all 8 analysis fields + scoring + metadata
- See `winning-video-ads.md` Part 6 for full algorithm specification

### Strategic Summary ✅
- Pattern aggregation after all ads collected (1 Sonnet call)
- Displayed on dashboard (collapsible) + Google Sheet Tab 5

### GSheet Optimization ✅
- Batch API calls + sleep(2) between tabs
- Threading lock to prevent concurrent sync conflicts

## 12. PLANNED UPGRADES

### Continue Crawling
- Crawl additional markets/keywords to build larger dataset
- Delta crawl ensures no duplicate processing

### Enhanced Top Winners
- Sonnet-powered curation call for N > 10 (strategic narrative per ad)
- Export Top N selection to dedicated Google Sheet tab
