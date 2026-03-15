# Project Antigravity
## Competitive Ad Intelligence System for FusiForce

> **All diagrams below are available as live visuals at `/showcase`** — run `npm run dev` and visit `http://localhost:3000/showcase` to screenshot each one.

---

## What Is This?

Antigravity is an automated system that finds the **most successful competitor ads** in the creatine gummies market, analyzes exactly why they work, and delivers ready-to-act intelligence so our creative team can build better ads — faster.

Instead of manually scrolling through Meta Ad Library trying to guess which competitor ads are working, Antigravity does it automatically across **3 markets (US, UK, Australia)** in about 15-20 minutes.

[insert img of dashboard — Start Crawl screen with market selector buttons]

---

## The Core Philosophy

> **Data picks the winners. AI describes them. Humans decide what to build.**

We don't ask AI to guess which ads are "good." We use **hard data signals** — how long an ad has been running, how many impressions Meta gave it, how many times the brand duplicated it. If a brand keeps paying for an ad for 90+ days, that ad is making them money. Period.

AI's job is different: it watches the video, reads the script, and breaks down **how** the ad was constructed — the hook type, the psychological triggers, the script framework, the visual structure. It's a forensic analyst, not a judge.

The creative team then reviews the top winners, watches the actual videos, and decides what to build for FusiForce.

[insert img of the philosophy diagram: DATA (longevity, impressions, iterations) → AI (classifies hook, pattern, framework) → HUMANS (decide what to build)]

---

## How It Works — The 6-Phase Pipeline

Think of it like a funnel. We start with hundreds of raw ads and narrow down to the best ~75, fully analyzed with actionable intelligence.

[insert img of funnel diagram showing: 600 raw ads → 300 filtered → 100 ranked → 75 analyzed → Top 5 Winners]

---

### Phase 1: Bulk Crawl

**What happens:** The system searches "creatine gummies" on the Meta Ad Library for each market (US, UK, AU). One search per market — that's it. Each search returns 100-200 active video ads.

**Why it matters:** Instead of searching brand-by-brand (which is slow and means we only find brands we already know about), we search by keyword. This means we **discover new competitors automatically** — brands we've never heard of that are running creatine gummy ads right now.

**Time:** ~10 minutes for all 3 markets.

[insert img of Meta Ad Library search results page]

---

### Phase 2: Metadata Filter

**What happens:** Every ad gets a quick text check. Does it actually mention creatine/gummies? Does it have a video? Does it have a brand name (page_name)? We also reject ads that are clearly off-topic (protein powder, pre-workout, whey, etc.).

**Why it matters:** The keyword search sometimes returns loosely related ads. This filter costs nothing and takes milliseconds — it removes the noise before we spend any money on AI analysis.

**Cost:** $0. Instant.

---

### Phase 3: Group by Brand

**What happens:** All remaining ads are clustered by their Facebook page name. We now have a clear picture: "Brand X has 15 ads, Brand Y has 8, Brand Z has 3..." We sort brands by how many ads they're running (most active = most interesting).

**Why it matters:** This gives us brand diversity. Instead of analyzing 50 ads from one dominant brand, we enforce a cap: **top 20 brands, max 5 ads per brand.** This ensures the creative team sees a wide range of strategies, not just one competitor's playbook.

**Fallback:** If the keyword search finds fewer than 5 brands (unlikely but possible), the system supplements with 15 known competitors we've pre-loaded (Omni Creatine, Create Wellness, Legion Athletics, Bear Balanced, Bounce Nutrition, Momentous, Organifi, OVRLOAD, Novomins, Animal Pak, Thurst, Force Factor, NutreeBio, MMUSA, Swoly).

[insert img of brand grouping visualization — bar chart showing brands sorted by ad count]

---

### Phase 4: Pre-Rank (The Secret Sauce)

**What happens:** Before we spend any money on AI, every ad gets scored using **only data signals**:

| Signal | Weight | Why |
|--------|--------|-----|
| **Longevity** (how many days the ad has been running) | 40% | If a brand keeps paying for 90+ days, it's profitable. Strongest signal. |
| **Impressions** (how many people Meta showed it to) | 25% | Meta's algorithm gives volume to ads that perform. High impressions = Meta thinks it works. |
| **Iteration Count** (how many times the brand duplicated this creative) | 25% | When a brand makes 5-10 versions of the same ad, they're scaling a proven winner. Most underused signal in the industry. |
| **Duration** (video length) | 10% | Longer ads that stay live = people actually watch through. Weaker signal alone, but validates the others. |

The formula:

```
AdScore = (Longevity × 40%) + (Impressions × 25%) + (Iterations × 25%) + (Duration × 10%)
```

Score range: 0 to 10. A score of 8+ means the ad is almost certainly profitable for the brand running it.

**For each brand, we pick the top 5 ads by this score.** Then we sort the entire queue globally — best ads first. This means AI analyzes the most promising ads first.

**Why it matters:** This is the difference between analyzing random ads vs. analyzing the best ads. Same AI cost, 10x better output quality.

**Cost:** $0. Instant.

[insert img of pre-ranking table showing ads sorted by AdScore with longevity, impressions, iterations columns]

---

### Phase 5: AI Analysis (Claude Sonnet)

**What happens:** Each pre-ranked ad gets a deep forensic breakdown by Claude Sonnet (Anthropic's advanced AI). The AI receives:
- The video transcript (extracted via speech-to-text)
- The first frame of the video (visual analysis)
- All metadata (brand, duration, landing page)

Sonnet produces **8 analysis fields** for each ad:

1. **Hook** — What type of hook is this? (e.g., "Problem-Curiosity Hook") Why does it stop the scroll? What psychological mechanism does it trigger?

2. **Concept** — What's the Big Idea? What's the strategic architecture? What secondary angles does it use?

3. **Script Breakdown** — What framework does the script follow? (e.g., "PAS Compression" = Problem-Agitate-Solution). Beat-by-beat breakdown with timecodes.

4. **Visual** — A-Roll (talent on camera), B-Roll (product shots, lifestyle), C-Roll (text supers, graphics). What's the visual strategy?

5. **Psychology** — What cognitive biases are being triggered? (social proof, loss aversion, authority). How does it resonate specifically for this market (US gym culture vs. AU wellness culture)?

6. **CTA** — How does the call-to-action work? What's the offer mechanism? What job does the landing page do?

7. **Key Takeaways** — Actionable items for FusiForce:
   - **STEAL**: What can we directly adopt? (minimum 2)
   - **KAIZEN**: What can we improve on? (minimum 2)
   - **UPGRADE**: What's the one big opportunity they're missing? (1)

8. **Production Formula** — A literal shoot brief. 5+ phases, each with: camera direction, voiceover script, text super overlay. Our creative team can hand this to production.

**Sonnet also classifies** each ad into one of 6 creative patterns:
- Problem-First UGC
- Result-First Scroll Stop
- Curiosity Gap
- Social Proof Cascade
- Comparison/Versus
- Authority Demo

**Important:** The AI never says "this is a good ad" or "this hook is effective." It only describes and classifies. The AdScore (from Phase 4) determines ranking. AI and data have separate jobs.

**Cost:** ~$0.03 per ad. For 75 ads = ~$2.25.

[insert img of a sample analysis card from the dashboard — showing all 8 fields for one ad]

---

### Phase 6: Strategic Summary

**What happens:** After all ads are analyzed, one final AI pass looks at the **entire dataset** to find patterns:

- Which creative patterns dominate each market?
- What hook types appear most in the top-scoring ads?
- What frameworks are overused vs. underexploited?
- What are the top 5 winning ads overall and why?
- Strategic recommendations for FusiForce based on competitive gaps

**Why it matters:** Individual ad analysis is useful, but the **patterns across 75 ads** tell the real story. If 60% of top US ads use "Problem-First UGC" but nobody in Australia uses it — that's a market opportunity.

**Cost:** ~$0.03 (one Sonnet call).

[insert img of strategic summary section on dashboard — showing dominant patterns per market + top 5 winners]

---

## What Gets Delivered

### 1. Google Sheet (Primary Output)

A 5-tab intelligence file that auto-syncs during the crawl:

| Tab | What's In It |
|-----|-------------|
| **Ad Intelligence Records** | All ads, 32 columns, sorted by AdScore. Every data point + all 8 analysis fields. Filter by market, brand, hook type, creative pattern. |
| **Production Formulas** | Just the shoot briefs. Hook type, angle, framework, full production formula. Hand this to the creative team. |
| **Key Takeaways** | STEAL / KAIZEN / UPGRADE for every ad. Actionable items only. |
| **Legend & Instructions** | What every column means, how scoring works, how to use the data. |
| **Strategic Summary** | Dominant patterns, top 5 winners, market-specific recommendations. The executive overview. |

[insert img of Google Sheet Tab 1 — showing ads sorted by AdScore with highlighted top 5]

[insert img of Google Sheet Tab 2 — showing Production Formulas tab]

---

### 2. Dashboard

A web interface for launching crawls and viewing results:

- **Start/Stop Crawl** — Select markets, click one button. Live activity feed shows current brand being processed.
- **Top Winners** — Slider to select how many (3-20). Expandable cards with full analysis. Diversity-constrained: max 2 per brand, at least 1 per market, pattern variety enforced.
- **Re-sync** — One click to refresh the Google Sheet from the database.
- **Open Sheet** — Direct link to the Google Sheet.

[insert img of dashboard — Top Winners section with expandable cards]

---

### 3. Excel Backup

Same 5 tabs as the Google Sheet, formatted with openpyxl. Top 5 ads highlighted in green. Saved locally as a .xlsx file.

---

## Cost Per Run

| Item | Cost |
|------|------|
| Apify crawl (3 markets) | ~$0.38 |
| Metadata filter + pre-ranking | $0 |
| Claude Sonnet analysis (~75 ads) | ~$2.25 |
| Strategic summary | ~$0.03 |
| Google Sheet sync | $0 |
| **Total per full crawl** | **~$2.66** |

Three markets. 75 fully-analyzed ads. Complete competitive intelligence. Under $3.

[insert img of cost breakdown pie chart]

---

## Architecture Overview

```
User clicks "Start Crawl" on Dashboard
         |
         v
   Next.js API Route (POST /api/crawl)
         |
         v
   Python Pipeline (6 phases)
    |        |          |
    v        v          v
  Apify   Claude     Google
  (Meta    Sonnet    Sheets
   Ads)   (Analysis)  (Output)
    |        |          |
    v        v          v
   Neon PostgreSQL (Source of Truth)
         |
         v
   Dashboard displays results
```

**Tech stack:**
- **Frontend:** Next.js (React) dashboard
- **Backend:** Next.js API routes + Python pipeline scripts
- **AI:** Claude Sonnet (analysis) — no Haiku pre-screen needed
- **Data source:** Meta Ad Library via Apify
- **Database:** Neon PostgreSQL (cloud, serverless)
- **Output:** Google Sheets (primary), Excel (backup)
- **Video processing:** FFmpeg + faster-whisper (speech-to-text)

[insert img of full architecture diagram with all components and data flow]

---

## Smart Features

### Delta Crawl
Run the pipeline again and it **skips ads already in the database.** Only new ads get analyzed. Same intelligence, no wasted AI spend.

### Dynamic Brand Discovery
We don't maintain a static list of competitors. The system discovers them automatically from keyword search results. New brand starts running creatine gummy ads? We find them on the next crawl.

### Incremental Saves
If the pipeline crashes or gets stopped mid-crawl, **all records analyzed so far are preserved.** Nothing is lost. The Google Sheet and database stay up to date with whatever was completed.

### Diversity Constraints
Top Winners selection enforces variety: max 2 ads per brand, max 40% from one hook type, at least 1 ad per market. This prevents the creative team from only seeing one competitor's approach.

---

## The B.L.A.S.T. Protocol

This project was built following a structured development protocol:

| Phase | Name | What It Means |
|-------|------|--------------|
| **B** | Blueprint | Define the vision, data schemas, and rules before writing any code. |
| **L** | Link | Verify all API connections (Apify, Anthropic, Google Sheets, Neon) work before building logic. |
| **A** | Architect | Build in 3 layers: SOPs (documentation) → Navigation (routing logic) → Tools (Python scripts). |
| **S** | Stylize | Format all outputs for professional delivery. Google Sheet tabs, Excel styling, dashboard UI. |
| **T** | Trigger | Deploy to production with automated triggers. |

**Key principle:** If a tool fails, we analyze → patch → test → update documentation. The system self-heals.

[insert img of B.L.A.S.T. protocol flow diagram]

---

## What This Means for FusiForce

1. **No more guessing** which competitor ads work. Data tells us.
2. **No more manual research.** 15-20 minutes replaces hours of scrolling.
3. **Ready-to-shoot briefs.** Production formulas can go straight to the creative team.
4. **Market-specific insights.** What works in US gym culture is different from AU wellness culture. We see both.
5. **Continuous intelligence.** Run it weekly. Delta crawl means we only pay for new ads.
6. **Under $3 per run.** Full competitive intelligence for less than a coffee.

[insert img of before/after comparison — manual research vs. Antigravity output]

---

*Built with the B.L.A.S.T. protocol. Powered by Claude Sonnet, Meta Ad Library, and data-driven scoring.*
