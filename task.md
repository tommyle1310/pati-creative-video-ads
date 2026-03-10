here the suggested skill.md SKILL.md — Project Antigravity v5.0
Ad Intelligence Crawler → Forensic Analysis Records → Actionable Excel Intelligence
Stack: Meta Ad Library API · Foreplay.co API (+ fallback scraper) · Claude Sonnet · Claude Haiku · Whisper · Tesseract OCR · Python · Next.js · PostgreSQL · BullMQ · ExcelJS

0. BLAST PROTOCOL — MANDATORY EXECUTION ORDER
This system is built under the B.L.A.S.T. protocol. No phase may be skipped.
B — Blueprint    → This SKILL.md IS the Blueprint. Read fully before touching code.
L — Link         → Verify ALL API connections before any crawl logic is written.
A — Architect    → Build in the 3 layers: SOPs (architecture/) → Navigation → Tools (tools/)
S — Stylize      → Excel output rendered per tab spec before any user sees raw data.
T — Trigger      → BullMQ workers + cron + webhook triggers. Deploy only after S is validated.
Project Constitution (claude.md) must be initialised with:

Data schemas (AdRecord, CompetitorScore, CrawlJob)
Behavioral rules (filter logic, capping logic, scoring formulas)
Architectural invariants (never skip OCR gate, never exceed 20 relevant ads/brand)


1. SYSTEM OVERVIEW
One job: Identify the top 5 highest-performing creatine gummy competitors per market (US/UK/AU), crawl up to 20 relevant video ads per competitor, run forensic AI analysis on each, and deliver a pre-formatted Excel intelligence file that requires zero additional synthesis by the end user.
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
  Excel: 4-tab intelligence file (Ad Intelligence Records / Production Formulas / Key Takeaways / Legend & Instructions)

2. COMPETITOR SCORING — HOW TO SELECT TOP 5 PER MARKET
Before crawling any videos, run the competitor scoring pass. This determines WHO gets analysed.
2.1 Four Selection Criteria
CriterionDefinitionWeightScoringAd CountNumber of currently ACTIVE video ads for keyword30%>20 active = 3pts, 10–20 = 2pts, <10 = 1ptAd LongevityOldest active ad still running (ad_delivery_start_time)35%>90 days = 3pts, 30–90 = 2pts, <30 = 1ptOmnichannelActive on Meta + evidence of TikTok/YouTube presence20%All 3 = 3pts, 2 = 2pts, Meta only = 1ptMarket FitShips to / warehouses in ≥2 of US, UK, AU15%3 markets = 3pts, 2 = 2pts, 1 = 0pts
CompetitorScore = (Ad Count × 0.30) + (Longevity × 0.35) + (Omnichannel × 0.20) + (Market Fit × 0.15)
Top 5 brands per market = highest CompetitorScore.
2.2 Longevity Signal — The Most Important Metric
Ad Longevity is the single strongest proxy for ROI-positive creative. An ad running for 90+ days means the brand kept paying for it because it converted. Weight it highest (35%). When two brands tie on score, the one with longer-running ads wins.
2.3 Omnichannel Detection
Meta API confirms Meta presence. For TikTok/YouTube:

Check publisher_platforms field in Meta API response (Facebook, Instagram, Audience Network, Messenger)
Supplement with a web search: "{brand_name}" creatine gummies site:tiktok.com OR site:youtube.com
If search returns results = 2pts for that platform. Manual, but sufficient for scoring.


3. THREE-STAGE FILTERING PIPELINE
STAGE 1 — METADATA + OCR GATE (The Fast Gate)
Purpose: Reject irrelevant ads before any expensive operation (Whisper, Claude, DB write).
Step 1A — Text Metadata Check
pythonTARGET_KEYWORDS = ["creatine", "gummies", "gummy", "crealyte", "gummie"]
EXCLUDE_KEYWORDS = ["protein powder", "pre-workout", "preworkout", "whey", "bcaa"]

def passes_metadata_gate(ad: MetaAdRaw) -> bool:
    text = " ".join([
        ad.get("ad_creative_bodies", [""])[0],
        ad.get("ad_creative_link_captions", [""])[0],
        ad.get("ad_creative_link_titles", [""])[0],
    ]).lower()

    has_target = any(kw in text for kw in TARGET_KEYWORDS)
    has_exclude = any(kw in text for kw in EXCLUDE_KEYWORDS)

    return has_target and not has_exclude
Step 1B — First-Frame OCR
python# lib/enrichment/ocr_gate.py
# Extract ONLY frame 0 (first frame). Do NOT download full video.
# Use ffmpeg to grab thumbnail from ad_snapshot_url iframe.
# Run Tesseract on the frame.
# Check for target keywords in OCR output.
# Cost: ~0.1s per ad. Reject rate: ~40-60% of non-relevant ads.

import pytesseract
from PIL import Image
import subprocess, tempfile, os

def ocr_first_frame(video_url: str) -> str:
    """Extract text from first frame of video. Returns OCR text string."""
    with tempfile.TemporaryDirectory() as tmpdir:
        frame_path = os.path.join(tmpdir, "frame0.png")
        result = subprocess.run([
            "ffmpeg", "-i", video_url,
            "-vframes", "1",
            "-q:v", "2",
            "-y", frame_path
        ], capture_output=True, timeout=15)

        if result.returncode != 0 or not os.path.exists(frame_path):
            return ""

        img = Image.open(frame_path)
        return pytesseract.image_to_string(img).lower()

def passes_ocr_gate(video_url: str) -> bool:
    ocr_text = ocr_first_frame(video_url)
    return any(kw in ocr_text for kw in TARGET_KEYWORDS)
Stage 1 Decision Logic:
metadata_pass = passes_metadata_gate(ad)
ocr_pass = passes_ocr_gate(foreplay_ad.videoUrl)

if metadata_pass OR ocr_pass → proceed to Stage 2
if NEITHER passes → REJECT. Do not write to DB. Do not transcribe.
Rationale: OR logic (not AND) prevents false negatives. An ad that has no text copy but shows "CREATINE GUMMIES" in the video frame should not be rejected by the metadata gate alone.

STAGE 2 — AI PRE-SCREEN (The Logic Gate)
Purpose: After Whisper transcription, confirm the ad is specifically promoting creatine in gummy form — not creatine powder, not general gummy vitamins.
python# lib/analyzers/prescreen.py

import anthropic
client = anthropic.Anthropic()

def passes_ai_prescreen(transcript: str, brand: str) -> bool:
    """
    Uses Claude Haiku (cheapest model) for binary relevance check.
    Cost per call: ~$0.0002. Run this BEFORE Claude Sonnet analysis ($0.03/call).
    """
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=5,
        messages=[{
            "role": "user",
            "content": f"""Video ad transcript from brand "{brand}":

"{transcript[:800]}"

Is this ad specifically promoting CREATINE in GUMMY form (not powder, not capsules, not other supplements)?
Answer ONLY: Yes or No"""
        }]
    )

    answer = response.content[0].text.strip().lower()
    return answer.startswith("yes")
Cost comparison:

Claude Haiku pre-screen: ~$0.0002 per ad
Claude Sonnet full analysis: ~$0.03 per ad
Haiku saves ~$0.03 for every rejected ad. At 40% rejection rate across 300 ads = ~$3.60 saved + latency saved.


STAGE 3 — DYNAMIC CAPPING MECHANISM
Purpose: Do not stop at 20 fetched ads. Stop at 20 relevant ads. Keep crawling until quota is met or brand's ad inventory is exhausted.
typescript// lib/crawlers/dynamic-cap.ts

const RELEVANT_CAP = 20;  // target relevant ads per brand
const ABSOLUTE_MAX_FETCH = 100;  // hard ceiling to prevent infinite loops

async function crawlBrandWithDynamicCap(
  brand: string,
  region: string,
  yourBrand: string,
  mode: "demo" | "full"
): Promise<AdRecord[]> {
  const cap = mode === "demo" ? 6 : RELEVANT_CAP;  // 6 per brand × 5 brands = 30 for demo
  const relevantAds: AdRecord[] = [];
  let fetched = 0;
  let cursor: string | null = null;

  while (relevantAds.length < cap && fetched < ABSOLUTE_MAX_FETCH) {
    // Fetch next batch of 10 ads from Foreplay for this brand
    const batch = await getForeplayAdsBatch(brand, region, cursor, 10);
    if (batch.ads.length === 0) break;

    cursor = batch.nextCursor;
    fetched += batch.ads.length;

    for (const ad of batch.ads) {
      if (relevantAds.length >= cap) break;

      // STAGE 1: Fast gate
      const passesMetadata = passesMetadataGate(ad.metaRaw);
      const passesOCR = ad.videoUrl ? await passesOcrGate(ad.videoUrl) : false;
      if (!passesMetadata && !passesOCR) continue;

      // Transcribe
      const enrichment = await enrichVideoFromUrl(ad.videoUrl, tmpDir);

      // STAGE 2: AI pre-screen (Haiku)
      const isRelevant = await passesAiPrescreen(enrichment.transcript, brand);
      if (!isRelevant) continue;

      // STAGE 3: Full analysis (Sonnet)
      const analysisFields = await generateAdRecord({
        ...ad, ...enrichment, brand, yourBrand, region
      });

      relevantAds.push(assembleAdRecord(ad, enrichment, analysisFields));
    }

    if (!cursor) break;  // No more pages
  }

  console.log(`${brand}: fetched ${fetched} ads → ${relevantAds.length} relevant (cap: ${cap})`);
  return relevantAds;
}

4. FOREPLAY API — PRIMARY + FALLBACK
4.1 Primary: API Key
typescript// lib/apis/foreplay.ts

const FP_BASE = "https://api.foreplay.co/v1";
const FP_API_KEY = process.env.FOREPLAY_API_KEY;
// Key: ksvmeT8DDKTIlFKyGMhHcjhLwipvReiSojxk8HpVxRYx6pxKIazWWgSeqUAyms5jksdgIBgzg5GCUOqzTgXiKw

const FP_HEADERS = {
  "Authorization": `Bearer ${FP_API_KEY}`,
  "Content-Type": "application/json",
};

// Test connection on startup
export async function testForeplayConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${FP_BASE}/me`, { headers: FP_HEADERS });
    if (res.status === 401 || res.status === 403) {
      console.warn("Foreplay API key invalid or quota exceeded — switching to scraper fallback");
      return false;
    }
    return res.ok;
  } catch {
    return false;
  }
}
4.2 Fallback: Authenticated Session Scraper
Triggered automatically when API key returns 401/403/429 or when testForeplayConnection() returns false.
python# lib/enrichment/foreplay_scraper.py
"""
Fallback scraper using Playwright (headless browser).
Authenticates via email/password, then navigates to share URLs
to extract video CDN URLs and metadata.

Credentials:
  email: email@patiagency.com
  password: SQYuvF4#wjb8JQj

IMPORTANT: Store credentials in .env, never hardcode.
  FOREPLAY_EMAIL=email@patiagency.com
  FOREPLAY_PASSWORD=SQYuvF4#wjb8JQj
"""

import asyncio
import os
from playwright.async_api import async_playwright

FOREPLAY_LOGIN_URL = "https://app.foreplay.co/login"

async def get_foreplay_session_cookies() -> dict:
    """Login and return authenticated cookies for reuse across requests."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto(FOREPLAY_LOGIN_URL, wait_until="networkidle")
        await page.fill('input[type="email"]', os.environ["FOREPLAY_EMAIL"])
        await page.fill('input[type="password"]', os.environ["FOREPLAY_PASSWORD"])
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/app/**", timeout=15000)

        cookies = await page.context.cookies()
        await browser.close()
        return {c["name"]: c["value"] for c in cookies}

async def scrape_foreplay_share_url(share_url: str, cookies: dict) -> dict:
    """
    Navigate to a Foreplay share URL and extract:
    - videoUrl (CDN direct link)
    - landingPageUrl
    - thumbnail
    - duration
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await p.chromium.launch(headless=True)
        # Set cookies for auth
        context = await browser.new_context()
        await context.add_cookies([
            {"name": k, "value": v, "domain": "app.foreplay.co", "path": "/"}
            for k, v in cookies.items()
        ])

        page = await context.new_page()

        # Intercept network to capture video CDN URL
        video_url = None
        async def handle_response(response):
            nonlocal video_url
            url = response.url
            if any(ext in url for ext in [".mp4", ".mov", "cdn.foreplay", "fbcdn"]):
                video_url = url

        page.on("response", handle_response)
        await page.goto(share_url, wait_until="networkidle", timeout=30000)

        # Extract landing page URL
        landing_page = await page.evaluate("""
            () => {
                const links = Array.from(document.querySelectorAll('a[href]'));
                const external = links.find(a =>
                    !a.href.includes('foreplay.co') &&
                    !a.href.includes('facebook.com') &&
                    a.href.startsWith('http')
                );
                return external ? external.href : '';
            }
        """)

        await browser.close()
        return {
            "videoUrl": video_url or "",
            "landingPageUrl": landing_page,
        }
4.3 Connection Manager — Automatic Fallback
typescript// lib/apis/foreplay-manager.ts

let useScraper = false;
let scraperCookies: Record<string, string> | null = null;

export async function initForeplayConnection(): Promise<void> {
  const apiWorking = await testForeplayConnection();
  if (!apiWorking) {
    console.log("Foreplay API unavailable → initialising scraper session");
    useScraper = true;
    // Python subprocess to get cookies
    scraperCookies = await getForeplayScraperCookies();
  }
}

export async function getForeplayAdDetails(shareUrl: string): Promise<ForeplayAd> {
  if (useScraper) {
    return await scrapeForeplayShareUrl(shareUrl, scraperCookies!);
  }
  return await fetchForeplayAdViaApi(shareUrl);
}

5. FULL AD RECORD — CANONICAL SCHEMA
Every crawled ad produces exactly this record. No field may be empty string.
If analysis fails, status: "partial" is set and the record is skipped from Excel output.
typescriptinterface AdRecord {
  // ── Identity ─────────────────────────────────────────────
  brand: string;
  foreplayUrl: string;
  landingPageUrl: string;

  // ── Analysis Fields (8 fields — all rich paragraphs) ─────
  hook: string;             // Hook type + execution + "Why it stops the scroll"
  concept: string;          // Big Idea + strategic architecture + secondary angles
  scriptBreakdown: string;  // Framework name + numbered beats with timecodes
  visual: string;           // A-Roll + B-Roll + C-Roll with timecodes
  psychology: string;       // Primary target + named cognitive biases + execution
  cta: string;              // Mechanism + offer (or why no offer) + landing page job
  keyTakeaways: string;     // ✅ STEAL (2-5) + 🔨 KAIZEN (2-4) + 🚀 UPGRADE (1)
  productionFormula: string; // FORMAT + 5 PHASES (HOOK/AGITATE/REVEAL/TRUST/CTA)
                             // Each phase: screen direction + 📝 voiceover + 🖥 TEXT SUPER

  // ── Scoring (for Ranked Shortlist tab) ───────────────────
  adScore: number;          // See scoring formula in Section 6
  longevityDays: number;    // Days since ad_delivery_start_time
  hookType: string;         // Extracted from hook field for filter/grouping
  primaryAngle: string;     // Extracted from concept field (e.g. "Industry Betrayal")
  frameworkName: string;    // Extracted from scriptBreakdown field

  // ── Crawl Metadata ────────────────────────────────────────
  adLibraryId: string;
  adLibraryUrl: string;
  region: "US" | "UK" | "AU";
  keyword: string;
  status: "active" | "inactive" | "partial";
  crawledAt: string;        // ISO 8601
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  videoFormat?: "9:16" | "1:1" | "16:9" | "4:5" | "unknown";
  impressions?: { lower_bound: string; upper_bound: string };
  spend?: { lower_bound: string; upper_bound: string; currency: string };
  pageId?: string;
  pageName?: string;
}

6. AD SCORING FORMULA
Used to rank ads for the Media Buyer "Ranked Shortlist" tab.
AdScore = (LongevityScore × 0.50) + (ImpressionsScore × 0.30) + (DurationScore × 0.20)

LongevityScore = min(longevityDays / 90, 1.0) × 10
  → 90+ days running = 10/10. 45 days = 5/10. Capped at 10.

ImpressionsScore = log10(impressions.upper_bound) / log10(10_000_000) × 10
  → 10M impressions = 10/10. 100K = ~5/10. Uses log scale.

DurationScore = min(durationSeconds / 120, 1.0) × 10
  → 120s+ video = 10/10 (long-form commitment signal). 30s = 2.5/10.
Score range: 0–10. Top 10 ads per market are the "Ranked Shortlist."

7. SYSTEM ARCHITECTURE
antigravity/
├── claude.md                    ← Project Constitution (schema + rules + invariants)
├── .env                         ← All API keys and credentials
├── task_plan.md                 ← Phases, goals, checklists
├── findings.md                  ← Research, discoveries, API constraints
├── progress.md                  ← What was done, errors, test results
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
├── tools/                       ← Layer 3: Python scripts (atomic, testable)
│   ├── competitor_scorer.py     ← Meta API → CompetitorScore per brand
│   ├── meta_crawler.py          ← Fetch ads by keyword + region
│   ├── foreplay_api.py          ← Primary Foreplay API client
│   ├── foreplay_scraper.py      ← Fallback Playwright scraper
│   ├── foreplay_manager.py      ← Auto-switch between API and scraper
│   ├── ocr_gate.py              ← Stage 1B: Tesseract first-frame OCR
│   ├── video_enricher.py        ← Download + ffmpeg + Whisper
│   ├── prescreen.py             ← Stage 2: Claude Haiku binary filter
│   ├── record_generator.py      ← Stage 3: Claude Sonnet full analysis
│   └── excel_builder.py         ← 4-tab Excel output
│
├── lib/                         ← TypeScript/Next.js layer
│   ├── apis/
│   │   ├── meta.ts
│   │   └── foreplay-manager.ts
│   ├── crawlers/
│   │   ├── competitor-scorer.ts
│   │   └── dynamic-cap.ts
│   ├── analyzers/
│   │   ├── prescreen.ts
│   │   └── record-generator.ts
│   ├── queue/
│   │   └── crawl-processor.ts   ← BullMQ orchestration
│   └── db/
│       └── prisma.ts
│
├── app/                         ← Next.js dashboard
│   ├── dashboard/page.tsx
│   ├── api/
│   │   ├── crawl/route.ts
│   │   ├── ads/route.ts
│   │   └── export/route.ts
│   └── components/
│       ├── AdRecordCard.tsx
│       ├── CrawlProgress.tsx
│       └── ExportButton.tsx
│
└── .tmp/                        ← Ephemeral workspace (auto-cleaned after job)
    └── jobs/
        └── {job_id}/
            ├── video.mp4
            ├── audio.mp3
            ├── frame_0s.png
            └── result.json

8. EXCEL OUTPUT — 4-TAB INTELLIGENCE FILE
This is the primary deliverable. Each tab serves a specific user and is ready to use without further synthesis.
VISUAL DESIGN SPEC (global)
Theme colours:
  DARK_BG      = "1A1A2E"   # Deep navy — title/header background
  ACCENT_PANEL = "0F3460"   # Midnight blue — column header background
  ACCENT_GREEN = "00C896"   # Emerald — accent text
  ROW_ALT      = "F8F9FA"   # Light grey — alternating row fill
  ROW_WHITE    = "FFFFFF"   # White — base row fill
  BORDER       = "DEE2E6"   # Light grey — cell borders

Font: Arial throughout. Header = white bold 10pt on dark BG. Body = Arial 9pt.
Grid lines: HIDDEN on all sheets (ws.sheet_view.showGridLines = False).
All sheets: freeze panes after brand/market columns, auto-filter on header row.

TAB 1 — "📋 Ad Intelligence Records" (Primary — Full Detail)
User: Anyone needing complete forensic analysis of a specific ad.
Action: Deep-dive research. All 9 analysis fields visible per ad. Clickable links.
Title row (row 1, merged A:M):
🔬 PROJECT ANTIGRAVITY — COMPETITOR AD INTELLIGENCE DATABASE  |  FusiForce / Wellness Nest
Dark navy background, white bold 13pt, centered. Row height = 32.
Sub-header row (row 2, merged A:M):
Keyword: Creatine Gummies  |  Markets: US · UK · AU  |  Framework: Hook → Concept → Script → Visuals → Psychology → CTA → Takeaways → Production Formula
Darker navy background, italic grey 9pt, centered. Row height = 18.
Column header row (row 3): Midnight blue background, white bold 10pt, centered.
ColHeaderWidthA#5BBRAND18CMARKET9DAD LINK (Foreplay)22 — clickable hyperlinkELANDING PAGE22 — clickable hyperlinkFHOOK52GCONCEPT / BIG IDEA52HSCRIPT BREAKDOWN52IVISUAL — A/B/C ROLL52JCONSUMER PSYCHOLOGY52KCTA38LKEY TAKEAWAYS60M🎬 PRODUCTION FORMULA70
Data rows start at row 4. Row height = 320. Wrap text + vertical top on all cells.
Columns A/B/C: centered. Columns D/E: hyperlink font (blue underline). Columns F–M: wrap top.
Alternating row fill: even rows = ROW_ALT (#F8F9FA), odd = white.
Freeze panes at D4 (columns A–C always visible while scrolling).
Auto-filter on row 3.

TAB 2 — "🎬 Production Formulas" (Creative Team — Bi-weekly)
User: Creative Strategist / Script Writer / Video Editor
Action: Filter by Hook Type or Primary Angle → copy Production Formula into brief template.
Title row (row 1, merged A:G):
🎬 PRODUCTION FORMULAS — Ready-to-Brief Scripts for FusiForce Creative Team
Dark navy background, white bold 12pt.
Column header row (row 2): Same midnight blue style.
ColHeaderWidthA#5BBRAND18CMARKET9DHOOK TYPE30 — extracted from hook fieldEPRIMARY ANGLE / BIG IDEA40 — extracted from concept fieldFFRAMEWORK35 — extracted from scriptBreakdown fieldG⭐ FULL PRODUCTION FORMULA (Phase-by-Phase Shoot Brief)90 — untruncated
Data rows start at row 3. Row height = 280. Columns A–C centered, D–G wrap top.
Freeze panes at D3. Auto-filter on row 2.
Extraction rules (for columns D/E/F):
pythondef extract_hook_type(hook: str) -> str:
    # Regex: "Type: [content]" up to first newline
    match = re.search(r"Type:\s*([^\n]+)", hook)
    return match.group(1).strip() if match else "—"

def extract_big_idea(concept: str) -> str:
    # Regex: 'Big Idea: "[content]"' or 'Big Idea: [content]'
    match = re.search(r'Big Idea:\s*["\']?([^"\'\n.]+)', concept)
    return match.group(1).strip() if match else "—"

def extract_framework(script: str) -> str:
    # Regex: "Framework: [content]" up to first newline
    match = re.search(r"Framework:\s*([^\n]+)", script)
    return match.group(1).strip() if match else "—"

TAB 3 — "⚡ Key Takeaways" (Media Buyer + Creative — Weekly)
User: Media Buyer checking winning angles / Creative team scanning gaps to exploit.
Action: Filter by Brand or Market → scan STEAL column to copy winning structure. Scan KAIZEN column to find category gaps FusiForce should own.
Title row (row 1, merged A:F):
⚡ KEY TAKEAWAYS — STEAL · KAIZEN · UPGRADE  |  Filtered for FusiForce Implementation
Dark navy background, white bold 12pt.
Column header row (row 2): Midnight blue style.
ColHeaderWidthA#5BBRAND18CMARKET9D✅ STEAL (What to replicate)65 — all STEAL bullets parsedE🔨 KAIZEN (Gap to exploit)65 — all KAIZEN bullets parsedF🚀 UPGRADE (FusiForce advantage)65 — UPGRADE paragraph
Data rows start at row 3. Row height = 220. Freeze at D3. Auto-filter on row 2.
Parsing rules (from keyTakeaways field):
pythondef parse_takeaways(kt: str) -> tuple[str, str, str]:
    steals  = re.findall(r"✅ STEAL[^\:]*:\s*(.*?)(?=\n\n[✅🔨🚀]|\Z)", kt, re.DOTALL)
    kaizens = re.findall(r"🔨 KAIZEN[^\:]*:\s*(.*?)(?=\n\n[✅🔨🚀]|\Z)", kt, re.DOTALL)
    upgrade = re.findall(r"🚀 UPGRADE[^\:]*:\s*(.*?)(?=\n\n[✅🔨🚀]|\Z)", kt, re.DOTALL)
    steal_txt   = "\n\n".join(f"• {s.strip()}" for s in steals)
    kaizen_txt  = "\n\n".join(f"• {k.strip()}" for k in kaizens)
    upgrade_txt = upgrade[0].strip() if upgrade else "—"
    return steal_txt, kaizen_txt, upgrade_txt

TAB 4 — "📖 Legend & Instructions"
User: Any new team member opening the file for the first time.
Action: Read field definitions, tab usage guide, ad scoring explanation.
Two-column layout (A = Label 25pt wide, B = Description 80pt wide):

Row 1: Full-width title banner (dark navy, white bold 14pt)
Section headers: light blue background (#E8F4F8), bold 10pt
Body rows: alternating ROW_ALT/white, Arial 9pt, thin border

Content sections:

HOW TO USE THIS FILE — one line per tab with plain-English description
FIELD DEFINITIONS — Hook / Concept / Script Breakdown / Visual Rolls / Psychology / CTA / Key Takeaways / Production Formula
AD SCORING — formula explanation (Longevity 50% + Impressions 30% + Duration 20%)
YOUR BRAND — FusiForce / Wellness Nest context note


9. EXCEL BUILDER — PYTHON IMPLEMENTATION (tools/excel_builder.py)
python# tools/excel_builder.py
"""
Canonical Excel builder for Project Antigravity.
Produces a 4-tab openpyxl workbook matching the exact visual spec in Section 8.
Called by the BullMQ pipeline after all AdRecords are generated.
Input:  records: list[dict]  — list of AdRecord dicts
Output: .xlsx file at output_path
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import re

# ── Palette ──────────────────────────────────────────────────────────────────
DARK_BG      = "1A1A2E"
PANEL_BG     = "0F3460"
ROW_ALT      = "F8F9FA"
ROW_WHITE    = "FFFFFF"
BORDER_COL   = "DEE2E6"

H_FONT   = Font(name="Arial", bold=True, color="FFFFFF", size=10)
BODY_FONT = Font(name="Arial", size=9, color="212529")
LINK_FONT = Font(name="Arial", size=9, color="0563C1", underline="single")

def _border():
    s = Side(border_style="thin", color=BORDER_COL)
    return Border(left=s, right=s, top=s, bottom=s)

def _hfill(color=DARK_BG):
    return PatternFill("solid", fgColor=color)

def _rfill(alt=False):
    return PatternFill("solid", fgColor=ROW_ALT if alt else ROW_WHITE)

def _wrap():
    return Alignment(wrap_text=True, vertical="top")

def _center():
    return Alignment(horizontal="center", vertical="center", wrap_text=True)

# ── Field extractors ──────────────────────────────────────────────────────────
def extract_hook_type(hook: str) -> str:
    m = re.search(r"Type:\s*([^\n]+)", hook)
    return m.group(1).strip() if m else "—"

def extract_big_idea(concept: str) -> str:
    m = re.search(r'Big Idea:\s*["\']?([^"\'\n.]+)', concept)
    return m.group(1).strip() if m else "—"

def extract_framework(script: str) -> str:
    m = re.search(r"Framework:\s*([^\n]+)", script)
    return m.group(1).strip() if m else "—"

def parse_takeaways(kt: str):
    steals  = re.findall(r"✅ STEAL[^\:]*:\s*(.*?)(?=\n\n[✅🔨🚀]|\Z)", kt, re.DOTALL)
    kaizens = re.findall(r"🔨 KAIZEN[^\:]*:\s*(.*?)(?=\n\n[✅🔨🚀]|\Z)", kt, re.DOTALL)
    upgrade = re.findall(r"🚀 UPGRADE[^\:]*:\s*(.*?)(?=\n\n[✅🔨🚀]|\Z)", kt, re.DOTALL)
    return (
        "\n\n".join(f"• {s.strip()}" for s in steals),
        "\n\n".join(f"• {k.strip()}" for k in kaizens),
        upgrade[0].strip() if upgrade else "—",
    )

def _col_headers(ws, row, headers_widths, fill_color=PANEL_BG):
    for col_idx, (label, width) in enumerate(headers_widths, 1):
        cell = ws.cell(row=row, column=col_idx, value=label)
        cell.font = H_FONT
        cell.fill = _hfill(fill_color)
        cell.alignment = _center()
        cell.border = _border()
        ws.column_dimensions[get_column_letter(col_idx)].width = width
    ws.row_dimensions[row].height = 36

def _title_row(ws, row, text, ncols, size=13, height=32):
    ws.merge_cells(f"A{row}:{get_column_letter(ncols)}{row}")
    c = ws.cell(row=row, column=1, value=text)
    c.font = Font(name="Arial", bold=True, size=size, color="FFFFFF")
    c.fill = _hfill(DARK_BG)
    c.alignment = _center()
    ws.row_dimensions[row].height = height

def build_excel(records: list, output_path: str) -> None:
    wb = Workbook()

    # ════════════════════════════════════════════════════════════
    # TAB 1 — 📋 Ad Intelligence Records
    # ════════════════════════════════════════════════════════════
    ws1 = wb.active
    ws1.title = "📋 Ad Intelligence Records"
    ws1.sheet_view.showGridLines = False

    COLS1 = [
        ("#", 5), ("BRAND", 18), ("MARKET", 9),
        ("AD LINK (Foreplay)", 22), ("LANDING PAGE", 22),
        ("HOOK", 52), ("CONCEPT / BIG IDEA", 52),
        ("SCRIPT BREAKDOWN", 52), ("VISUAL — A/B/C ROLL", 52),
        ("CONSUMER PSYCHOLOGY", 52), ("CTA", 38),
        ("KEY TAKEAWAYS", 60), ("🎬 PRODUCTION FORMULA", 70),
    ]

    _title_row(ws1, 1,
        "🔬 PROJECT ANTIGRAVITY — COMPETITOR AD INTELLIGENCE DATABASE  |  FusiForce / Wellness Nest",
        len(COLS1), size=13, height=32)

    ws1.merge_cells(f"A2:{get_column_letter(len(COLS1))}2")
    sub = ws1["A2"]
    sub.value = ("Keyword: Creatine Gummies  |  Markets: US · UK · AU  |  "
                 "Framework: Hook → Concept → Script → Visuals → Psychology → CTA → Takeaways → Production Formula")
    sub.font = Font(name="Arial", size=9, color="AAAAAA", italic=True)
    sub.fill = _hfill("0D0D1F")
    sub.alignment = _center()
    ws1.row_dimensions[2].height = 18

    _col_headers(ws1, 3, COLS1)

    for row_i, rec in enumerate(records):
        r = row_i + 4
        alt = row_i % 2 == 1
        vals = [
            rec.get("no", row_i + 1), rec.get("brand", ""), rec.get("market", rec.get("region", "")),
            rec.get("link_ads", rec.get("foreplayUrl", "")),
            rec.get("link_landing_page", rec.get("landingPageUrl", "")),
            rec.get("hook", ""), rec.get("concept", ""),
            rec.get("script_breakdown", rec.get("scriptBreakdown", "")),
            rec.get("visual_rolls", rec.get("visual", "")),
            rec.get("psychology", ""), rec.get("cta", ""),
            rec.get("key_takeaways", rec.get("keyTakeaways", "")),
            rec.get("production_formula", rec.get("productionFormula", "")),
        ]
        for col_idx, val in enumerate(vals, 1):
            cell = ws1.cell(row=r, column=col_idx, value=val)
            cell.fill = _rfill(alt)
            cell.border = _border()
            if col_idx in (4, 5) and val:   # hyperlinks
                cell.hyperlink = val
                cell.font = LINK_FONT
                cell.alignment = _wrap()
            elif col_idx <= 3:              # #, Brand, Market — centered
                cell.font = Font(name="Arial", bold=(col_idx > 1), size=9)
                cell.alignment = _center()
            else:
                cell.font = BODY_FONT
                cell.alignment = _wrap()
        ws1.row_dimensions[r].height = 320

    ws1.freeze_panes = "D4"
    ws1.auto_filter.ref = f"A3:{get_column_letter(len(COLS1))}3"

    # ════════════════════════════════════════════════════════════
    # TAB 2 — 🎬 Production Formulas
    # ════════════════════════════════════════════════════════════
    ws2 = wb.create_sheet("🎬 Production Formulas")
    ws2.sheet_view.showGridLines = False

    COLS2 = [
        ("#", 5), ("BRAND", 18), ("MARKET", 9),
        ("HOOK TYPE", 30), ("PRIMARY ANGLE / BIG IDEA", 40),
        ("FRAMEWORK", 35),
        ("⭐ FULL PRODUCTION FORMULA (Phase-by-Phase Shoot Brief)", 90),
    ]

    _title_row(ws2, 1,
        "🎬 PRODUCTION FORMULAS — Ready-to-Brief Scripts for FusiForce Creative Team",
        len(COLS2), size=12, height=28)
    _col_headers(ws2, 2, COLS2)

    for row_i, rec in enumerate(records):
        r = row_i + 3
        alt = row_i % 2 == 1
        vals = [
            rec.get("no", row_i + 1),
            rec.get("brand", ""),
            rec.get("market", rec.get("region", "")),
            extract_hook_type(rec.get("hook", "")),
            extract_big_idea(rec.get("concept", "")),
            extract_framework(rec.get("script_breakdown", rec.get("scriptBreakdown", ""))),
            rec.get("production_formula", rec.get("productionFormula", "")),
        ]
        for col_idx, val in enumerate(vals, 1):
            cell = ws2.cell(row=r, column=col_idx, value=val)
            cell.fill = _rfill(alt)
            cell.border = _border()
            cell.font = BODY_FONT
            cell.alignment = _wrap() if col_idx > 3 else _center()
        ws2.row_dimensions[r].height = 280

    ws2.freeze_panes = "D3"
    ws2.auto_filter.ref = f"A2:{get_column_letter(len(COLS2))}2"

    # ════════════════════════════════════════════════════════════
    # TAB 3 — ⚡ Key Takeaways
    # ════════════════════════════════════════════════════════════
    ws3 = wb.create_sheet("⚡ Key Takeaways")
    ws3.sheet_view.showGridLines = False

    COLS3 = [
        ("#", 5), ("BRAND", 18), ("MARKET", 9),
        ("✅ STEAL (What to replicate)", 65),
        ("🔨 KAIZEN (Gap to exploit)", 65),
        ("🚀 UPGRADE (FusiForce advantage)", 65),
    ]

    _title_row(ws3, 1,
        "⚡ KEY TAKEAWAYS — STEAL · KAIZEN · UPGRADE  |  Filtered for FusiForce Implementation",
        len(COLS3), size=12, height=28)
    _col_headers(ws3, 2, COLS3)

    for row_i, rec in enumerate(records):
        r = row_i + 3
        alt = row_i % 2 == 1
        kt = rec.get("key_takeaways", rec.get("keyTakeaways", ""))
        steal, kaizen, upgrade = parse_takeaways(kt)
        vals = [
            rec.get("no", row_i + 1),
            rec.get("brand", ""),
            rec.get("market", rec.get("region", "")),
            steal, kaizen, upgrade,
        ]
        for col_idx, val in enumerate(vals, 1):
            cell = ws3.cell(row=r, column=col_idx, value=val)
            cell.fill = _rfill(alt)
            cell.border = _border()
            cell.font = BODY_FONT
            cell.alignment = _wrap() if col_idx > 3 else _center()
        ws3.row_dimensions[r].height = 220

    ws3.freeze_panes = "D3"
    ws3.auto_filter.ref = f"A2:{get_column_letter(len(COLS3))}2"

    # ════════════════════════════════════════════════════════════
    # TAB 4 — 📖 Legend & Instructions
    # ════════════════════════════════════════════════════════════
    ws4 = wb.create_sheet("📖 Legend & Instructions")
    ws4.sheet_view.showGridLines = False
    ws4.column_dimensions["A"].width = 25
    ws4.column_dimensions["B"].width = 80

    _title_row(ws4, 1, "📖 PROJECT ANTIGRAVITY — LEGEND & INSTRUCTIONS", 2, size=14, height=40)

    legend = [
        ("HOW TO USE THIS FILE", ""),
        ("Tab 1 → Ad Intelligence Records", "Complete forensic analysis. All 9 fields per ad. Use for deep-dive research on any specific ad."),
        ("Tab 2 → Production Formulas", "Phase-by-phase shoot briefs. Filter by Hook Type or Angle. Paste directly into creative brief template."),
        ("Tab 3 → Key Takeaways", "STEAL · KAIZEN · UPGRADE pre-parsed. Filter by Brand or Market to cluster competitor gaps."),
        ("Tab 4 → This Page", "Field definitions, usage guide, scoring explanation."),
        ("", ""),
        ("FIELD DEFINITIONS", ""),
        ("Hook", "Hook TYPE label + exact execution (what happens 0–5s on screen) + WHY it stops the scroll (psychological mechanism named)."),
        ("Concept / Big Idea", "Central creative idea in one sentence + full strategic architecture + secondary angles (bulleted)."),
        ("Script Breakdown", "Named copywriting framework + numbered beats with exact timecodes. Shows the full narrative arc."),
        ("Visual — A/B/C Roll", "A-Roll = presenter/main footage. B-Roll = product/prop shots with timecodes. C-Roll = text overlays, certs, reviews on screen (or strategic note if absent)."),
        ("Consumer Psychology", "Named cognitive biases with exact execution detail per bias. Includes regional market resonance note (US/UK/AU)."),
        ("CTA", "Mechanism (verbal/gesture/text/button) + offer shown or why no offer + what the landing page must handle."),
        ("Key Takeaways", "✅ STEAL = replicate with FusiForce implementation instructions.\n🔨 KAIZEN = structural weakness + how FusiForce exploits it.\n🚀 UPGRADE = where FusiForce structurally wins vs. this brand."),
        ("Production Formula", "Ready-to-shoot brief: FORMAT line + 5 phases (HOOK/AGITATE/REVEAL/TRUST/CTA).\nEach phase: screen direction + 📝 voiceover line + 🖥 TEXT SUPER."),
        ("", ""),
        ("AD SCORING", ""),
        ("Ad Score (0–10)", "Composite: Longevity 50% + Impressions 30% + Duration 20%. Green row ≥8. Yellow row ≥5."),
        ("Longevity", "Days since ad_delivery_start_time. 90+ days = ROI-positive signal. Highest weight metric."),
        ("", ""),
        ("YOUR BRAND", "FusiForce / Wellness Nest. All STEAL/KAIZEN/UPGRADE items and Production Formulas are written specifically for FusiForce implementation."),
    ]

    SECTION_KEYS = {"HOW TO USE THIS FILE", "FIELD DEFINITIONS", "AD SCORING"}
    for row_i, (key, val) in enumerate(legend, 2):
        ka = ws4.cell(row=row_i, column=1, value=key)
        va = ws4.cell(row=row_i, column=2, value=val)
        if key in SECTION_KEYS:
            ka.font = Font(name="Arial", bold=True, size=10, color=DARK_BG)
            ka.fill = PatternFill("solid", fgColor="E8F4F8")
            va.fill = PatternFill("solid", fgColor="E8F4F8")
        else:
            f = _rfill(row_i % 2 == 0)
            ka.font = Font(name="Arial", bold=True, size=9, color="333333")
            ka.fill = f
            va.fill = f
        va.font = Font(name="Arial", size=9, color="444444")
        va.alignment = Alignment(wrap_text=True, vertical="top")
        ka.alignment = Alignment(wrap_text=True, vertical="top")
        ka.border = _border()
        va.border = _border()
        ws4.row_dimensions[row_i].height = 40

    wb.save(output_path)
    print(f"Excel saved: {output_path}")

10. NEXT.JS DASHBOARD — API ROUTES
typescript// app/api/crawl/route.ts — Start a crawl job
// POST /api/crawl
// Body: { region: "US"|"UK"|"AU", keyword: string, mode: "demo"|"full" }

// app/api/crawl/[jobId]/status/route.ts — Poll job progress
// GET /api/crawl/{jobId}/status
// Returns: { status, progress, brandsFound, adsProcessed, currentBrand, estimatedCost }

// app/api/ads/route.ts — Query stored records
// GET /api/ads?region=US&brand=Create&minScore=7&hookType=UGC

// app/api/export/route.ts — Download Excel
// GET /api/export?region=US&crawlJobId=xxx
// Returns: Excel file as download
Dashboard components:

CrawlLauncher.tsx — Region selector, mode toggle (demo/full), cost estimate
CrawlProgress.tsx — Real-time BullMQ progress bar via Server-Sent Events
AdRecordCard.tsx — Card per ad: thumbnail + hook excerpt + score badge + Foreplay link
ExportButton.tsx — "Download Excel" → calls /api/export


11. FULL PIPELINE ORCHESTRATION (BullMQ)
typescript// lib/queue/crawl-processor.ts

export const crawlWorker = new Worker("crawl-queue", async (job) => {
  const { markets, keyword, yourBrand, mode } = job.data;
  const allRecords: AdRecord[] = [];

  for (const region of markets) {
    // PHASE 1: Score competitors
    await job.updateProgress({ phase: "scoring", region });
    const competitors = await scoreAndSelectTopCompetitors(keyword, region, 5);

    // PHASE 2: Crawl each competitor with dynamic cap
    for (const competitor of competitors) {
      await job.updateProgress({ phase: "crawling", region, brand: competitor.brand });
      const records = await crawlBrandWithDynamicCap(
        competitor.brand, region, yourBrand, mode
      );
      allRecords.push(...records);
    }
  }

  // PHASE 3: Build Excel
  await job.updateProgress({ phase: "building_excel" });
  const excelPath = `/tmp/antigravity-export-${job.id}.xlsx`;
  buildExcel(allRecords, excelPath);

  // PHASE 4: Store in DB
  await job.updateProgress({ phase: "saving_db" });
  for (const rec of allRecords) {
    await prisma.adRecord.upsert({
      where: { adLibraryUrl: rec.adLibraryUrl },
      create: rec,
      update: { ...rec, crawledAt: new Date().toISOString() }
    });
  }

  return {
    adsAnalysed: allRecords.length,
    excelPath,
    markets,
    mode,
    totalCostEstimate: `$${(allRecords.length * 0.032).toFixed(2)}`
  };
}, {
  connection: redis,
  concurrency: 2,
  limiter: { max: 150, duration: 3_600_000 }  // Stay under Meta 200/hr
});

12. DEMO MODE — 30 VIDEO EXECUTION PLAN
Demo config: 3 markets × 1 competitor × 10 ads = 30 ads total.
OR: 1 market × 5 competitors × 6 ads = 30 ads.
Recommended demo path:
mode: "demo"
market: "US"          ← Single market for first run
competitors: top 5 US brands by CompetitorScore
adsPerBrand: 6        ← 5 brands × 6 = 30
Demo → Full scale path:

Run demo (30 ads) → validate Excel output with team
Verify analysis quality (hook/concept/formula accuracy)
If approved → run full (300 ads, all 3 markets)
Set monthly cron for delta-crawl (new ads only, skip already-analysed adLibraryIds)


13. DELTA CRAWL — SCALING TO 300 WITHOUT RE-ANALYSING
typescript// Delta crawl: only process ads NOT already in the database
async function isDuplicateAd(adLibraryId: string): Promise<boolean> {
  const existing = await prisma.adRecord.findUnique({
    where: { adLibraryId }
  });
  return existing !== null;
}

// In crawlBrandWithDynamicCap, after Stage 1 passes:
if (await isDuplicateAd(ad.adId)) {
  console.log(`Skipping already-analysed ad: ${ad.adId}`);
  continue;  // Don't count toward cap — only new ads count
}
This ensures monthly re-crawls only spend tokens on genuinely new ads.

14. ENVIRONMENT VARIABLES
bash# ── Meta Ad Library ──────────────────────────────────────────
META_ACCESS_TOKEN=           # Long-lived 60-day token, ads_read permission

# ── Foreplay ─────────────────────────────────────────────────
FOREPLAY_API_KEY=ksvmeT8DDKTIlFKyGMhHcjhLwipvReiSojxk8HpVxRYx6pxKIazWWgSeqUAyms5jksdgIBgzg5GCUOqzTgXiKw
FOREPLAY_EMAIL=email@patiagency.com
FOREPLAY_PASSWORD=SQYuvF4#wjb8JQj
FOREPLAY_BOARD_ID=           # Optional: auto-save crawled ads to swipe file

# ── AI Models ────────────────────────────────────────────────
ANTHROPIC_API_KEY=           # For both Haiku (pre-screen) and Sonnet (analysis)
OPENAI_API_KEY=              # For Whisper transcription

# ── Infrastructure ───────────────────────────────────────────
DATABASE_URL=                # PostgreSQL
REDIS_URL=                   # BullMQ

# ── Python ───────────────────────────────────────────────────
# pip install openai requests pillow pytesseract playwright openpyxl anthropic
# playwright install chromium
# apt install tesseract-ocr ffmpeg

15. COST MODEL — DEMO vs FULL
OperationUnit CostDemo (30 ads)Full (300 ads)OCR gate (Tesseract)~$0~$0~$0Whisper transcription$0.006/min avg~$0.18~$1.80Claude Haiku pre-screen$0.0002/call$0.006~$0.06Claude Sonnet analysis$0.030/call$0.90$9.00Puppeteer LP extraction~$0~$0~$0TOTAL~$1.10~$10.86
At 40% rejection rate from Stage 1+2 filters, actual Sonnet calls drop to ~180 for a "full" run = ~$6.50.

16. NON-NEGOTIABLE OUTPUT QUALITY RULES

ad_type: "VIDEO" hardcoded on every Meta API call. No images. No carousels.
Stage 1 → Stage 2 → Stage 3 order is inviolable. Never call Sonnet without Haiku approval.
hook must contain: named hook TYPE + "Why it stops the scroll" paragraph.
scriptBreakdown must contain: named framework + numbered beats with timecodes.
keyTakeaways must contain: ≥2 ✅ STEAL + ≥2 🔨 KAIZEN + 1 🚀 UPGRADE, all with explicit FusiForce implementation instructions.
productionFormula must contain: FORMAT line + ≥5 phases + every phase has all 3 elements (screen direction + 📝 voiceover + 🖥 TEXT SUPER).
adScore must be computed before Excel export. No unscored records in Tab 1.
hookType and primaryAngle must be extracted fields (not full paragraphs) for Excel filter functionality.
Delta crawl must check adLibraryId uniqueness before any processing.
Foreplay fallback scraper must activate silently — no user-facing error unless BOTH methods fail.
Excel Tab 1 (Ad Intelligence Records) shows all records. Tab 2 (Production Formulas) and Tab 3 (Key Takeaways) are filterable views. Tab 4 = Legend only.
productionFormula column in Tab 2 must be untruncated, full-width, wrap-text enabled.


17. SELF-ANNEALING REPAIR LOOP
When any tool fails:

Analyse: Read full stack trace. Never guess.
Patch: Fix the script in tools/.
Test: Run isolated unit test on the patched tool.
Update SOP: Add learning to corresponding architecture/ .md file.

"Meta API rate limit hits at 180 calls/hr not 200 — update limiter to 150"
"Foreplay session expires after 4 hours — refresh cookies every 3 hours"
"Tesseract fails on low-contrast first frames — fall back to frame at 2s"


Update progress.md: Log what happened, fix applied, test result.


One-sentence objective: Automatically find the top creatine gummy competitors across US, UK, and AU markets, forensically dissect their best video ads using AI, and deliver a ready-to-act Excel intelligence file — so FusiForce never has to manually research a competitor ad again.

What it builds:
A crawl-to-Excel pipeline that runs on autopilot. It pulls competitor video ads from Meta Ad Library via Foreplay, filters out irrelevant content through a 3-stage AI funnel, and then uses Claude Sonnet to produce a full 9-field forensic breakdown on every ad — including a ready-to-shoot production formula adapted specifically for FusiForce.
The 3-stage filter exists to save money: Tesseract OCR kills irrelevant ads for free, Claude Haiku ($0.0002/call) confirms relevance before Claude Sonnet ($0.03/call) ever runs. At 40% rejection rate, full analysis of 300 ads costs ~$6.50 total.
The Excel output has one job per tab:

Tab 1 → Full ad record with all analysis fields (the research archive)
Tab 2 → Phase-by-phase shoot briefs ready to paste into a creative brief
Tab 3 → STEAL / KAIZEN / UPGRADE pre-parsed so the team knows exactly what to copy and what gaps to exploit
Tab 4 → Legend and field definitions for any new team member

The north star metric is ad longevity (35% of competitor scoring weight) — if a brand kept paying for an ad for 90+ days, it converted. That's the signal worth chasing.
Demo = 30 ads, $1.10. Full = 300 ads, ~$6.50. Monthly delta-crawl only re-analyses new ads.

🚀 B.L.A.S.T. Master System Prompt
Identity: You are the System Pilot. Your mission is to build deterministic, self-healing automation in Antigravity using the B.L.A.S.T. (Blueprint, Link, Architect, Stylize, Trigger) protocol and the A.N.T. 3-layer architecture. You prioritize reliability over speed and never guess at business logic.

🟢 Protocol 0: Initialization (Mandatory)
Before any code is written or tools are built:
1. Initialize Project Memory
  - Create:
    - task_plan.md → Phases, goals, and checklists
    - findings.md → Research, discoveries, constraints
    - progress.md → What was done, errors, tests, results
  - Initialize claude.md as the Project Constitution:
    - Data schemas
    - Behavioral rules
    - Architectural invariants
2. Halt Execution You are strictly forbidden from writing scripts in tools/ until:
  - Discovery Questions are answered
  - The Data Schema is defined in gemini.md
  - task_plan.md has an approved Blueprint

🏗️ Phase 1: B - Blueprint (Vision & Logic)
3. Discovery: Ask the user the following 5 questions:
- North Star: What is the singular desired outcome?
- Integrations: Which external services (Slack, Shopify, etc.) do we need? Are keys ready?
- Source of Truth: Where does the primary data live?
- Delivery Payload: How and where should the final result be delivered?
- Behavioral Rules: How should the system "act"? (e.g., Tone, specific logic constraints, or "Do Not" rules).
4. Data-First Rule: You must define the JSON Data Schema (Input/Output shapes) in gemini.md. Coding only begins once the "Payload" shape is confirmed.
5. Research: Search github repos and other databases for any helpful resources for this project

⚡ Phase 2: L - Link (Connectivity)
6. Verification: Test all API connections and .env credentials. 2. Handshake: Build minimal scripts in tools/ to verify that external services are responding correctly. Do not proceed to full logic if the "Link" is broken.

⚙️ Phase 3: A - Architect (The 3-Layer Build)
You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic; business logic must be deterministic.
Layer 1: Architecture (architecture/)
- Technical SOPs written in Markdown.
- Define goals, inputs, tool logic, and edge cases.
- The Golden Rule: If logic changes, update the SOP before updating the code.
Layer 2: Navigation (Decision Making)
- This is your reasoning layer. You route data between SOPs and Tools.
- You do not try to perform complex tasks yourself; you call execution tools in the right order.
Layer 3: Tools (tools/)
- Deterministic Python scripts. Atomic and testable.
- Environment variables/tokens are stored in .env.
- Use .tmp/ for all intermediate file operations.

✨ Phase 4: S - Stylize (Refinement & UI)
7. Payload Refinement: Format all outputs (Slack blocks, Notion layouts, Email HTML) for professional delivery. 2. UI/UX: If the project includes a dashboard or frontend, apply clean CSS/HTML and intuitive layouts. 3. Feedback: Present the stylized results to the user for feedback before final deployment.

🛰️ Phase 5: T - Trigger (Deployment)
8. Cloud Transfer: Move finalized logic from local testing to the production cloud environment. 2. Automation: Set up execution triggers (Cron jobs, Webhooks, or Listeners). 3. Documentation: Finalize the Maintenance Log in gemini.md for long-term stability.

🛠️ Operating Principles
9. The "Data-First" Rule
Before building any Tool, you must define the Data Schema in gemini.md.
- What does the raw input look like?
- What does the processed output look like?
- Coding only begins once the "Payload" shape is confirmed.
- After any meaningful task:
  - Update progress.md with what happened and any errors.
  - Store discoveries in findings.md.
  - Only update gemini.md when:
    - A schema changes
    - A rule is added
    - Architecture is modified
gemini.md is law.
The planning files are memory.
10. Self-Annealing (The Repair Loop)
When a Tool fails or an error occurs:
1. Analyze: Read the stack trace and error message. Do not guess.
2. Patch: Fix the Python script in tools/.
3. Test: Verify the fix works.
4. Update Architecture: Update the corresponding .md file in architecture/ with the new learning (e.g., "API requires a specific header" or "Rate limit is 5 calls/sec") so the error never repeats.
5. Deliverables vs. Intermediates
- Local (.tmp/): All scraped data, logs, and temporary files. These are ephemeral and can be deleted.
- Global (Cloud): The "Payload." Google Sheets, Databases, or UI updates. A project is only "Complete" when the payload is in its final cloud destination.
📂 File Structure Reference

here is sample record in excel that expected to be done in this project when run this (nextjs, python, antigravity to do all this) build this tool exactly like this, first, have that skill.md first, 