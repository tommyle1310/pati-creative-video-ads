# Project Antigravity — Objective

## North Star
Automatically identify the **winning ads** of the most successful creatine gummy competitors across US/UK/AU markets, then provide FusiForce's creative team with **ready-to-act intelligence** to 10x their ad performance and revenue.

## What "Winning" Means
A winning ad is one where the **advertiser keeps paying for it because it's profitable**. We can't see ROAS directly — Meta doesn't expose that. So we use **data proxy signals**:

1. **Longevity** — Ad running 90+ days = brand keeps paying = it converts
2. **Iteration Count** — Brand duplicating/scaling the creative = proven performer
3. **Impressions** — Meta's algorithm serves it at scale = it performs
4. **Duration** — Longer ads that stay live = viewers watch through

**AI (Sonnet) does NOT score quality.** It classifies (hookType, creativePattern, framework) and describes (8 analysis fields). Winner detection is purely data-driven.

## How It Works
1. User clicks "Start Crawl" on dashboard, selects markets (US/UK/AU)
2. Pipeline searches Meta Ad Library via Apify by keyword, dynamically discovers competitor brands
3. 3-stage filter: Metadata/OCR (free) → Haiku ($0.0002) → Sonnet ($0.03)
4. Each ad gets: 8-field forensic analysis + AdScore (data-driven)
5. Results saved to Neon PostgreSQL + Google Sheet (5 tabs)
6. Creative team reviews Top 5 by AdScore, watches actual videos, decides what to build

## Key Principle
**Data picks the winners. AI describes them. Humans decide what to build.**

See: winning-video-ads.md for the full expert framework (7-Signal Scorecard for human review).

## Stack
Meta Ad Library (via Apify) · Claude Sonnet · Claude Haiku · faster-whisper (local) · Tesseract OCR · Python · Next.js · Neon PostgreSQL · Google Sheets · openpyxl

## Deliverables
- **Google Sheet** (primary): 5-tab intelligence file, auto-synced during crawl
- **Dashboard**: Start/Stop crawl, live progress, Open Sheet, Re-sync, Top 5 Winners
- **Excel backup**: .xlsx file with same 5 tabs, styled
