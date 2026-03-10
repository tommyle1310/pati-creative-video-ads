# Project Antigravity — Session Handoff

## Date: 2026-03-10 (Session 3)

---

## 1. Current State

**Pipeline is WORKING end-to-end with incremental saves.** Apify crawl -> AI analysis -> Excel + JSON + DB persistence all work. Google Sheet writer is built but needs API enablement (see Step 1 below).

### What's Working
- `tools/pipeline.py` — Full pipeline: Apify -> Stage 1 (metadata) -> Stage 2 (Haiku) -> Stage 3 (Sonnet) -> Excel + DB
- **Incremental saves** — After each brand completes, records are saved to JSON + Excel rebuilt. Survives timeouts.
- **DB persistence** — Neon PostgreSQL via Prisma 7.x. Records persist in real-time as brands complete. **27 AdRecords + 1 CrawlJob currently in DB.**
- **Delta crawl** — Pipeline checks DB for existing `adLibraryId`s and skips already-crawled ads.
- **Ad links populated** — `foreplayUrl` falls back to ad library URL, `videoUrl` and `landingPageUrl` extracted from Apify data.
- **Live progress** — Dashboard shows real-time `adsProcessed` counter updating as records are assembled.
- **Export route** — Serves newest `.xlsx` from `data/` by modification time. Works with any file name.
- `tools/gsheet_writer.py` — **NEW**: Google Sheets writer using service account. Deduplicates by `adLibraryId`. 4-tab structure. Ready to use once APIs are enabled.
- `tools/apify_crawler.py` — Actor hash `XtaWFhbtfxyzqrFmd`, URL-based input, normalized output with video URLs.
- `src/app/api/crawl/route.ts` — Spawns pipeline, streams progress, incremental DB persist, CrawlJob persist.
- `src/app/api/export/route.ts` — Serves newest Excel from `data/`.
- `prisma/schema.prisma` — All 3 tables (AdRecord, CompetitorScore, CrawlJob) pushed to Neon.

### Latest E2E Test Results
```
Job: job-1773121957569-btt8r2
Result: 14 records from multiple brands (BulkBites, Rebeccas.Day, Phase One, etc.)
- Incremental saves working (Excel rebuilt after each brand)
- DB persistence working (27 records in Neon)
- Delta crawl working (skip IDs written before pipeline starts)
- Ad links populated: foreplayUrl=yes, videoUrl=yes, landingPageUrl=partial (depends on Apify data)
```

### What's NOT Working / Limitations
1. **Google Sheet sync** — `gsheet_writer.py` is built but Google Drive API + Sheets API not enabled in GCP project `creative-video-data` (project ID `291429549908`). See exact next steps below.
2. **Excel formatting** — openpyxl `.xlsx` format is poor for interaction. Google Sheets is the intended replacement.
3. **Export naming** — Currently uses job ID in filename. User wants: `latest-{regions}-{yyyy-MM-dd-HH-mm-ss}.xlsx` format.
4. **Dashboard state lost on reload** — In-memory job store clears on server restart. Only "Export Latest Data" button survives.
5. **Video transcription** — ffmpeg/faster-whisper not installed. Uses ad copy text as fallback.
6. **Landing page URL** — Often empty because Apify's `card.link_url` field is frequently null.

---

## 2. What Was Completed This Session

### Pipeline Timeout Fixed
- **Root cause**: Demo timeout was 10 minutes. Apify search takes ~2 min + Haiku/Sonnet ~30s per ad = ~17 min for 30 ads. ALL dashboard crawls were timing out with 0 records.
- **Fix**: Increased to 30 min demo / 90 min full.

### Incremental Saves (Biggest Fix)
- Pipeline now calls `_save_incremental()` after each brand completes
- Saves: JSON data file + rebuilds Excel + syncs Google Sheet (when enabled)
- Crawl route detects `[Incremental]` log line and triggers DB persistence immediately
- **Result**: Even if pipeline times out, all records processed up to that point are saved to JSON + Excel + DB

### DB Persistence Fixed
- Confirmed Prisma + PrismaNeonHttp adapter works correctly (tested with insert/delete)
- Manually persisted 9 existing records from `test-e2e-2-data.json` to Neon
- Incremental persistence now runs during crawl (not just at end)
- Added `persistCrawlJob()` to save CrawlJob records too

### Delta Crawl Implemented
- `writeSkipIds()` queries DB for all existing `adLibraryId`s before spawning pipeline
- Writes to `.tmp/{jobId}-skip-ids.json`
- Pipeline loads skip file and skips already-crawled ads
- Prevents duplicate processing across crawl runs

### Ad Links Fixed
- `foreplayUrl` fallback chain: `foreplayUrl` -> `share_url` -> `ad_library_url` -> `ad_snapshot_url` -> constructed `facebook.com/ads/library/?id={id}`
- `videoUrl` + `pageName` + `thumbnailUrl` now passed through `ad_meta` to record assembly
- `record_generator.py` updated to use `ad_meta` video/page fields as fallback

### Live Progress Counter Fixed
- Pipeline emits `adsProcessed` in PROGRESS updates
- Crawl route parses and updates `job.adsProcessed` in real-time

### Export Route Improved
- Searches ALL `.xlsx` files (not just prefix-matched)
- Sorts by modification time (newest first)
- Handles files with spaces/parentheses

### Ad Yield Increased
- Demo: 1 Apify search with limit=100 (fast)
- Full: 3 keyword variations (gummies/gummy/supplement gummies) with limit=200 each
- Deduplicates by ad ID across searches

### Google Sheets Writer Created
- `tools/gsheet_writer.py` — Full 4-tab writer using gspread + service account
- Deduplicates by `adLibraryId` (upserts existing, appends new)
- Integrated into `_save_incremental()` — syncs after each brand
- CLI: `python tools/gsheet_writer.py --data-file .tmp/data.json`
- **Blocked**: Needs Google Drive API + Sheets API enabled (see next steps)

---

## 3. Pending Tasks

### Immediate (Session 4 Start)
1. **Enable Google APIs** — Drive API + Sheets API in GCP console (see exact steps below)
2. **Test Google Sheet sync** — Run `python tools/gsheet_writer.py` after APIs enabled
3. **Export naming** — Implement `{type}-{regions}-{timestamp}.xlsx` format
4. **Dashboard persistence** — Load completed jobs from DB on page load (survive restarts)

### Medium Priority
5. **Landing page URL** — Many are empty. Consider extracting from ad snapshot page HTML.
6. **Install ffmpeg + faster-whisper** — For video transcription instead of ad copy fallback.
7. **BullMQ integration** — Wire up Redis for job persistence across server restarts.
8. **Full mode testing** — Run with multiple markets (US, UK, AU).

### Nice to Have
9. **Google Sheet as primary output** — Remove Excel dependency, use sheet URL as export.
10. **Sheet versioning** — One master sheet with all data, filter by region/date in sheet.
11. **Dashboard: show sheet URL** — After crawl, show Google Sheet link instead of download button.

---

## 4. Key Architecture & Decisions

### Incremental Save Architecture
```
Per-brand completion:
  pipeline.py _save_incremental()
    ├── JSON: .tmp/{jobId}-data.json (overwrite with all records so far)
    ├── Excel: data/antigravity-intelligence-{jobId}.xlsx (rebuild)
    ├── Excel: data/antigravity-intelligence-latest.xlsx (copy)
    └── GSheet: "Antigravity Intelligence" (upsert by adLibraryId)

crawl/route.ts detects "[Incremental]" in stderr
    └── persistRecords() → Neon PostgreSQL (upsert by adLibraryId)
```

### Data Flow
```
Apify (100-200 ads per keyword)
  → Group by brand → Score → Top 5
  → Per-brand loop:
      → Stage 1 (metadata keyword check)
      → Stage 2 (Claude Haiku $0.0002/call) → binary relevance
      → Stage 3 (Claude Sonnet ~$0.03/call) → 8-field analysis
      → Assemble AdRecord with ad links, video URL, scores
      → _save_incremental() → JSON + Excel + GSheet + DB
```

### Google Sheet Strategy (Proposed)
- **One master spreadsheet**: "Antigravity Intelligence"
- **Tab 1**: All ad records (deduped by adLibraryId, sorted by adScore)
- **Tab 2**: Production formulas
- **Tab 3**: Key takeaways (STEAL/KAIZEN/UPGRADE)
- **Tab 4**: Legend
- No per-crawl sheets — single source of truth, always growing
- Filter by region/date in Google Sheets UI

### Prisma 7.x + Neon
- `PrismaNeonHttp(connectionString, {})` constructor (NOT `neon()` function — verified)
- `prisma.config.ts` manually loads `.env` (runs before Next.js)
- All 3 tables working: AdRecord (27 rows), CrawlJob (1 row), CompetitorScore (0)

### Apify Actor
- Actor: `curious_coder/facebook-ads-library-scraper` (hash: `XtaWFhbtfxyzqrFmd`)
- Must use hash ID for API calls
- Input: Facebook Ad Library search URLs
- `count >= 10` required
- Output: nested `snapshot.cards[0]` structure

---

## 5. Exact Next Steps for New Session

### Step 1: Enable Google APIs (REQUIRED before Sheet sync works)
Go to Google Cloud Console for project `creative-video-data`:
1. Enable Google Drive API: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=291429549908
2. Enable Google Sheets API: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=291429549908
3. Wait 1-2 minutes for propagation

### Step 2: Test Google Sheet Sync
```bash
cd d:/jobs/pati/creative-project
PYTHONIOENCODING=utf-8 python tools/gsheet_writer.py --data-file .tmp/test-e2e-2-data.json
# Should print: Spreadsheet URL: https://docs.google.com/spreadsheets/d/...
```

### Step 3: Test Full Crawl with Sheet Sync
```bash
npm run dev
# In Postman/curl:
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"markets": ["US"], "keyword": "creatine gummies", "mode": "demo"}'
# Watch logs for: [Incremental] Google Sheet synced: https://...
```

### Step 4: Implement Export Naming
Update pipeline.py and export route to use format:
- `latest-us-2026-03-10-13-15-32.xlsx`
- `latest-us_uk-2026-03-10-13-15-32.xlsx`
- `us_uk-2026-03-10-13-15-32.xlsx` (non-latest exports)

### Step 5: Dashboard Persistence
Load completed jobs from CrawlJob table on dashboard mount:
```typescript
// In CrawlLauncher or dashboard page, fetch on mount:
const res = await fetch('/api/crawl');
const jobs = await res.json();
// Populate completedJobs from DB-persisted jobs
```

---

## 6. File Map (Modified/Created Files This Session)

```
tools/
  pipeline.py           <- UPDATED: incremental saves, delta crawl, keyword variations,
                           ad links, progress counter, Google Sheet sync
  gsheet_writer.py      <- NEW: Google Sheets writer (4-tab, dedup, service account)
  record_generator.py   <- UPDATED: videoUrl/pageName/pageId from ad_meta
  apify_crawler.py      <- Unchanged (working)
  excel_builder.py      <- Unchanged (working)

src/app/api/
  crawl/route.ts        <- UPDATED: timeout 30min, incremental DB persist,
                           CrawlJob persist, delta crawl writeSkipIds,
                           adsProcessed in progress parsing
  export/route.ts       <- UPDATED: search all .xlsx, sort by mtime, handle any filename

src/lib/db/
  prisma.ts             <- UPDATED: try/catch around client creation

credentials.json        <- Google service account (DO NOT COMMIT)
```

---

## 7. API Keys Status

| Key | Status | Notes |
|-----|--------|-------|
| `ANTHROPIC_API_KEY` | Working | Haiku + Sonnet verified |
| `APIFY_API_TOKEN` | Working | Actor hash: XtaWFhbtfxyzqrFmd |
| `DATABASE_URL` | Working | Neon PostgreSQL, 27 records persisted |
| `REDIS_URL` | Set (Upstash) | Not yet used (BullMQ not wired) |
| `META_ACCESS_TOKEN` | EMPTY | Not needed (Apify works) |
| `FOREPLAY_API_KEY` | Set but non-functional | API returns 404 |
| `credentials.json` | Present | GCP project `creative-video-data`. **Need to enable Drive + Sheets APIs** |

---

## 8. DB State

| Table | Row Count | Notes |
|-------|-----------|-------|
| AdRecord | 27 | From test-e2e-2 (9) + job-1773119045338 + job-1773121957569 |
| CrawlJob | 1 | Latest dashboard crawl |
| CompetitorScore | 0 | Not yet persisted (pipeline scores in-memory only) |

---

## 9. Python Dependencies

| Package | Status | Needed For |
|---------|--------|------------|
| `anthropic` | Installed | Haiku + Sonnet API calls |
| `requests` | Installed | Apify API |
| `openpyxl` | Installed | Excel builder |
| `gspread` | Installed (6.2.1) | Google Sheets writer |
| `google-auth` | Installed (2.49.0) | Service account auth |
| `faster-whisper` | NOT installed | Video transcription |
| `pytesseract` | NOT installed | OCR gate |
| ffmpeg (binary) | NOT installed | Video download |
