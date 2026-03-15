# Project Antigravity — Task Plan v4

## Completed Phases

### Phase 0: Scaffolding ✅
- [x] SKILL.md created (v1 → v5 → v6)
- [x] BLAST.md created + updated (gemini.md → claude.md)
- [x] CLAUDE.md (Project Constitution) created + maintained
- [x] .env configured (Apify, Anthropic, Neon, Google Service Account)
- [x] Next.js project initialized
- [x] Python tools environment setup
- [x] winning-video-ads.md expert framework created

### Phase 1: Python Tools ✅
- [x] pipeline.py — Main orchestrator (dynamic brand discovery, fallback 15 brands, incremental saves, delta crawl, GSheet sync, strategic summary)
- [x] apify_crawler.py — Apify actor for Meta Ad Library (page_id + keyword search, brand verification)
- [x] ocr_gate.py — Stage 1: Metadata keyword check + Tesseract first-frame OCR
- [x] video_enricher.py — Download + FFmpeg + faster-whisper transcription
- [x] prescreen.py — Stage 2: Claude Haiku binary filter
- [x] record_generator.py — Stage 3: Claude Sonnet 9-field analysis + AdScore + strategic summary
- [x] gsheet_writer.py — Google Sheets writer (5 tabs, dedup, retry, threading lock, last crawled date)
- [x] excel_builder.py — 5-tab Excel output (openpyxl, styled, Top 5 green highlight)

### Phase 2: Infrastructure ✅
- [x] Prisma schema + Neon PostgreSQL (32-field AdRecord, CrawlJob, CompetitorScore)
- [x] API routes: POST/GET/DELETE /api/crawl, POST /api/resync, GET /api/export
- [x] Incremental DB persist (upsert by adLibraryId)
- [x] Delta crawl (skip list from DB)
- [x] Google Sheet sync during crawl (every 3 brands + final)

### Phase 3: Dashboard v1 ✅
- [x] CrawlLauncher component (market selector, start button)
- [x] CrawlProgress component (polls every 2s)
- [x] Intelligence Data panel (Open Google Sheet, Re-sync, completed jobs)
- [x] Pipeline Architecture display

### Bug Fixes + Scoring Upgrade ✅
- [x] Progress bar initial value fixed to 0
- [x] Stop Crawl button (DELETE endpoint, kills Python process, preserves saved data)
- [x] GSheet rate limit: sleep(2) between tab operations
- [x] Demo/full mode toggle removed (always 5 ads/brand)
- [x] Progress bar replaced with activity feed
- [x] AdScore formula: L40 + I25 + Iter25 + D10
- [x] adIterationCount used in scoring
- [x] creativePattern constrained enum added throughout pipeline
- [x] Sonnet outputs hookType/primaryAngle/frameworkName as direct JSON fields

### Phase 4: Top 5 Winners Feature ✅
- [x] Summary Sonnet pass after all ads collected (pattern aggregation, data-driven)
- [x] Strategic Summary section on dashboard (collapsible, 5 blocks)
- [x] Google Sheet Tab 5: Strategic Summary (dominant patterns + top 5 + recommendations)
- [x] Excel Tab 5: Strategic Summary (styled)
- [x] Conditional formatting in Excel Tab 1: green highlight for top 5 by AdScore

### Phase 5: Dashboard v2 ✅
- [x] Replace progress bar with live activity feed
- [x] Stop Crawl button (kill process, keep saved data)
- [x] Remove mode toggle, simplify to single Start button
- [x] Top 5 Winners / Strategic Summary section

### Phase 6: GSheet Optimization ✅
- [x] Batch API calls (clear + single batch update per tab)
- [x] sleep(2) between tab operations
- [x] Threading lock to prevent concurrent sync conflicts
- [x] "Last crawled: {date}" in Tab 4 (updated on every sync)

### Phase 7: Documentation Finalization ✅
- [x] task_plan.md reflects final state
- [x] progress.md up to date
- [x] CLAUDE.md reflects current schemas + rules
- [x] All .md files consistent with codebase

### Phase 8: Pipeline v2 — Bulk-First Architecture ✅
- [x] Rewrote pipeline.py with bulk-first architecture (crawl ALL → filter → rank → analyze)
- [x] Removed Haiku pre-screen stage (metadata filter after keyword search is sufficient)
- [x] Added pre-ranking: ads scored by data signals (longevity, impressions, iterations) BEFORE Sonnet
- [x] Enforced brand diversity: top 20 brands by ad count, top 5 ads per brand by pre-score
- [x] Fixed _matches_brand bug: return False for missing page_name (was True)
- [x] Updated CLAUDE.md with new architecture (Behavioral Rules, Architectural Invariants)
- [x] Updated SKILL.md section 3 with new 6-phase pipeline flow
- [x] Updated task_plan.md and progress.md

**Impact:**
- Crawl time: ~60+ min → ~15-20 min (3x faster)
- Apify calls: 8-13 → 3 (one per market)
- Ad quality: random first 5 → best 5 by data signals
- Brand diversity: dominated by one brand → enforced top 20
- Haiku cost: ~$0.015 → $0 (eliminated)
- Sonnet cost: same ~$2.25 (but runs on better ads)
