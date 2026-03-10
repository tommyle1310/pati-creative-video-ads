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
