# SKILL.md — Project Antigravity v5.0

**Ad Intelligence Crawler → Forensic Analysis Records → Actionable Excel Intelligence**

Stack: Meta Ad Library API · Foreplay.co API (+ fallback scraper) · Claude Sonnet · Claude Haiku · Whisper · Tesseract OCR · Python · Next.js · PostgreSQL · BullMQ · ExcelJS

---

## 0. BLAST PROTOCOL — MANDATORY EXECUTION ORDER

This system is built under the B.L.A.S.T. protocol. No phase may be skipped.

| Letter | Phase | Description |
|--------|-------|-------------|
| **B** | Blueprint | This SKILL.md IS the Blueprint. Read fully before touching code. |
| **L** | Link | Verify ALL API connections before any crawl logic is written. |
| **A** | Architect | Build in the 3 layers: SOPs (`architecture/`) → Navigation → Tools (`tools/`) |
| **S** | Stylize | Excel output rendered per tab spec before any user sees raw data. |
| **T** | Trigger | BullMQ workers + cron + webhook triggers. Deploy only after S is validated. |

Project Constitution (`claude.md`) must be initialised with:
- Data schemas (`AdRecord`, `CompetitorScore`, `CrawlJob`)
- Behavioral rules (filter logic, capping logic, scoring formulas)
- Architectural invariants (never skip OCR gate, never exceed 20 relevant ads/brand)

---

## 1. SYSTEM OVERVIEW

**One job**: Identify the top 5 highest-performing creatine gummy competitors per market (US/UK/AU), crawl up to 20 relevant video ads per competitor, run forensic AI analysis on each, and deliver a pre-formatted Excel intelligence file that requires zero additional synthesis by the end user.

```
INPUT
  markets:    ["US", "UK", "AU"]
  keyword:    "creatine gummies"
  your_brand: "FusiForce"
  mode:       "demo" (30 ads) | "full" (300 ads)

      │
      ▼

STAGE 0 — COMPETITOR SCORING (Who to crawl)
  Meta Ad Library → Score each brand on 4 criteria
  → Select top 5 per market

      │
      ▼

STAGE 1 — METADATA + OCR GATE (Fast relevance filter)
  → Check Primary Copy + Headline for keywords
  → OCR first frame of each video
  → Reject non-creatine-gummy ads before any transcript/DB cost

      │
      ▼

STAGE 2 — AI PRE-SCREEN (Logic gate)
  → Whisper transcription
  → Claude Haiku: "Is this specifically a creatine gummy ad? Yes/No"
  → Reject No answers. Continue crawling until 20 relevant ads found (Dynamic Cap)

      │
      ▼

STAGE 3 — FULL ANALYSIS (Claude Sonnet)
  → Frames + transcript → full AdRecord (8 fields)

      │
      ▼

OUTPUT
  PostgreSQL: AdRecord[]
  Excel: 4-tab intelligence file
    📋 Ad Intelligence Records
    🎬 Production Formulas
    ⚡ Key Takeaways
    📖 Legend & Instructions
```

---

## 2. COMPETITOR SCORING — HOW TO SELECT TOP 5 PER MARKET

### 2.1 Four Selection Criteria

| Criterion | Definition | Weight | Scoring |
|-----------|-----------|--------|---------|
| Ad Count | Number of currently ACTIVE video ads for keyword | 30% | >20 active = 3pts, 10–20 = 2pts, <10 = 1pt |
| Ad Longevity | Oldest active ad still running (`ad_delivery_start_time`) | 35% | >90 days = 3pts, 30–90 = 2pts, <30 = 1pt |
| Omnichannel | Active on Meta + evidence of TikTok/YouTube presence | 20% | All 3 = 3pts, 2 = 2pts, Meta only = 1pt |
| Market Fit | Ships to / warehouses in ≥2 of US, UK, AU | 15% | 3 markets = 3pts, 2 = 2pts, 1 = 0pts |

```
CompetitorScore = (Ad Count × 0.30) + (Longevity × 0.35) + (Omnichannel × 0.20) + (Market Fit × 0.15)
```

Top 5 brands per market = highest CompetitorScore.

### 2.2 Longevity Signal — The Most Important Metric

Ad Longevity is the single strongest proxy for ROI-positive creative. An ad running for 90+ days means the brand kept paying for it because it converted. Weight it highest (35%). When two brands tie on score, the one with longer-running ads wins.

### 2.3 Omnichannel Detection

- Meta API confirms Meta presence via `publisher_platforms` field
- TikTok/YouTube: web search `"{brand_name}" creatine gummies site:tiktok.com OR site:youtube.com`
- If search returns results = 2pts for that platform

---

## 3. THREE-STAGE FILTERING PIPELINE

### STAGE 1 — METADATA + OCR GATE (The Fast Gate)

**Purpose**: Reject irrelevant ads before any expensive operation (Whisper, Claude, DB write).

#### Step 1A — Text Metadata Check

```python
TARGET_KEYWORDS = ["creatine", "gummies", "gummy", "crealyte", "gummie"]
EXCLUDE_KEYWORDS = ["protein powder", "pre-workout", "preworkout", "whey", "bcaa"]

def passes_metadata_gate(ad: dict) -> bool:
    text = " ".join([
        ad.get("ad_creative_bodies", [""])[0],
        ad.get("ad_creative_link_captions", [""])[0],
        ad.get("ad_creative_link_titles", [""])[0],
    ]).lower()
    has_target = any(kw in text for kw in TARGET_KEYWORDS)
    has_exclude = any(kw in text for kw in EXCLUDE_KEYWORDS)
    return has_target and not has_exclude
```

#### Step 1B — First-Frame OCR

```python
def ocr_first_frame(video_url: str) -> str:
    """Extract text from first frame of video via ffmpeg + Tesseract."""
    # Cost: ~0.1s per ad. Reject rate: ~40-60%

def passes_ocr_gate(video_url: str) -> bool:
    ocr_text = ocr_first_frame(video_url)
    return any(kw in ocr_text for kw in TARGET_KEYWORDS)
```

**Decision Logic**:
- `metadata_pass OR ocr_pass` → proceed to Stage 2
- NEITHER passes → REJECT (do not write to DB, do not transcribe)
- OR logic prevents false negatives

### STAGE 2 — AI PRE-SCREEN (The Logic Gate)

**Purpose**: Confirm the ad is specifically promoting creatine in gummy form.

```python
def passes_ai_prescreen(transcript: str, brand: str) -> bool:
    """Claude Haiku binary check. Cost: ~$0.0002/call."""
    # Prompt: "Is this ad specifically promoting CREATINE in GUMMY form? Yes/No"
    # Run BEFORE Claude Sonnet ($0.03/call) to save cost
```

### STAGE 3 — DYNAMIC CAPPING MECHANISM

**Purpose**: Stop at 20 **relevant** ads, not 20 fetched ads.

```
RELEVANT_CAP = 20    # target per brand
ABSOLUTE_MAX_FETCH = 100   # hard ceiling
Demo: 6 per brand × 5 brands = 30
Full:  20 per brand × 5 brands × 3 markets = 300
```

---

## 4. FOREPLAY API — PRIMARY + FALLBACK

### 4.1 Primary: API Key
- Endpoint: `https://api.foreplay.co/v1`
- Auth: Bearer token from env `FOREPLAY_API_KEY`
- Test connection on startup → if 401/403/429, switch to scraper

### 4.2 Fallback: Playwright Scraper
- Login via email/password (stored in `.env`)
- Navigate share URLs, intercept network for video CDN URLs
- Triggered automatically when API fails

### 4.3 Connection Manager
- Auto-switch between API and scraper
- Silent fallback — no user-facing error unless BOTH fail

---

## 5. FULL AD RECORD — CANONICAL SCHEMA

```typescript
interface AdRecord {
  // Identity
  brand: string;
  foreplayUrl: string;
  landingPageUrl: string;

  // Analysis Fields (8 fields — rich paragraphs)
  hook: string;
  concept: string;
  scriptBreakdown: string;
  visual: string;
  psychology: string;
  cta: string;
  keyTakeaways: string;
  productionFormula: string;

  // Scoring
  adScore: number;        // 0–10 composite
  longevityDays: number;
  hookType: string;       // Extracted for filter
  primaryAngle: string;   // Extracted for filter
  frameworkName: string;   // Extracted for filter

  // Crawl Metadata
  adLibraryId: string;
  adLibraryUrl: string;
  region: "US" | "UK" | "AU";
  keyword: string;
  status: "active" | "inactive" | "partial";
  crawledAt: string;      // ISO 8601
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  videoFormat?: "9:16" | "1:1" | "16:9" | "4:5" | "unknown";
  impressions?: { lower_bound: string; upper_bound: string };
  spend?: { lower_bound: string; upper_bound: string; currency: string };
  pageId?: string;
  pageName?: string;
}
```

---

## 6. AD SCORING FORMULA

```
AdScore = (LongevityScore × 0.50) + (ImpressionsScore × 0.30) + (DurationScore × 0.20)

LongevityScore = min(longevityDays / 90, 1.0) × 10
ImpressionsScore = log10(impressions.upper_bound) / log10(10_000_000) × 10
DurationScore = min(durationSeconds / 120, 1.0) × 10
```

Score range: 0–10. Top-scored ads are surfaced in Tab 1 (📋 Ad Intelligence Records), sorted by adScore DESC.

---

## 7. SYSTEM ARCHITECTURE

```
antigravity/
├── claude.md                    ← Project Constitution
├── .env                         ← All API keys and credentials
├── task_plan.md / findings.md / progress.md
│
├── architecture/                ← Layer 1: SOPs
│   ├── 01-competitor-scoring.md
│   ├── 02-meta-crawl.md
│   ├── 03-foreplay-enrichment.md
│   ├── 04-three-stage-filter.md
│   ├── 05-video-enrichment.md
│   ├── 06-claude-analysis.md
│   ├── 07-scoring.md
│   └── 08-excel-output.md
│
├── tools/                       ← Layer 3: Python scripts
│   ├── competitor_scorer.py
│   ├── meta_crawler.py
│   ├── foreplay_api.py
│   ├── foreplay_scraper.py
│   ├── foreplay_manager.py
│   ├── ocr_gate.py
│   ├── video_enricher.py
│   ├── prescreen.py
│   ├── record_generator.py
│   └── excel_builder.py
│
├── lib/                         ← TypeScript/Next.js layer
│   ├── apis/
│   ├── crawlers/
│   ├── analyzers/
│   ├── queue/
│   └── db/
│
├── app/                         ← Next.js dashboard
│   ├── dashboard/
│   ├── api/
│   └── components/
│
└── .tmp/                        ← Ephemeral workspace
```

---

## 8. EXCEL OUTPUT — 4-TAB INTELLIGENCE FILE

### Visual Design Spec (global)

```
DARK_BG      = "1A1A2E"   # Deep navy
ACCENT_PANEL = "0F3460"   # Midnight blue
ACCENT_GREEN = "00C896"   # Emerald
ROW_ALT      = "F8F9FA"   # Light grey
ROW_WHITE    = "FFFFFF"
BORDER       = "DEE2E6"   # Light grey border
```

Font: Arial throughout. Grid lines: HIDDEN. Freeze panes + auto-filter on all sheets.

### TAB 1 — "📋 Ad Intelligence Records"

**User**: Anyone needing complete forensic analysis.
**13 columns**: # / BRAND / MARKET / AD LINK / LANDING PAGE / HOOK / CONCEPT / SCRIPT BREAKDOWN / VISUAL / PSYCHOLOGY / CTA / KEY TAKEAWAYS / 🎬 PRODUCTION FORMULA
**Row height**: 320. Freeze at D4.

### TAB 2 — "🎬 Production Formulas"

**User**: Creative Strategist / Script Writer / Video Editor
**7 columns**: # / BRAND / MARKET / HOOK TYPE / PRIMARY ANGLE / FRAMEWORK / ⭐ FULL PRODUCTION FORMULA
**Row height**: 280. Freeze at D3.

### TAB 3 — "⚡ Key Takeaways"

**User**: Media Buyer + Creative team
**6 columns**: # / BRAND / MARKET / ✅ STEAL / 🔨 KAIZEN / 🚀 UPGRADE
**Row height**: 220. Freeze at D3.

### TAB 4 — "📖 Legend & Instructions"

**User**: Any new team member. Two-column layout (Label + Description).
**Sections**: HOW TO USE / FIELD DEFINITIONS / AD SCORING / YOUR BRAND

---

## 9–17. Implementation Details

See full implementation code in the respective `tools/` and `lib/` source files.

### Cost Model

| Operation | Demo (30 ads) | Full (300 ads) |
|-----------|---------------|----------------|
| OCR (Tesseract) | ~$0 | ~$0 |
| Whisper | ~$0.18 | ~$1.80 |
| Claude Haiku | $0.006 | ~$0.06 |
| Claude Sonnet | $0.90 | $9.00 |
| **TOTAL** | **~$1.10** | **~$10.86** |

### Non-Negotiable Rules

1. `ad_type: "VIDEO"` hardcoded on every Meta API call
2. Stage 1 → Stage 2 → Stage 3 order is inviolable
3. `hook` must contain named hook TYPE + "Why it stops the scroll"
4. `scriptBreakdown` must contain named framework + numbered beats with timecodes
5. `keyTakeaways` must contain ≥2 ✅ STEAL + ≥2 🔨 KAIZEN + 1 🚀 UPGRADE
6. `productionFormula` must contain FORMAT line + ≥5 phases with all 3 elements
7. `adScore` must be computed before Excel export
8. Delta crawl must check `adLibraryId` uniqueness before processing
9. Foreplay fallback must activate silently
10. `productionFormula` column in Tab 2 must be untruncated

### Demo Mode

```
mode: "demo"  →  1 market × 5 competitors × 6 ads = 30 ads total
mode: "full"  →  3 markets × 5 competitors × 20 ads = 300 ads total
```
