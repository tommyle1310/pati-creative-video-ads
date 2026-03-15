# Project Antigravity — Progress Log

## 2026-03-10

### Session 1: Scaffolding
- Created SKILL.md (project blueprint)
- Created .env template with all required variables
- Created claude.md (Project Constitution) with schemas + rules + invariants
- Created task_plan.md, findings.md, progress.md
- Next: Initialize Next.js project, create architecture SOPs, build Excel builder

### Session 5: V2 — Fixed 15 Brands + New Fields + Improved Filters
**Changes made:**
1. **Prisma schema** — Added 3 new fields: `adStartDate` (String?), `adIterationCount` (Int?), `isActive` (Boolean). DB migrated + reset.
2. **Apify crawler** — Updated `_build_ad_library_url()` to match Meta Ad Library UI filters (active, video, all platforms, all languages). Added `ad_iteration_count` extraction from Apify response (`ad_count`/`collation_count`).
3. **Pipeline** — Replaced dynamic brand discovery with hardcoded 15 target brands. Each brand has search term, known landing page, and region. Min 5 ads/brand. Broader search fallback if too few results.
4. **Record generator** — `assemble_full_record()` now passes through: `adStartDate`, `adIterationCount`, `isActive`, `impressionsLower/Upper`, `spendLower/Upper`, `spendCurrency`.
5. **Excel builder** — Tab 1 expanded from 13 to 32 columns. New columns: VIDEO URL, AD START DATE, LONGEVITY (DAYS), AD ITERATIONS, STATUS, DURATION, VIDEO FORMAT, IMPRESSIONS, SPEND, CURRENCY, AD SCORE, HOOK TYPE, PRIMARY ANGLE, FRAMEWORK, PAGE NAME, AD LIBRARY ID, CRAWLED AT.
6. **GSheet writer** — Tab 1 headers updated to match Excel (32 columns). Row data builder updated.
7. **Route.ts** — `persistRecords()` now persists all new fields to DB (create + update).
8. **expected-each-record-data.md** — Rewritten with complete 32-field spec + 15 brand table.
9. **CLAUDE.md** — Updated AdRecord schema + behavioral rules for fixed brand approach.

## 2026-03-14

### Session 6: Bug Fixes + Brand Contamination + Documentation Overhaul

**Bugs identified:**
1. "Creatine Gummies" brand records contained wrong video data from other brands (Burst Creatine, Thrust, etc.)
2. Pipeline timed out at 30 minutes during Sonnet analysis
3. Progress bar showed >0% with 0 ads processed
4. Google Sheet rate limit (60 req/min) hit during resync with 180 records
5. No Stop Crawl button
6. Demo/Full mode toggle still in UI (no longer needed)

**Fixes applied:**
1. **Brand contamination fix** — Removed incorrect aliases ("burst creatine", "burst") from "Creatine Gummies" brand. Added "bear balanced" as correct alias. Changed search term to "bear balanced creatine gummies".
2. **Landing page domain check** — `_matches_brand()` now checks ad's `link_url` against brand's known `landing_page` domain as strongest signal. Prevents cross-brand contamination even when page_name is ambiguous.
3. **Timeout increase** — Demo timeout bumped from 30min → 45min (15 brands × Apify + Sonnet takes time).
4. **DB + Sheet cleared** for fresh recrawl with fixes.

**Documentation overhaul (BLAST.md protocol):**
1. **winning-video-ads.md** — Created expert framework (7-Signal Scorecard, creative patterns, EDGE brief). Added key principle: "Data picks winners, AI describes them, humans decide what to build." AI NEVER scores quality — only classifies.
2. **BLAST.md** — Fixed all `gemini.md` references → `claude.md`. Updated file structure. Added winner detection philosophy.
3. **SKILL.md** — Complete rewrite to v6.0. Removed all Foreplay/BullMQ references. Aligned with actual codebase (15 fixed brands, Apify, Google Sheets primary, no demo/full modes). Updated AdScore formula (added Iterations 25%, reduced Duration to 10%). Added creativePattern classification. Documented planned upgrades.
4. **task_plan.md** — Complete rewrite. Marked completed phases, listed current bug fixes, defined planned phases (Top 5 Winners, Dashboard v2, GSheet optimization).
5. **task.md** — Rewritten to reflect actual objective: data-driven winner detection for 10x revenue.
6. **progress.md** — This entry.

**Planned (not yet implemented):**
- Update AdScore formula in record_generator.py (add iteration count weight)
- Add creativePattern to Sonnet prompt output
- Update CLAUDE.md with new scoring + fields
- Dashboard: Stop Crawl button, remove mode toggle, replace progress bar with activity feed
- Top 5 Winners feature (summary Sonnet pass + dashboard button)
- GSheet rate limit fix (sleep between tabs, batch operations)

## 2026-03-15

### Session 7: Scoring Upgrade + creativePattern + Dashboard v2

**Backend fixes (record_generator.py, pipeline.py, gsheet_writer.py, excel_builder.py, route.ts):**
1. **AdScore formula updated** — New weights: Longevity 40% + Impressions 25% + Iterations 25% + Duration 10%. `compute_ad_score()` now takes `ad_iteration_count` param.
2. **creativePattern added** — Constrained enum (6 values + Unclassifiable). Added to Sonnet prompt, validated in record_generator.py, persisted to DB (Prisma migration), Excel, GSheet.
3. **Sonnet direct fields** — hookType, primaryAngle, frameworkName now requested as separate JSON fields from Sonnet (with regex fallback for backward compat).
4. **Demo/full mode removed** — pipeline.py always runs 5 ads/brand. route.ts no longer accepts/requires `mode`.
5. **GSheet rate limit** — sleep(2) between tab operations in gsheet_writer.py.
6. **Tab 4 legends updated** — Both excel_builder.py and gsheet_writer.py updated with new scoring formula + creativePattern definition.

**Dashboard v2 (CrawlLauncher.tsx, CrawlProgress.tsx, dashboard/page.tsx, route.ts):**
1. **Mode toggle removed** — CrawlLauncher simplified to markets + keyword + Start button. Shows "15 fixed brands, 5 ads/brand" estimates.
2. **Progress bar replaced** — CrawlProgress now shows activity feed: status pill, brand, region, stage, ads count. Subtle thin progress line instead of misleading percentage bar.
3. **Stop Crawl button** — Added to CrawlProgress component. DELETE /api/crawl?jobId=xxx kills Python process, marks job as failed, preserves saved data.
4. **Process tracking** — route.ts stores ChildProcess references in `processes` Map for kill support.

**All TypeScript compiles clean. No errors.**

### Session 7b: Top 5 Winners + GSheet Optimization + Documentation

**Phase 4: Top 5 Winners Feature:**
1. **Strategic summary Sonnet pass** — `generate_strategic_summary()` in record_generator.py. Analyzes aggregated pattern/hook/framework distributions from all crawled ads. Produces 5 fields: dominantPatterns, top5Analysis, marketInsights, strategicRecommendation, competitorRanking.
2. **Pipeline integration** — pipeline.py calls summary pass after all brands processed. Saves summary to `{job_id}-summary.json`. `run_pipeline()` now returns `(records, summary)` tuple.
3. **Excel Tab 5** — "Strategic Summary" tab with styled section blocks. Top 5 ads in Tab 1 get green highlight (`E6F9F0` fill).
4. **GSheet Tab 5** — "Strategic Summary" tab with section/content rows. Updated on each sync when summary is available.
5. **Dashboard section** — Collapsible "Strategic Summary" section with preview + full 5-block view. Route.ts GET serves latest summary from `.tmp/` directory.

**Phase 6: GSheet Optimization:**
1. **Threading lock** — `_gsheet_lock` prevents concurrent writes from pipeline's incremental sync points.
2. **"Last crawled" date** — Written to Tab 4 on every sync (not just initial creation). Finds existing cell and updates it.
3. **Tab 4 legend updated** — Now mentions Tab 5: Strategic Summary.
4. **Batch strategy confirmed** — Already using clear + single batch update per tab (optimal for Google Sheets API).

**Phase 7: Documentation Finalization:**
- task_plan.md updated to v4 — all phases marked complete.
- progress.md updated with all session work.
- All .md files consistent with codebase.

### Session 8: Pipeline v2 — Bulk-First Architecture Rewrite

**Problem identified:**
1. Pipeline interleaved crawl + filter + analyze per brand (SLOW — 60+ min)
2. Brand matching bug: `_matches_brand()` returned `True` for missing `page_name` — let wrong-brand ads through
3. No pre-ranking: Sonnet ran on first 5 ads that passed filters, not the best 5
4. Brand diversity not enforced: one brand (e.g. Omni) could dominate results
5. Haiku pre-screen was redundant after keyword-targeted Apify search + metadata filter

**Architecture change (Motion-inspired):**
```
OLD: For each brand → Apify → OCR → Haiku → Sonnet → save (sequential, slow)
NEW: Apify ALL markets → filter ALL → group by brand → pre-rank → Sonnet TOP only
```

**Changes made:**
1. **pipeline.py rewritten** — 6-phase bulk-first architecture:
   - Phase 1: Bulk crawl (1 Apify call per market = 3 calls)
   - Phase 2: Metadata filter (keyword check, instant, free)
   - Phase 3: Group by brand (cluster by page_name, top 20 brands)
   - Phase 4: Pre-rank (AdScore on raw metadata BEFORE Sonnet)
   - Phase 5: Sonnet analysis (on top 5 ads per brand by pre-score)
   - Phase 6: Strategic summary
2. **Haiku stage removed** — metadata filter after keyword search is sufficient
3. **Pre-ranking added** — `_pre_score()` computes lightweight AdScore from raw Apify data
4. **Brand diversity enforced** — MAX_BRANDS=20, ADS_PER_BRAND=5
5. **_matches_brand bug fixed** — returns `False` for missing page_name
6. **CLAUDE.md updated** — new Behavioral Rules, Architectural Invariants
7. **SKILL.md updated** — section 3 rewritten for 6-phase pipeline
8. **task_plan.md updated** — Phase 8 added

**Impact:**
- Crawl time: ~60+ min → ~15-20 min
- Apify calls: 8-13 → 3
- Ad quality: random → best by data signals
- Brand diversity: enforced (was dominated by one brand)
- Cost: same ~$2-3 total (Haiku savings offset by nothing — it was cheap)

**Files unchanged:** record_generator.py, excel_builder.py, gsheet_writer.py, apify_crawler.py, ocr_gate.py, prescreen.py, route.ts, all dashboard components, Prisma schema.
