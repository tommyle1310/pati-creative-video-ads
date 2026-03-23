# Project Antigravity — Complete Feature Workflow (IPO)

> **Every feature documented with Input → Process → Output at every step.**

---

## Table of Contents

1. [Ad Intelligence Crawler (6-Phase Pipeline)](#1-ad-intelligence-crawler)
2. [Dashboard & Crawl Management](#2-dashboard--crawl-management)
3. [Boards & Saved Ads](#3-boards--saved-ads)
4. [Creative Brief Generation](#4-creative-brief-generation)
5. [Product Profiles](#5-product-profiles)
6. [Video Ad Studio (7-Step Wizard)](#6-video-ad-studio)
7. [Settings & Configuration](#7-settings--configuration)
8. [Cross-Feature Data Flows](#8-cross-feature-data-flows)

---

## 1. Ad Intelligence Crawler

**Core Principle:** "Data picks the winners. AI describes them. Humans decide what to build."

**Pipeline:** Bulk Crawl → Metadata Filter → Group by Brand → Pre-Rank → AI Analysis → Strategic Summary

### Phase 1: Bulk Crawl

| | Detail |
|---|---|
| **Input** | Markets selected by user (US, UK, AU), keyword ("creatine gummies") |
| **Process** | 1. `POST /api/crawl` creates in-memory job, spawns Python child process (`tools/pipeline.py`)<br>2. Python calls Apify actor (`curious_coder/facebook-ads-library-scraper`) **once per market** (max 3 calls)<br>3. Apify searches Meta Ad Library with filters: `media_type=video`, `active_status=active`<br>4. Returns ~100–200 raw video ads per market in JSON<br>5. Each ad tagged with `_market` field for regional tracking |
| **Output** | `all_raw_ads` list (tagged ad dicts), `CrawlJob.status = "crawling"` |
| **Duration** | ~10 minutes |
| **Cost** | ~$0.005/ad via Apify |
| **Key Files** | `tools/pipeline.py:395-414`, `tools/apify_crawler.py` |

### Phase 2: Metadata Filter

| | Detail |
|---|---|
| **Input** | `all_raw_ads` from Phase 1 |
| **Process** | 1. **Delta Crawl Check** — Load existing `adLibraryId`s from DB (written to `.tmp/{jobId}-skip-ids.json` before pipeline starts). Skip any ad already processed.<br>2. **Video URL Required** — Must have extractable video URL. Tries: `card.video_hd_url`, `card.video_sd_url`, `snapshot.videos[0]`, fallback snapshot URL extraction.<br>3. **Keyword Filter** — Two-tier:<br>&nbsp;&nbsp;• Primary: `_passes_metadata_filter()` checks for gummy-specific keywords ("gummies", "gummy", "crealyte") OR creatine + gummy indicator<br>&nbsp;&nbsp;• Fallback: `passes_metadata_gate()` from `ocr_gate.py` (handles list fields from Apify)<br>&nbsp;&nbsp;• Excludes: "protein powder", "pre-workout", "whey", "bcaa", "creatine powder"<br>4. **Brand Identity Required** — Ad must have non-empty `page_name`. Reject ads with missing brand identity. |
| **Output** | `filtered_ads` list — typically 30–50% of raw ads pass |
| **Duration** | Instant (no API calls) |
| **Cost** | Free |
| **Key Files** | `tools/pipeline.py:417-448`, `tools/ocr_gate.py` |

### Phase 3: Group by Brand

| | Detail |
|---|---|
| **Input** | `filtered_ads` from Phase 2 |
| **Process** | 1. **Cluster by Page Name** — Group ads by `page_name.lower()` (brand identity)<br>2. **Fallback Brand Enrichment** — If `page_name` matches a known brand from `FALLBACK_BRANDS` (15 brands), enrich with landing page URL. Fallback used ONLY when dynamic discovery returns <5 brands.<br>3. **Sort by Activity** — Brands ranked by ad count DESC (most active first)<br>4. **Diversity Enforcement** — Limit to top 20 brands (`MAX_BRANDS`) |
| **Output** | `brands_to_process` list (max 20 brands, ranked by ad count) |
| **Duration** | Instant |
| **Cost** | Free |
| **Key Files** | `tools/pipeline.py:451-536` |

### Phase 4: Pre-Rank (Data Signals Only)

| | Detail |
|---|---|
| **Input** | `brands_to_process` from Phase 3 |
| **Process** | For each brand:<br>1. Deduplicate ads by `adLibraryId`<br>2. Pre-score ALL ads using data signals only (no AI):<br>&nbsp;&nbsp;`AdScore = (Longevity × 0.40) + (Impressions × 0.25) + (Iterations × 0.25) + (Duration × 0.10)`<br>&nbsp;&nbsp;• `LongevityScore = min(longevityDays / 90, 1.0) × 10`<br>&nbsp;&nbsp;• `ImpressionsScore = log10(impressions_upper) / log10(10M) × 10`<br>&nbsp;&nbsp;• `IterationScore = min(adIterationCount / 10, 1.0) × 10`<br>&nbsp;&nbsp;• `DurationScore = min(durationSeconds / 120, 1.0) × 10`<br>3. Sort by pre-score DESC per brand<br>4. Select top 5 ads per brand (`ADS_PER_BRAND = 5`)<br>5. Global ranking: sort entire queue by pre-score DESC |
| **Output** | `ranked_queue` list (max 100 ads = 20 brands × 5 ads, globally sorted by pre-score) |
| **Duration** | Instant |
| **Cost** | Free |
| **Key Files** | `tools/pipeline.py:539-581`, `tools/record_generator.py` |

### Phase 5: AI Analysis (Sonnet)

For each ad in `ranked_queue`:

#### Step A: Video Enrichment

| | Detail |
|---|---|
| **Input** | Single ad from `ranked_queue` with video URL |
| **Process** | 1. Download video from URL<br>2. Extract duration (FFmpeg or OpenCV)<br>3. Extract frames at 2 FPS, max 60 frames, save as JPEGs to `.tmp/jobs/{jobId}/{adId}/`<br>4. Extract audio track (FFmpeg)<br>5. Run Whisper (OpenAI) for transcript<br>6. If no audio, fallback: `"[Ad copy text — no audio voiceover detected] {ad_text}"` |
| **Output** | `enrichment` dict: `{ transcript, durationSeconds, videoFormat, framePaths[], videoUrl }` |
| **Key Files** | `tools/video_enricher.py` |

#### Step B: Sonnet Forensic Analysis (8 Fields)

| | Detail |
|---|---|
| **Input** | Key frames (base64 JPEGs), audio transcript, ad metadata (brand, region, duration, landing page) |
| **Process** | Call Claude Sonnet with system prompt + frames + transcript. Sonnet produces 8 rich analysis fields + 4 classification fields:<br>1. `hook` — Named hook TYPE + "Why it stops the scroll" paragraph<br>2. `concept` — Big Idea one-liner + strategy + secondary angles<br>3. `scriptBreakdown` — Named framework + numbered beats with timecodes (VISUAL + AUDIO)<br>4. `visual` — A-Roll/B-Roll/C-Roll real content from frames<br>5. `psychology` — Primary audience + named cognitive biases + execution<br>6. `cta` — Mechanism + final frames + landing page job<br>7. `keyTakeaways` — ≥2 STEAL + ≥2 KAIZEN + 1 UPGRADE with FusiForce implementation<br>8. `productionFormula` — FORMAT + ≥5 phases, each with screen direction + voiceover + TEXT SUPER<br>**Classification (descriptive, never scoring):**<br>• `hookType` — short string (e.g., "Problem-Curiosity Hook")<br>• `primaryAngle` — short string (e.g., "Taste-First Positioning")<br>• `frameworkName` — short string (e.g., "PAS Compression")<br>• `creativePattern` — EXACTLY one of 7 values: Problem-First UGC \| Result-First Scroll Stop \| Curiosity Gap \| Social Proof Cascade \| Comparison/Versus \| Authority Demo \| Unclassifiable |
| **Output** | Analysis JSON (8 fields + 4 classifications) |
| **Cost** | ~$0.03 per ad |
| **Key Files** | `tools/record_generator.py:37-250` |

#### Step C: Assemble Full Record

| | Detail |
|---|---|
| **Input** | Analysis JSON + enrichment + ad metadata |
| **Process** | 1. Compute final `adScore` from enriched data<br>2. Extract all 32 metadata fields (brand, region, dates, impressions, spend, etc.)<br>3. Assemble complete `AdRecord` (32 fields)<br>4. **Incremental save:** after each ad → JSON save (`.tmp/{jobId}-data.json`); after each brand → full save (JSON + Excel + GSheet sync) |
| **Output** | Complete `AdRecord` persisted to JSON, Excel, Google Sheet, and PostgreSQL (via Node.js route) |
| **Key Files** | `tools/pipeline.py:715-771`, `tools/record_generator.py` |

### Phase 6: Strategic Summary

| | Detail |
|---|---|
| **Input** | All `AdRecord`s from the crawl |
| **Process** | 1 Sonnet call analyzing all records for:<br>• Dominant creative patterns (count per `creativePattern`)<br>• Top 5 winners (highest `adScore`, excluding: `longevityDays < 14` OR `adIterationCount == 1 AND longevityDays < 30`)<br>• Market insights (longevity, iteration trends per region)<br>• Competitor ranking (brands by composite score)<br>• Strategic recommendation for FusiForce |
| **Output** | Summary JSON saved to `.tmp/{jobId}-summary.json`, written to Google Sheet Tab 5 |
| **Cost** | ~$0.10 |
| **Key Files** | `tools/pipeline.py:780-802` |

### Output Destinations

| Destination | Tabs/Structure | Key |
|---|---|---|
| **Google Sheets** ("Antigravity Intelligence") | Tab 1: Ad Intelligence Records (32 cols, sorted by adScore DESC)<br>Tab 2: Production Formulas (hook type indexed)<br>Tab 3: Key Takeaways (STEAL/KAIZEN/UPGRADE parsed)<br>Tab 4: Legend & Instructions (static docs)<br>Tab 5: Strategic Summary (per-crawl patterns) | Dedup by `adLibraryId` (upsert). Rate limit: 60 req/min, 2s sleep between tabs. |
| **Excel** | Same 5 tabs | File: `latest-{regions}-{timestamp}.xlsx` in `data/` |
| **PostgreSQL (Neon)** | `AdRecord` table (32 fields) + `CrawlJob` table | Upsert by `adLibraryId`. Delta crawl on subsequent runs. |

---

## 2. Dashboard & Crawl Management

### 2.1 Dashboard Load

| | Detail |
|---|---|
| **Input** | User navigates to `/dashboard` |
| **Process** | `GET /api/crawl` (no jobId) fetches:<br>• In-memory active jobs<br>• Completed jobs from DB (`CrawlJob` table)<br>• Total ads in DB count<br>• DB regions<br>• Latest strategic summary |
| **Output** | Dashboard UI: Google Sheet link, total ads count, completed job cards, Top Winners panel, Ad Explorer |
| **Key Files** | `src/app/dashboard/page.tsx` |

### 2.2 Launch Crawl

| | Detail |
|---|---|
| **Input** | User selects markets (US/UK/AU checkboxes), keyword fixed to "creatine gummies" |
| **Process** | 1. User clicks "Start Crawl" in `CrawlLauncher` component<br>2. `POST /api/crawl` with `{ markets, keyword, yourBrand }`<br>3. Server creates in-memory job, writes skip IDs file, spawns Python subprocess<br>4. Returns `jobId` immediately |
| **Output** | Job ID returned, UI switches to progress view |
| **Key Files** | `src/app/components/CrawlLauncher.tsx`, `src/app/api/crawl/route.ts` |

### 2.3 Live Progress Tracking

| | Detail |
|---|---|
| **Input** | Active `jobId` from launch |
| **Process** | `CrawlProgress` component polls `GET /api/crawl?jobId=...` every 2 seconds. Displays:<br>• Status emoji + label (Scoring → Crawling → Analysing → Building Excel → Complete)<br>• Ads processed / total<br>• Current brand, current region<br>• Progress bar (0–100%) |
| **Output** | Real-time progress UI with status, percentage, current brand info |
| **Key Files** | `src/app/components/CrawlProgress.tsx` |

### 2.4 Stop Crawl

| | Detail |
|---|---|
| **Input** | User clicks "Stop Crawl" button |
| **Process** | `DELETE /api/crawl?jobId=...`<br>• Sets `job.status = "stopping"`<br>• Pipeline finalizes current ad, persists all data, marks "complete"<br>• Sets `error = "Stopped by user"` |
| **Output** | Crawl stops gracefully, all processed data preserved |

### 2.5 Crawl Completion

| | Detail |
|---|---|
| **Input** | `status === "complete"` detected by polling |
| **Process** | 1. `onComplete()` callback fires<br>2. Auto-triggers `POST /api/resync` to re-sync DB → Google Sheet<br>3. Loads updated DB ad count<br>4. Updates UI with "Open Google Sheet" link |
| **Output** | Final dashboard state with sheet link, updated counts |

### 2.6 Top Winners Panel

| | Detail |
|---|---|
| **Input** | Ads from DB |
| **Process** | Queries top ads by `adScore` with market diversity. Displays:<br>• Brand, hookType, creativePattern badges<br>• AdScore (color-coded: emerald ≥7, amber ≥5, red <5)<br>• Longevity, iterations, duration, impressions<br>• Checkbox selection for brief generation<br>• Bookmark icon for save-to-board<br>• "Watch" button → VideoPlayerModal |
| **Output** | Ranked ad cards with action buttons |
| **Key Files** | `src/app/components/TopWinners.tsx` |

### 2.7 Ad Explorer

| | Detail |
|---|---|
| **Input** | All ads in DB |
| **Process** | Filterable/sortable table:<br>• Filters: longevity, iterations, pattern, market, brand<br>• Sort by any metric<br>• Same action buttons as Top Winners (select, bookmark, watch) |
| **Output** | Filterable ad browse interface |
| **Key Files** | `src/app/components/AdExplorer.tsx` |

---

## 3. Boards & Saved Ads

### 3.1 Create Board

| | Detail |
|---|---|
| **Input** | User clicks "Create Board" on `/saved` page. Fills: name (required), description (optional), color (8 presets), icon (8 presets) |
| **Process** | `POST /api/boards` with `{ name, description, color, icon }` → Prisma creates Board record |
| **Output** | New board card appears on page with colored stripe, icon, name |
| **Key Files** | `src/app/saved/page.tsx`, `src/app/api/boards/route.ts` |

### 3.2 View Boards List

| | Detail |
|---|---|
| **Input** | User navigates to `/saved` |
| **Process** | `GET /api/boards` → returns boards with `adCount` and `previewAds` (brand, videoUrl, thumbnailUrl) |
| **Output** | Board cards grid: colored strip, icon, name, description, ad count, creation date. Click → `/saved/{boardId}` |

### 3.3 Save Ad to Board

| | Detail |
|---|---|
| **Input** | User clicks bookmark icon on ad card (in TopWinners/AdExplorer/Trending). Dropdown shows all boards. |
| **Process** | Click board name → `POST /api/boards/{boardId}/ads` with `{ adId, notes? }`<br>• Server verifies board exists, ad exists<br>• Creates `SavedAd` record<br>• Unique constraint `[boardId, adId]` prevents duplicates |
| **Output** | Success: bookmark fills, toast notification. 409 if already saved. |
| **Key Files** | `src/app/components/SaveToBoardDropdown.tsx`, `src/app/api/boards/[boardId]/ads/route.ts` |

### 3.4 View Board Detail

| | Detail |
|---|---|
| **Input** | User clicks board card → `/saved/{boardId}` |
| **Process** | `GET /api/boards/{boardId}` → returns board with all `savedAds` (each includes full `AdRecord`)<br>• Sort options: by saved date (newest), by AdScore, by longevity |
| **Output** | Board header (colored stripe, name, description) + saved ad cards with: AdScore badge, brand, region, hookType, longevity, iterations, duration, impressions, Watch/Ad Library buttons, expandable notes, delete button |
| **Key Files** | `src/app/saved/[boardId]/page.tsx` |

### 3.5 Edit Saved Ad Notes

| | Detail |
|---|---|
| **Input** | User expands notes section on a saved ad, types note, clicks save |
| **Process** | `PATCH /api/boards/{boardId}/ads/{savedAdId}` with `{ notes }` |
| **Output** | Note persisted, shown on card |

### 3.6 Remove Ad from Board

| | Detail |
|---|---|
| **Input** | User clicks delete button on saved ad |
| **Process** | `DELETE /api/boards/{boardId}/ads/{savedAdId}` → deletes `SavedAd` record (not the `AdRecord` itself) |
| **Output** | Ad removed from board view |

### 3.7 Delete Board

| | Detail |
|---|---|
| **Input** | User clicks delete on board card |
| **Process** | `DELETE /api/boards/{boardId}` → cascade deletes all `SavedAd` records for that board |
| **Output** | Board and all save relationships removed. Original ads untouched. |

---

## 4. Creative Brief Generation

### 4.1 Open Brief Generator

| | Detail |
|---|---|
| **Input** | User selects 1–3 ads via checkboxes in TopWinners/AdExplorer, clicks "Generate Brief" floating action bar |
| **Process** | Opens `BriefGenerateModal` with selected `adIds` |
| **Output** | Modal dialog with form fields |
| **Key Files** | `src/app/components/BriefGenerateModal.tsx` |

### 4.2 Configure Brief

| | Detail |
|---|---|
| **Input** | User fills modal form:<br>• **Product dropdown** — FusiForce, MenoMate, FloraFresh, Shilajit, or Custom<br>• **Landing Page URLs** — multi-input with add/remove (auto-filled from saved ProductProfile)<br>• **"Analyze & Save" button** — scrapes URLs to extract product data<br>• **Market radio** — US, UK, AU<br>• **Additional Context textarea** — optional guidance (e.g., "Focus on subscription", "Target gym bros 25-35")<br>• **Note input** — optional label (e.g., "Version for TikTok", "Q3 campaign") |
| **Process** | 1. Selecting product auto-loads URLs from saved `ProductProfile`<br>2. "Analyze & Save" calls `POST /api/studio/scrape-landing` → Gemini extracts bigIdea, productInfo, targetAudience from landing pages → saves as `ProductProfile` via `POST /api/product-profiles` |
| **Output** | Fully configured brief request ready to generate |

### 4.3 Generate Brief

| | Detail |
|---|---|
| **Input** | `{ adIds[], targetProduct, targetMarket, additionalContext?, notes? }` |
| **Process** | `POST /api/briefs`:<br>1. Fetch up to 3 `AdRecord`s by ID from DB<br>2. Load `ProductProfile` for selected product (if exists)<br>3. Build user prompt with ad summaries + product context<br>4. Call Claude Sonnet 4 with system prompt (role: "elite DTC supplement creative strategist")<br>5. Parse JSON response from Claude<br>6. Save `Brief` record to DB<br>7. Return brief ID |
| **Output** | Generated brief JSON containing:<br>• `briefTitle` — campaign name<br>• `winningPatternSummary` — what patterns the reference ads share<br>• `recommendedFormat` — e.g., "9:16 vertical, 60-90s, voiceover-led UGC"<br>• `targetAudience` — demographics + psychographics<br>• `hookApproach` — hookType + 3 specific ready-to-film hook options<br>• `messagingAngle` — core angle<br>• `offerStructure` — pricing, guarantee, urgency<br>• `scriptOutline` — phases with timecodes, direction, textSupers<br>• `differentiators` — competitor gaps to exploit<br>• `referenceAds[]` — per-ad: brand, whatToSteal, whatToImprove<br>• `productionNotes` — filming guidance |
| **Key Files** | `src/app/api/briefs/route.ts` |

### 4.4 View Brief Detail

| | Detail |
|---|---|
| **Input** | Auto-redirect to `/briefs/{id}` after generation, or click from list |
| **Process** | `GET /api/briefs/{id}` → fetch brief record |
| **Output** | Full brief display with sections:<br>• Winning Pattern Summary (emerald card)<br>• Recommended Format + Target Audience (grid)<br>• Hook Options (numbered, copy buttons)<br>• Messaging Angle + Offer Structure (grid)<br>• Script Outline (phase breakdown with timecodes + text supers)<br>• Differentiators (bulleted list)<br>• Reference Ads (2-column: brand, steal, improve)<br>• Production Notes (violet card)<br>• Editable notes section |
| **Key Files** | `src/app/briefs/[id]/page.tsx` |

### 4.5 Brief Actions

| Action | Detail |
|---|---|
| **Copy as Markdown** | Generates full markdown from briefJson, copies to clipboard |
| **Edit Notes** | Inline textarea → `PATCH /api/briefs/{id}` with `{ notes }` |
| **Delete Brief** | `DELETE /api/briefs/{id}` → removes from DB |
| **Archive Brief** | `PATCH /api/briefs/{id}` with `{ isArchived: true }` |

### 4.6 Briefs List Page

| | Detail |
|---|---|
| **Input** | User navigates to `/briefs` |
| **Process** | `GET /api/briefs` → returns all non-archived briefs |
| **Output** | Card list with: product badge, brief title, market, date, "based on N ads", editable note badge, delete button. Click card → detail page. |
| **Key Files** | `src/app/briefs/page.tsx` |

---

## 5. Product Profiles

### 5.1 Create / Update Profile

| | Detail |
|---|---|
| **Input** | Triggered from BriefGenerateModal "Analyze & Save" or Studio StepProduct |
| **Process** | 1. `POST /api/studio/scrape-landing` with `{ urls[] }` → Gemini scrapes landing pages, extracts: bigIdea, productInfo, targetAudience<br>2. `POST /api/product-profiles` with `{ name, landingPageUrls[], bigIdea?, productInfo?, targetAudience? }` → Prisma upsert by `name` (unique) |
| **Output** | Persisted profile accessible for future brief generation and studio sessions |
| **Key Files** | `src/app/api/product-profiles/route.ts` |

### 5.2 List Profiles

| | Detail |
|---|---|
| **Input** | `GET /api/product-profiles` |
| **Process** | Fetch all ProductProfile records |
| **Output** | Array of `{ name, landingPageUrls[], bigIdea?, productInfo?, targetAudience? }` |

### 5.3 Auto-Fill in Brief Modal

| | Detail |
|---|---|
| **Input** | User selects product in BriefGenerateModal dropdown |
| **Process** | Client loads saved profile for that product name → auto-populates URL fields |
| **Output** | Pre-filled landing page URLs, ready for brief generation with saved context |

---

## 6. Video Ad Studio

**Architecture:** 7-step wizard (`/studio`) that clones and improves competitor video ads using Gemini + Vidtory + KIE (Kling 3.0) APIs.

**State Management:** `useReducer` + React Context (`StudioState` in `_state/reducer.ts`). State persisted to SessionStorage (100ms debounce) and survives page refresh. Non-serializable fields (File objects, blob URLs, generation flags) are cleared on hydrate.

**Page Layout:** Header (title + SaveProjectButton + StudioInfoDialog) → StepIndicator → Step Content → NavigationButtons

### Studio Global UI Components

#### StepIndicator

| | Detail |
|---|---|
| **Purpose** | Horizontal step navigation bar showing all 7 steps |
| **UI** | Row of pills separated by ChevronRight icons. Each pill shows step icon (Lucide) + label (hidden on mobile, shows number instead) |
| **Behavior** | Current step: emerald bg + border. Completed steps: gray, clickable (jumps to step). Unreachable steps: muted, no cursor. Check icon on completed steps. Clickability controlled by `maxStepReached` — user can only revisit steps already reached. |
| **Key Files** | `src/app/studio/_components/StepIndicator.tsx` |

#### NavigationButtons

| | Detail |
|---|---|
| **Purpose** | Back/Next buttons + step counter at page bottom |
| **UI** | Left: Back button (ChevronLeft, disabled on Step 1). Center: "Step X of 7". Right: Next button (emerald, ChevronRight) |
| **Validation** | Next is disabled unless step requirements met:<br>• Step 1: Has video URL (uploaded or DB)<br>• Step 2: Has analysis object<br>• Step 3: Has productImage + bigIdea<br>• Step 4: Has scriptScenes<br>• Step 5: Has scenes<br>• Step 6: Has images OR videos in any scene<br>• Step 7: Always enabled |
| **Key Files** | `src/app/studio/_components/NavigationButtons.tsx` |

#### SaveProjectButton

| | Detail |
|---|---|
| **Purpose** | Persist/load studio state to/from database |
| **UI** | Row of icon buttons: New (FilePlus), Open (FolderOpen), Save (Save), Save As (only if project loaded). Shows current project name (truncated). Save shows "Saved ✓" for 2s on success. |
| **Open Dialog** | Search input + scrollable project list. Each project shows name, step info, timestamp, delete button (hover). Click to load. |
| **Save Dialog** | Project name input + current step info + Save/Cancel buttons. |
| **API** | `POST /api/studio/projects` (create), `PATCH /api/studio/projects/{id}` (update), `GET /api/studio/projects` (list), `DELETE /api/studio/projects/{id}` (delete) |
| **Key Files** | `src/app/studio/_components/SaveProjectButton.tsx` |

#### StudioInfoDialog

| | Detail |
|---|---|
| **Purpose** | "How It Works" info button explaining the 7-step pipeline |
| **UI** | Info icon button → opens modal with all 7 steps detailed (icon, label, process explanation, IN/OUT descriptions). Includes PDF download link: "Download Meta Ads AI Stack Reference (PDF)". |
| **Key Files** | `src/app/studio/_components/StudioInfoDialog.tsx` |

#### BlueprintSelector

| | Detail |
|---|---|
| **Purpose** | Select/create/edit custom AI system prompts (blueprints) for each pipeline stage |
| **Types** | 5 blueprint types: `analyze`, `script`, `storyboard`, `enhance`, `prompt_framework` |
| **UI** | Small pill button with FileText icon showing active blueprint title (truncated) + version number. Click opens dropdown listing available blueprints with radio selection, View (Eye) button, and "New blueprint" link. |
| **View Modal** | Full blueprint details with editable textarea. Save Changes button. |
| **Create Modal** | Title input + content textarea (monospace, min-h-300). Create button. |
| **Storage** | `PromptBlueprint` DB table. Each has: title, description, content, type, variant, version, isDefault, isActive. Active blueprint used in API calls. Defaults fallback if DB unavailable. Supports `{{PROMPT_FRAMEWORK}}` placeholder resolution. |
| **Key Files** | `src/app/studio/_components/BlueprintSelector.tsx`, `src/lib/studio/blueprints.ts`, `src/lib/studio/default-prompts.ts` |

#### GeminiErrorBanner

| | Detail |
|---|---|
| **Purpose** | Display generation errors with Gemini-specific detection |
| **Non-Gemini errors** | Red banner with AlertCircle icon, error message, dismiss button (X) |
| **Gemini errors** | Amber/orange banner with "Gemini API Error" header, error details, link to `/settings` to change API key, dismiss button. Detects: 429, RESOURCE_EXHAUSTED, quota, rate-limited, API key, invalid. |
| **Key Files** | `src/app/studio/_components/GeminiErrorBanner.tsx` |

---

### Step 1: Source

| | Detail |
|---|---|
| **Input** | User selects a source video to clone |
| **Process** | Two-column layout with two source options:<br><br>**1. From Crawled Ads** (currently disabled/grayed out):<br>• Database icon, disabled search input, skeleton placeholders<br>• Status: "Temporarily Unavailable — Crawled video URLs have expired. Upload a video instead."<br><br>**2. Upload Video** (active):<br>• Dashed-border drop zone ("Drop or click to upload a video ad")<br>• File input accepts `video/*`<br>• On upload: `URL.createObjectURL(file)` creates blob URL<br>• Shows video preview with `<video>` controls<br>• "Remove video" button (Trash2 icon)<br><br>**Source Change Guard:**<br>• If user has existing progress (analysis, script, or scenes), `SourceChangeDialog` modal appears<br>• Options: Cancel, Confirm (discard work), Save & Change (persist project first)<br>• `guardSourceChange()` checks for existing progress before allowing change |
| **Output** | State: `{ sourceType: "upload", uploadedVideoUrl: blobURL, uploadedVideoFile: File }` |
| **Key Files** | `src/app/studio/_components/StepSource.tsx` |

### Step 2: Analyze

| | Detail |
|---|---|
| **Input** | Video file + blob URL from Step 1 |
| **Process** | 1. User clicks **"Extract & Analyze"** button (Sparkles icon)<br>&nbsp;&nbsp;• Button states: "Extract & Analyze" → "Extracting frames..." → "Analyzing..." → "Re-analyze" / "Re-extract & Analyze"<br>2. **BlueprintSelector** for "analyze" type (custom analysis system prompts)<br>3. **Client-side frame extraction:**<br>&nbsp;&nbsp;• Create `<video>` element from blob URL<br>&nbsp;&nbsp;• Canvas draws frames at intervals<br>&nbsp;&nbsp;• <4MB files: 120px thumbnails (low quality)<br>&nbsp;&nbsp;• >4MB files: 480px hi-res frames<br>&nbsp;&nbsp;• Max 30 frames<br>4. **Upload video to Vidtory** (if <4MB): `POST /api/studio/upload` with FormData<br>5. **Send to Gemini analysis:** `POST /api/studio/analyze`<br>&nbsp;&nbsp;• Server downloads video, uploads to Gemini File API<br>&nbsp;&nbsp;• Waits for ACTIVE state (max 2 min)<br>&nbsp;&nbsp;• Gemini analyzes using `VIDEO_ANALYSIS_INSTRUCTION` (250+ lines):<br>&nbsp;&nbsp;&nbsp;&nbsp;- Scene cutting (visual changes = new scene)<br>&nbsp;&nbsp;&nbsp;&nbsp;- Scene classification (marketing purpose + roll type: A-Roll/B-Roll/C-Roll)<br>&nbsp;&nbsp;&nbsp;&nbsp;- Voiceover extraction (word-for-word)<br>&nbsp;&nbsp;&nbsp;&nbsp;- Subtitle vs text overlay distinction<br>&nbsp;&nbsp;&nbsp;&nbsp;- Rich visual descriptions per scene<br>6. Parse response into `VideoAnalysis`<br><br>**3-minute timeout warning:** amber banner if analysis stalls, prompts "Re-analyze" |
| **Output** | State: `{ frames: string[] (base64 JPEGs), analysis: { musicAndPacing: string, sceneBreakdown: SceneBreakdown[] } }`<br>Displayed as: horizontal frame thumbnail strip (first 40 frames, "+N more" indicator) + scene cards color-coded by roll type (blue=A-Roll, amber=B-Roll, purple=C-Roll). Each scene card shows timecode, type badge, visual description, speech/voiceover (italic, left-border accent). |
| **Key Files** | `src/app/studio/_components/StepAnalyze.tsx`, `src/app/studio/_hooks/useAnalysis.ts`, `src/app/api/studio/analyze/route.ts`, `src/lib/studio/gemini.ts` |

### Step 3: Product Setup

| | Detail |
|---|---|
| **Input** | User provides product details, creator info, and creative strategy |
| **Process** | User fills form with these sections:<br><br>**Image Uploads** (2-column grid):<br>• **Product Image** (required) — JPG/PNG upload → base64. Shows thumbnail (h-32) or upload prompt with dashed border<br>• **Creator/Character Image** (optional) — same layout<br><br>**Landing Page URLs:**<br>• Globe icon label: "Landing Page URLs (AI auto-fills fields below)"<br>• Repeating URL inputs with Link icon + X remove button<br>• **"Add another URL"** text link (Plus icon)<br>• **"Auto-fill from URLs"** button (blue, Sparkles icon) → `POST /api/studio/scrape-landing` with `{ urls[] }` → Gemini extracts bigIdea, productInfo, targetAudience → auto-fills fields below<br>• Auto-loads saved profile URLs on mount via `GET /api/product-profiles`<br>• On scrape success, saves/updates profile via `POST /api/product-profiles`<br><br>**Text Fields:**<br>• **Big Idea / Core Message** (required text input) — placeholder: "This creatine gummy changed my gym performance in 2 weeks"<br>• **Product Info** (textarea, h-20, resizable) — placeholder: "Creatine monohydrate gummies, 5g per serving, berry flavor..."<br>• **Target Audience** (text input) — placeholder: "Men 18-35 interested in fitness and bodybuilding"<br><br>**Creative Strategy** (bordered section with "Meta Ads AI Stack" badge):<br>• **Primary Motivator** — 10 toggleable buttons (grid 2×5): Pain Point, Aspiration, Social Proof, Curiosity, Urgency, Identity, Feature-Led, Problem/Solution, Authority, Comparison. Each shows label + description. Selected: green border + bg. Shows hook templates when selected.<br>• **Emotional Tone** — 7 toggleable buttons (flex wrap): Inspirational, Relatable, Urgent, Calm, Humorous, Educational, Emotional. Selected: blue border + bg.<br>• **Storyline Type** — 7 toggleable buttons (flex wrap): Founder Origin Story, Day-in-the-Life, Problem/Solution, Things You Didn't Know, Behind the Scenes, Testimonial, Unboxing. Each shows label + description. Selected: purple border + bg. |
| **Output** | State: `{ productImage, creatorImage?, bigIdea, productInfo, targetAudience, landingPageUrls[], motivator, emotionalTone, storylineType }` |
| **Key Files** | `src/app/studio/_components/StepProduct.tsx`, `src/app/studio/_hooks/useLandingPageScrape.ts`, `src/app/api/studio/scrape-landing/route.ts` |

### Step 4: Script

| | Detail |
|---|---|
| **Input** | `VideoAnalysis` from Step 2 + product context from Step 3 |
| **Process** | 1. User clicks **"Generate Script"** button (emerald, Sparkles icon). Shows "Regenerate" if script exists.<br>2. **BlueprintSelector** for "script" type (custom script generation prompts)<br>3. Displays **original structure badges** (from analysis scene types, non-interactive, muted bg)<br>4. Shows **creative strategy badges** if set: Motivator (emerald), Emotional Tone (blue), Storyline Type (purple)<br>5. `POST /api/studio/script` with `{ analysis, bigIdea, productImage, productInfo, targetAudience, creatorImage, motivator, emotionalTone, storylineType }`<br>6. Gemini calls `generateClonedScript()` using `CLONED_SCRIPT_INSTRUCTION`:<br>&nbsp;&nbsp;• **Must output exact scene count** matching original analysis<br>&nbsp;&nbsp;• **Match word count** per scene (±30%)<br>&nbsp;&nbsp;• Silent scenes (B-Roll/C-Roll with 0 words) stay silent<br>&nbsp;&nbsp;• Incorporate Meta Ads AI Stack motivator/tone/storyline into language<br>&nbsp;&nbsp;• Make conversational + authentic (UGC-style)<br>7. Returns `ScriptScene[]` with `{ sceneType, dialogue, direction }`<br>8. **Skeleton loading** animation while generating<br>9. **Empty state:** "Click 'Generate Script' to create a multi-scene script based on the analysis."<br><br>**Scene Cards** (one per scene, editable):<br>• Header: "Scene N" (emerald) + scene type badge (colored) + original timecode (right-aligned, muted)<br>• **Dialogue / Voiceover textarea** (h-20, resizable) — user can edit inline<br>• **Direction / Tone input** — user can edit inline<br>• Updates via `UPDATE_SCRIPT_SCENE` action |
| **Output** | State: `{ scriptScenes: ScriptScene[] }` — displayed as editable scene cards with type badges |
| **Key Files** | `src/app/studio/_components/StepScript.tsx`, `src/app/studio/_hooks/useScriptGeneration.ts`, `src/app/api/studio/script/route.ts` |

### Step 5: Storyboard

| | Detail |
|---|---|
| **Input** | `VideoAnalysis` + `ScriptScene[]` + product context + creative strategy |
| **Process** | 1. User clicks **"Generate Storyboard"** button (emerald, Sparkles icon). Shows "Regenerate" if scenes exist.<br>2. **Two BlueprintSelectors:**<br>&nbsp;&nbsp;• "storyboard" type — controls storyboard generation system prompt<br>&nbsp;&nbsp;• "prompt_framework" type (label: "Framework") — shared prompt framework rules for skin realism, expressions, product accuracy, anti-AI cues<br>3. `POST /api/studio/storyboard` with `{ analysis, script, productImage, productInfo, targetAudience, creatorImage, motivator, emotionalTone, storylineType }`<br>4. Gemini calls `generateClonedStoryboard()` using `CLONED_STORYBOARD_INSTRUCTION` + `PROMPT_FRAMEWORK` (199 lines):<br>&nbsp;&nbsp;• Classify each scene as roll type (A-Roll/B-Roll/C-Roll)<br>&nbsp;&nbsp;• **IMAGE PROMPTS** (detailed paragraphs, per roll type):<br>&nbsp;&nbsp;&nbsp;&nbsp;- A-Roll: "Hyperrealistic photography" + subject demographics + 3+ skin imperfections + practical lighting + camera specs<br>&nbsp;&nbsp;&nbsp;&nbsp;- B-Roll: Product interaction + hand positions + product dimensions + anti-smooth skin<br>&nbsp;&nbsp;&nbsp;&nbsp;- C-Roll: Anatomy layers + fiber directions + ghost-skin opacity + glow intensity<br>&nbsp;&nbsp;• **VIDEO PROMPTS** (<2500 chars, compressed):<br>&nbsp;&nbsp;&nbsp;&nbsp;- A-Roll: format + voice + setting + subject + action + expression + camera + lip_sync + voiceover<br>&nbsp;&nbsp;&nbsp;&nbsp;- B-Roll: subject + action + micro-detail + expression lock + secondary motion + anti-behaviors<br>&nbsp;&nbsp;&nbsp;&nbsp;- C-Roll: Locked camera + one action + anatomical movement + triple-lock expression<br>&nbsp;&nbsp;&nbsp;&nbsp;- ALL: "No Music Background. No ambient sounds. Complete silence except voiceover."<br>&nbsp;&nbsp;• Creative strategy drives visuals: tone → lighting/color, storyline → setting/framing<br>&nbsp;&nbsp;• Handles JSON truncation repair (many scenes)<br>5. **Skeleton loading** while generating<br><br>**Scene Cards** (one per scene, all editable):<br>• Header: "Scene N" (emerald) + roll type badge (blue=aroll, amber=broll, purple=croll)<br>• Two enhancement buttons: **"Enhance Image"** and **"Enhance Video"** (Wand2 icon) → `POST /api/studio/enhance-prompt` → Gemini refines prompt using PROMPT_FRAMEWORK rules<br>• **4-field grid** (md:grid-cols-2):<br>&nbsp;&nbsp;1. Voiceover Script (textarea, h-16)<br>&nbsp;&nbsp;2. Voiceover Guide (text input)<br>&nbsp;&nbsp;3. Image Prompt (textarea, h-20)<br>&nbsp;&nbsp;4. Video Prompt (textarea, h-20) |
| **Output** | State: `{ scenes: StoryboardScene[] }` — each scene: `id, rollType, voiceoverScript, voiceoverGuide, imagePrompt, videoPrompt` |
| **Key Files** | `src/app/studio/_components/StepStoryboard.tsx`, `src/app/studio/_hooks/useStoryboardGeneration.ts`, `src/app/api/studio/storyboard/route.ts`, `src/app/api/studio/enhance-prompt/route.ts`, `src/lib/studio/gemini.ts` |

### Step 6: Generate Assets

| | Detail |
|---|---|
| **Input** | Storyboard scenes with image/video prompts, aspect ratio, voice selection, video model selection |
| **Process** | User configures global settings and generates assets per scene: |

#### 6a. Global Controls (Header Section)

| Control | Detail |
|---|---|
| **BlueprintSelector** | "enhance" type (label: "Enhance Prompt") — controls prompt enhancement system prompt |
| **Aspect Ratio dropdown** | Options: 9:16 (Portrait), 16:9 (Landscape), 1:1 (Square). Applies to all image + video generation. |
| **Video Model dropdown** | Options: **Vidtory** (default) or **Kling 3.0 (KIE)**. Switches video generation backend for all scenes. Each scene's Video card shows a model badge (cyan for Vidtory, orange for Kling 3.0). |
| **Voiceover Voice dropdown** | Options: Kore, Puck, Charon, Fenrir, Zephyr. Applies to all TTS generation. |
| **"Generate All Images" button** | Blue, ImageIcon. Queues all scenes without images (max 3 parallel). Shows spinner if any scene is generating. |
| **"Generate All Audio" button** | Purple, Volume2. Queues all scenes without audio (max 3 parallel). Shows spinner if any scene is generating. |

#### 6b. Scene Cards (Collapsible Accordion)

Each scene is a collapsible card. Collapsed header shows:
- Scene number (emerald)
- Roll type badge (blue=A-Roll, amber=B-Roll, purple=C-Roll)
- Status indicators: spinners for active generation, count badges ("3 img", "1 vid", "audio")
- Script preview (first 80 chars, truncated with "...")
- Expand/collapse chevron (ChevronUp/ChevronDown)

Expanded content (border-top):

| Section | Detail |
|---|---|
| **Lipsync Toggle** | A-Roll only: toggle button "Lipsync ON/OFF" (Mic/MicOff icon). ON = video includes dialogue for lip-sync. OFF = silent video. B-Roll/C-Roll shows "always silent, no lip-sync" label. |
| **Editable Prompts** | 2-column grid (lg:grid-cols-2):<br>• **Image Prompt** (blue label) — textarea (font-mono, h-32, resizable). "Enhance" button (Wand2) calls AI prompt refinement.<br>• **Video Prompt** (emerald label) — textarea (font-mono, h-32, resizable). "Enhance" button. |

#### 6c. Image Generation Card (Blue Border)

| | Detail |
|---|---|
| **Header** | "Images" (ImageIcon, blue) + action buttons |
| **"Browse saved imgs" button** | Opens `AssetPicker` modal to reuse previously saved images. FolderOpen icon, gray/muted. |
| **"New Image" button** | Blue, Plus icon. Disabled while generating. Shows "Generating..." with spinner. |
| **Process** | 1. **Ensure Vidtory uploads** — product + creator images uploaded once, cached as URLs<br>2. **Build prompt** — prepend "Hyperrealistic photography" for A-Roll, add focus object + camera angle modifiers<br>3. `POST /api/studio/generate-image` with `{ prompt, aspectRatio, characterUrl, productUrl }` → Vidtory returns `jobId`<br>4. **Poll:** `GET /api/studio/job-status?jobId=...` every 5s, timeout 300s<br>5. On COMPLETED: URL added to `scene.images[]`, auto-select first image for video generation |
| **Display** | Image thumbnails (h-48). Click to select for video (green border + "selected" label). Hover buttons: Maximize2 (fullscreen preview), SaveAssetButton (save to library). Loading spinner between batches. |
| **Error** | GeminiErrorBanner if generation fails |

#### 6d. Video Generation Card (Emerald Border)

| | Detail |
|---|---|
| **Header** | "Videos" (Video icon, emerald) + **model badge** (cyan "Vidtory" or orange "Kling 3.0") + action buttons |
| **"Browse saved vids" button** | Opens `AssetPicker` for saved videos. FolderOpen icon, gray. |
| **"New Video" button** | Emerald, Plus icon. **Disabled if no image selected** (must select/generate image first). Shows "Generating..." with spinner. |
| **Process (Vidtory)** | 1. **Build prompt** based on roll type:<br>&nbsp;&nbsp;• A-Roll + lipsync ON: prepend "The creator is speaking" + append dialogue<br>&nbsp;&nbsp;• B-Roll/C-Roll: append "The subject does NOT speak. No lip movement."<br>&nbsp;&nbsp;• All: append "NO background music. NO ambient sounds. Complete silence."<br>&nbsp;&nbsp;• A-Roll: append "Shot on iPhone 15 Pro, portrait mode, f/1.8. 1600 ISO grain."<br>&nbsp;&nbsp;• B-Roll/C-Roll: append "Photorealistic, shot on Sony A7IV, 85mm lens."<br>2. `POST /api/studio/generate-video` → Vidtory returns `jobId`<br>3. **Poll:** every 10s, timeout 900s (15 min) |
| **Process (Kling 3.0 via KIE)** | 1. **Same prompt building** as Vidtory<br>2. `POST /api/studio/kie-generate-video` with `{ prompt, aspectRatio, startImageUrl, duration: 5, mode: "std" }`<br>&nbsp;&nbsp;• KIE API: `POST https://api.kie.ai/api/v1/jobs/createTask` with model `kling-3.0/video`<br>&nbsp;&nbsp;• Uses `image_urls[0]` as first frame reference<br>&nbsp;&nbsp;• Sound disabled, single-shot mode<br>&nbsp;&nbsp;• Aspect ratio passed directly ("16:9", "9:16", "1:1")<br>&nbsp;&nbsp;• Duration clamped to 3–15 range<br>3. **Poll:** `GET /api/studio/kie-job-status?jobId=...` every 10s, timeout 900s<br>&nbsp;&nbsp;• KIE API: `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}`<br>&nbsp;&nbsp;• Maps KIE states: waiting→PENDING, queuing→PENDING, generating→PROCESSING, success→COMPLETED, fail→FAILED<br>&nbsp;&nbsp;• Extracts video URL from `JSON.parse(data.resultJson).resultUrls[0]`<br>&nbsp;&nbsp;• Error info from `data.failMsg` |
| **Display** | Video players with controls (max-h-36). Hover buttons: Maximize2 (fullscreen preview), SaveAssetButton. Loading spinner between batches. |
| **Error** | GeminiErrorBanner if generation fails |
| **Prerequisite** | Text: "Generate an image first, then select it" if no images exist |

#### 6e. Audio Generation Card (Purple Border)

| | Detail |
|---|---|
| **Header** | "Audio" (Volume2, purple) + "New Audio" button |
| **"New Audio" button** | Purple, Plus icon. Disabled while generating. Shows "Generating..." with spinner. |
| **Process** | 1. `POST /api/studio/tts` with `{ text: voiceoverScript, guide: voiceoverGuide, voice }`<br>2. Gemini TTS model (`gemini-2.5-flash-preview-tts`) generates speech as PCM base64 (24kHz, 16-bit mono)<br>3. Client-side `pcmToWav()` converts PCM → WAV: RIFF header + PCM bytes → Blob → object URL |
| **Display** | `<audio>` player with controls (full width). Empty state: "No audio yet". |
| **Error** | GeminiErrorBanner if generation fails |

#### 6f. Bulk Operations

| | Detail |
|---|---|
| **"Generate All Images"** | Filters scenes with no images + not currently generating → queues all. Runs max 3 parallel via `Promise.race` pattern (race, replace finished, queue next). |
| **"Generate All Audio"** | Same pattern: filters scenes without audio, max 3 parallel TTS jobs. |

#### 6g. Asset Management

| Component | Detail |
|---|---|
| **SaveAssetButton** | Small Save icon button (white on black/60 bg, top-right of images/videos). Opens dialog with: asset name input, folder dropdown, create new folder input + button, image preview (if image). Saves to asset library. |
| **AssetPicker** | Modal dialog (max-w-3xl). Left: AssetFolderTree (hierarchical folder sidebar, w-48). Right: search input + grid of saved assets (grid-cols-3, h-24 thumbnails). Click asset → `onSelect(url)` callback adds to scene's images/videos array. |
| **PreviewModal** | Fixed fullscreen dark overlay (bg-black/90). Close button (top-right, white X). Image or video preview (max-w-full, max-h-90vh). Download link (bottom-right, Download icon). Click background to close. |

| **Key Files** | `src/app/studio/_components/StepGenerate.tsx`, `src/app/studio/_hooks/useAssetGeneration.ts`, `src/app/studio/_utils/helpers.ts`, `src/app/api/studio/generate-image/route.ts`, `src/app/api/studio/generate-video/route.ts`, `src/app/api/studio/kie-generate-video/route.ts`, `src/app/api/studio/job-status/route.ts`, `src/app/api/studio/kie-job-status/route.ts`, `src/app/api/studio/tts/route.ts`, `src/app/api/studio/upload/route.ts`, `src/lib/studio/vidtory.ts`, `src/lib/studio/kie.ts` |

### Step 7: Preview & Download

| | Detail |
|---|---|
| **Input** | All generated assets from Step 6 |
| **Process** | Pure display — no API calls. For each scene, 3-column grid (md:grid-cols-3):<br><br>**Column 1: Video / Image**<br>• Shows first video with `<video>` player controls, OR first image if no video<br>• **"Download clip"** link (blue, Download icon) with href to video URL<br>• Empty state: "No media"<br><br>**Column 2: Script + Guide**<br>• "Script" label → full voiceover script text<br>• "Guide" label → voiceover guide (italic)<br><br>**Column 3: Audio**<br>• `<audio>` player with controls (if audioUrl exists)<br>• Empty state: "No audio generated" |
| **Download Instructions** | Muted background info box (shown if any videos exist): "To combine clips into a final video, download each clip and use CapCut/Premiere/DaVinci Resolve/ffmpeg" |
| **Output** | Preview of all scene clips with download links for manual assembly |
| **Key Files** | `src/app/studio/_components/StepPreview.tsx` |

### Studio Data Flow Summary

```
Step 1 (Source)       → uploadedVideoUrl, uploadedVideoFile
                         ↓
Step 2 (Analyze)      → frames[], analysis { musicAndPacing, sceneBreakdown[] }
                         ↓
Step 3 (Product)      → productImage, creatorImage, bigIdea, productInfo, targetAudience,
                         motivator, emotionalTone, storylineType, landingPageUrls[]
                         ↓
Step 4 (Script)       → scriptScenes[] { sceneType, dialogue, direction }
                         ↓
Step 5 (Storyboard)   → scenes[] { imagePrompt, videoPrompt, voiceoverScript, voiceoverGuide, rollType }
                         ↓
Step 6 (Generate)     → scenes[] + images[], videos[], audioUrl per scene
                         (Vidtory or Kling 3.0 for video, Vidtory for image, Gemini for TTS)
                         ↓
Step 7 (Preview)      → Display + download all assets
```

### Studio State Shape

```typescript
interface StudioState {
  step: number;
  maxStepReached: number;
  // Step 1
  sourceType: "db" | "upload" | null;
  selectedAdId: string | null;
  selectedAdVideoUrl: string | null;
  selectedAdBrand: string | null;
  uploadedVideoUrl: string | null;
  uploadedVideoFile: File | null;
  // Step 2
  frames: string[];
  analysis: VideoAnalysis | null;
  isAnalyzing: boolean;
  analyzeError: string | null;
  // Step 3
  productImage: string | null;
  creatorImage: string | null;
  bigIdea: string;
  productInfo: string;
  targetAudience: string;
  landingPageUrls: string[];
  isScrapingUrls: boolean;
  motivator: string;
  emotionalTone: string;
  storylineType: string;
  // Step 4
  scriptScenes: ScriptScene[];
  isGeneratingScript: boolean;
  scriptError: string | null;
  // Step 5
  scenes: StoryboardScene[];
  isGeneratingStoryboard: boolean;
  storyboardError: string | null;
  // Step 6
  aspectRatio: "9:16" | "16:9" | "1:1";
  voice: string;
  videoModel: "vidtory" | "kling-3.0";
  productVidtoryUrl: string | null;
  creatorVidtoryUrl: string | null;
  // Project persistence
  currentProjectId: string | null;
  currentProjectName: string | null;
}
```

### Studio Action Types

```
SET_STEP, SET_SOURCE_DB, SET_SOURCE_UPLOAD, SET_FRAMES, SET_ANALYSIS,
SET_ANALYZING, SET_ANALYZE_ERROR, SET_PRODUCT_IMAGE, SET_CREATOR_IMAGE,
SET_FIELD, SET_SCRIPT_SCENES, UPDATE_SCRIPT_SCENE, SET_GENERATING_SCRIPT,
SET_SCRIPT_ERROR, SET_SCENES, SET_GENERATING_STORYBOARD, SET_STORYBOARD_ERROR,
UPDATE_SCENE, SET_VIDTORY_URLS, LOAD_PROJECT, RESET_PROGRESS, CLEAR_SOURCE,
SET_PROJECT_META
```

---

## 7. Settings & Configuration

### 7.1 View Settings

| | Detail |
|---|---|
| **Input** | User navigates to `/settings` |
| **Process** | `GET /api/settings` → returns masked API key status for Gemini, image provider, video provider |
| **Output** | Settings page showing:<br>• Gemini API Key (masked, status indicator)<br>• Image Provider (Vidtory or Kie) + API key<br>• Video Provider (Vidtory or Kie) + API key<br>• Whether using custom key or .env key |
| **Key Files** | `src/app/settings/page.tsx`, `src/app/api/settings/route.ts` |

### 7.2 Save Settings

| | Detail |
|---|---|
| **Input** | User enters/changes API keys or provider selections |
| **Process** | `POST /api/settings` with `{ geminiApiKey?, imageApiKey?, imageProvider?, videoApiKey?, videoProvider? }` → saves to `.tmp/settings.json` (overrides .env values) |
| **Output** | Keys persisted, active for all subsequent API calls |

### 7.3 Reset Settings

| | Detail |
|---|---|
| **Input** | User clicks reset button for specific key or all |
| **Process** | `DELETE /api/settings` with `{ key: "gemini" | "image" | "video" | "all" }` → removes custom keys from `.tmp/settings.json`, reverts to .env values |
| **Output** | Settings revert to environment defaults |

---

## 8. Cross-Feature Data Flows

### 8.1 Crawler → Boards → Briefs

```
Crawler Pipeline
  ↓ (produces AdRecords in DB)
Dashboard: TopWinners / AdExplorer
  ├─→ Save to Board (bookmark icon → SaveToBoardDropdown → POST /api/boards/{id}/ads)
  └─→ Select for Brief (checkbox → "Generate Brief" → BriefGenerateModal)
        ↓
        POST /api/briefs → Claude Sonnet → Brief JSON
        ↓
        /briefs/{id} detail page
```

### 8.2 Product Profiles Shared Across Features

```
BriefGenerateModal: "Analyze & Save"
  ↓ POST /api/studio/scrape-landing → Gemini extracts product data
  ↓ POST /api/product-profiles → upsert by name
  ↓
ProductProfile DB record
  ├─→ Auto-fills BriefGenerateModal URLs on product selection
  └─→ Auto-fills Studio StepProduct fields
```

### 8.3 Landing Page Scraping (Shared Service)

```
POST /api/studio/scrape-landing { urls[] }
  ↓ Gemini scrapes each URL, extracts:
  ↓   bigIdea, productInfo, targetAudience
  ↓
Used by:
  ├─ BriefGenerateModal → enriches brief context
  ├─ Studio StepProduct → auto-fills product fields
  └─ ProductProfile save → persists for future use
```

### 8.4 Studio → External Editing

```
Studio Step 6 (Generate)
  ↓ (produces per-scene: image URLs, video URLs, audio WAV blobs)
  ↓ Video generation via Vidtory OR Kling 3.0 (user-selected)
Studio Step 7 (Preview)
  ↓ (download links for each clip)
External Editor (CapCut / Premiere / DaVinci Resolve / ffmpeg)
  ↓ (concatenate clips + sync audio + transitions)
Final Video Ad
```

---

## Appendix: API Route Map

| Route | Method | Purpose |
|---|---|---|
| `/api/crawl` | GET | List jobs + DB stats |
| `/api/crawl` | POST | Launch crawl |
| `/api/crawl?jobId=` | GET | Poll job status |
| `/api/crawl?jobId=` | DELETE | Stop crawl |
| `/api/export` | GET | Download Excel or get Sheet URL |
| `/api/resync` | POST | Re-sync DB → Google Sheet |
| `/api/boards` | GET/POST | List/Create boards |
| `/api/boards/[boardId]` | GET/PATCH/DELETE | Read/Update/Delete board |
| `/api/boards/[boardId]/ads` | GET/POST | List/Save ads in board |
| `/api/boards/[boardId]/ads/[savedAdId]` | PATCH/DELETE | Update notes/Remove ad |
| `/api/briefs` | GET/POST | List/Generate briefs |
| `/api/briefs/[id]` | GET/PATCH/DELETE | Read/Update/Delete brief |
| `/api/product-profiles` | GET/POST | List/Upsert product profiles |
| `/api/settings` | GET/POST/DELETE | Read/Save/Reset API keys |
| `/api/studio/analyze` | POST | Gemini video analysis |
| `/api/studio/extract-frames` | POST | FFmpeg frame extraction + analysis |
| `/api/studio/script` | POST | Gemini script generation |
| `/api/studio/storyboard` | POST | Gemini storyboard generation |
| `/api/studio/enhance-prompt` | POST | Gemini prompt refinement |
| `/api/studio/scrape-landing` | POST | Gemini landing page extraction |
| `/api/studio/upload` | POST | Upload media to Vidtory |
| `/api/studio/generate-image` | POST | Vidtory image generation job |
| `/api/studio/generate-video` | POST | Vidtory video generation job |
| `/api/studio/kie-generate-video` | POST | KIE Kling 3.0 video generation job |
| `/api/studio/job-status` | GET | Poll Vidtory job completion |
| `/api/studio/kie-job-status` | GET | Poll KIE Kling 3.0 job completion |
| `/api/studio/tts` | POST | Gemini text-to-speech |
| `/api/studio/blueprints` | GET/POST | List/Create prompt blueprints |
| `/api/studio/blueprints/[id]` | PATCH/DELETE | Update/Delete blueprint |
| `/api/studio/projects` | GET/POST | List/Save studio projects |
| `/api/studio/projects/[id]` | GET/PATCH/DELETE | Load/Update/Delete project |

## Appendix: Database Models

| Model | Records | Key Fields |
|---|---|---|
| **AdRecord** | Per-ad intelligence | 32 fields: brand, analysis (8), scoring, classification, metadata, video, financial |
| **CrawlJob** | Per-crawl metadata | id, markets, keyword, status, progress, timestamps |
| **Board** | User-created collections | name, description, color, icon |
| **SavedAd** | Board ↔ Ad relationship | boardId, adId, notes. Unique: [boardId, adId]. Cascade delete. |
| **Brief** | AI-generated creative briefs | targetProduct, targetMarket, basedOnAdIds[], briefJson, notes, isArchived |
| **ProductProfile** | Saved product metadata | name (unique), landingPageUrls[], bigIdea, productInfo, targetAudience |
| **PromptBlueprint** | Custom AI system prompts | title, description, content, type (analyze/script/storyboard/enhance/prompt_framework), variant, version, isDefault, isActive |
| **StudioProject** | Saved studio sessions | name, state (full StudioState JSON), step, timestamps |

## Appendix: Environment Variables

| Variable | Service | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini (analysis, script, storyboard, TTS, prompt enhancement) | Yes |
| `VIDTORY_API_KEY` | Vidtory (image generation, video generation, media upload) | Yes (for Vidtory) |
| `KIE_API_KEY` | KIE / Kling 3.0 (video generation) | Yes (for Kling 3.0) |
| `ANTHROPIC_API_KEY` | Claude Sonnet (ad analysis, brief generation) | Yes |
| `DATABASE_URL` | Neon PostgreSQL | Yes |
| `FOREPLAY_API_KEY` | Foreplay ad library | Optional |
| `REDIS_URL` | BullMQ / Redis (job queue) | Optional |
| `NEXT_PUBLIC_APP_URL` | App base URL | Yes |

## Appendix: Navigation

| Route | Page | Feature |
|---|---|---|
| `/dashboard` | Dashboard | Crawl launcher, progress, Top Winners, Ad Explorer |
| `/saved` | Boards List | Create/view/delete boards |
| `/saved/[boardId]` | Board Detail | View/manage saved ads |
| `/briefs` | Briefs List | View/delete generated briefs |
| `/briefs/[id]` | Brief Detail | Full brief display, copy, edit notes |
| `/studio` | Video Ad Studio | 7-step wizard (Source → Analyze → Product → Script → Storyboard → Generate → Preview) |
| `/settings` | Settings | API key management (Gemini, Vidtory, KIE) |

## Appendix: Video Generation Model Comparison

| Feature | Vidtory | Kling 3.0 (KIE) |
|---|---|---|
| **API Base** | `https://bapi.vidtory.net` | `https://api.kie.ai/api/v1/jobs` |
| **Auth** | `x-api-key` header | `Bearer` token |
| **Create Job** | `POST /generative-core/video` | `POST /createTask` |
| **Poll Status** | `GET /generative-core/jobs/{id}/status` | `GET /recordInfo?taskId={taskId}` |
| **Input Image** | `refImageUrl` (hosted URL) | `image_urls[0]` (hosted URL) |
| **Aspect Ratio** | Mapped enum (`IMAGE_ASPECT_RATIO_PORTRAIT`) | Direct string (`"9:16"`) |
| **Duration** | Integer (default 5) | String `"3"` to `"15"` |
| **Resolution (std)** | Standard | 16:9→1280×720, 9:16→720×1280, 1:1→720×720 |
| **Resolution (pro)** | N/A | 16:9→1920×1080, 9:16→1080×1920, 1:1→1080×1080 |
| **Sound** | N/A | Configurable (disabled by default in Studio) |
| **Multi-shot** | No | Supported (up to 5 shots, not used in Studio) |
| **Element Refs** | No | Supported (@element_name syntax, not used in Studio) |
| **Typical Gen Time** | 2–5 min | 3–8 min |
| **Env Variable** | `VIDTORY_API_KEY` | `KIE_API_KEY` |
