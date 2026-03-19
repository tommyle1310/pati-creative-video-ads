# PROJECT ANTIGRAVITY — TONIGHT BUILD SPEC
## 6 Features to Ship: From Raw Crawl Data → "Make This Ad Tomorrow"

**Objective:** Transform Antigravity from a crawl-and-analyze tool into a full competitive intelligence platform that defines winning ads, lets users curate and study them, and generates actionable briefs to compete and dominate.

**Stack context:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma ORM · Neon PostgreSQL · Python pipeline (Apify + Claude Sonnet) · Google Sheets output

**Existing DB columns per AdRecord:** brand, market, adLink, landingPage, videoUrl, adStartDate, longevity (days), adIterations, status, duration (sec), videoFormat, impressionsLow, impressionsHigh, spendLow, spendHigh, currency, adScore, hook, concept, scriptBreakdown, visualABC, consumerPsychology, cta, keyTakeaways, productionFormula, hookType, primaryAngle, framework, creativePattern, pageName, adLibraryId, crawledAt

---

## FEATURE 1: Saved Boards with Notes (Swipe File System)

### What it does
Users can save any ad from the crawl results into named folders (called "Boards"). Each board is a card on the `/saved` page. Clicking a board opens a list of saved ads with key metrics. Users can add personal notes to each saved ad.

### Database Schema — Prisma additions

```prisma
model Board {
  id          String      @id @default(cuid())
  name        String      // e.g. "Disgust Hooks", "US Market Winners"
  description String?     // optional board description
  color       String      @default("#7F77DD") // hex color for card UI
  icon        String      @default("bookmark") // lucide icon name
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  savedAds    SavedAd[]
}

model SavedAd {
  id        String   @id @default(cuid())
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  adId      String   // references the existing AdRecord id
  ad        AdRecord @relation(fields: [adId], references: [id])
  notes     String?  // user's personal notes (markdown supported)
  savedAt   DateTime @default(now())

  @@unique([boardId, adId]) // prevent duplicate saves to same board
}
```

### API Routes

```
POST   /api/boards                    — Create a new board { name, description?, color?, icon? }
GET    /api/boards                    — List all boards with ad count
GET    /api/boards/[boardId]          — Get board details + all saved ads with full AdRecord data
PATCH  /api/boards/[boardId]          — Update board name/description/color/icon
DELETE /api/boards/[boardId]          — Delete board (cascade deletes SavedAds)

POST   /api/boards/[boardId]/ads      — Save an ad to board { adId, notes? }
PATCH  /api/boards/[boardId]/ads/[savedAdId] — Update notes on a saved ad
DELETE /api/boards/[boardId]/ads/[savedAdId] — Remove ad from board
```

### UI Pages & Components

#### `/saved` page (Board Gallery)
```
Layout: CSS grid, 3 columns on desktop, 1 on mobile
Each board card shows:
  - Board name (editable inline)
  - Board color strip at top (user-selectable from 8 preset colors)
  - Icon (user-selectable from preset lucide icons: bookmark, flame, target, zap, trophy, star, eye, lightbulb)
  - Ad count badge (e.g. "12 ads")
  - Preview thumbnails: show first 3 saved ad video thumbnails as small squares
  - Created date
  
Top actions:
  - "+ New Board" button → opens modal with name + description + color picker
  
Click a board card → navigates to /saved/[boardId]
```

#### `/saved/[boardId]` page (Board Detail)
```
Header:
  - Board name (large, editable)
  - Board description (editable)
  - "X ads saved" count
  - Sort dropdown: by savedAt (newest first), by adScore (highest first), by longevity (longest first)
  
Ad list — each ad card shows:
  - Video thumbnail (first frame or poster from video URL) — 16:9 or 9:16 aspect ratio preserved
  - "Watch" button → opens in-app video player modal (see Feature 2)
  - Brand name + market flag (US/UK/AU flag emoji)
  - AdScore badge (color-coded: green ≥ 7, yellow 5-7, red < 5)
  - Key metrics row: Longevity (days), Impressions range, Spend range, Duration
  - Hook type badge (e.g. "Investigation-Fraud Hook" as a pill)
  - Primary angle badge
  - Notes section: collapsible textarea, auto-saves on blur (PATCH request)
  - "Remove from board" icon button (trash icon, with confirm)

Bottom of page:
  - "Compare Selected" button (see Feature 5) — appears when 2-3 ads are checkbox-selected
```

#### Save-to-Board interaction (from any ad list/detail page)
```
On every ad card across the app (dashboard, trending, search results):
  - Bookmark icon button in top-right corner
  - Click → dropdown showing all boards with checkmarks for boards this ad is already in
  - "+ Create new board" option at bottom of dropdown
  - Clicking a board name toggles save/unsave (POST or DELETE)
  - Optional: notes textarea inline in the dropdown before confirming save
```

---

## FEATURE 2: In-App Video Player

### What it does
Replace external navigation to `https://video.xx.fbcdn.net/...` URLs with an embedded `<video>` player that opens in a modal overlay. Users can watch competitor ads without leaving the tool.

### Implementation

#### VideoPlayerModal component
```typescript
// /components/VideoPlayerModal.tsx
// 
// Props:
//   videoUrl: string        — the fbcdn video URL from AdRecord.videoUrl
//   adTitle: string         — brand name + hook type for modal title
//   isOpen: boolean
//   onClose: () => void
//
// Behavior:
//   - Full-screen modal overlay with dark backdrop (bg-black/80)
//   - Native HTML5 <video> element with controls
//   - Video attributes: controls, playsInline, preload="metadata"
//   - Aspect ratio container: max-w-[400px] for 9:16 vertical, max-w-[720px] for 16:9
//   - Auto-detect aspect from AdRecord.videoFormat field ("9:16" vs "16:9")
//   - Close on backdrop click, close on Escape key, close button top-right
//   - Show loading spinner while video buffers
//   - Below the video: ad metadata bar showing brand, market, adScore, longevity, hook type
//
// CRITICAL: fbcdn URLs are temporary and expire.
//   - If video fails to load (onerror event), show fallback message:
//     "Video expired. Re-crawl this ad to refresh the URL."
//   - Store a `videoUrlUpdatedAt` timestamp and show warning if > 7 days old
//
// Keyboard shortcuts:
//   Space = play/pause
//   Left/Right arrows = seek ±5s
//   Escape = close modal
```

#### Video proxy route (IMPORTANT for CORS)
```
// /api/video-proxy route
// fbcdn URLs may have CORS restrictions when loaded from your domain.
// Create a lightweight proxy:
//
// GET /api/video-proxy?url={encoded_fbcdn_url}
//
// Implementation:
//   1. Validate the url param starts with "https://video" and contains "fbcdn.net"
//   2. fetch(url) server-side with appropriate headers
//   3. Stream the response back with correct Content-Type (video/mp4)
//   4. Set Cache-Control: public, max-age=3600 (cache for 1 hour)
//   5. If fetch fails (403/410), return 410 Gone with JSON error
//
// This also protects the raw fbcdn URL from being exposed in client-side source.
```

#### Update all "Watch" buttons across the app
```
Every place that currently has a watch/play button or links to the video URL:
  - Replace <a href={videoUrl} target="_blank"> with onClick → open VideoPlayerModal
  - Pass the ad's videoUrl, brand + hookType as title, and videoFormat for aspect detection
```

---

## FEATURE 3: Search by Brand

### What it does
Add a new search mode alongside the existing keyword/product search. Users can search by brand name (the `pageName` or `brand` field from AdRecord) to see all crawled ads from a specific competitor.

### Implementation

#### Update the search/crawl UI

```
Current search UI (on /dashboard or main page):
  - Keyword input + Market dropdown + "Start Crawl" button

Add a search mode toggle:
  ┌─────────────────────────────────────────────────┐
  │  Search by:  [Product ▼]  [Brand ▼]             │
  │                                                   │
  │  Product mode (existing):                         │
  │    Keyword: [creatine gummies    ]                │
  │    Market:  [US ▼] [UK ▼] [AU ▼]                 │
  │    [Start Crawl]                                  │
  │                                                   │
  │  Brand mode (NEW):                                │
  │    Brand: [Bear Balanced         ] ← autocomplete │
  │    Market: [All ▼] [US ▼] [UK ▼] [AU ▼]          │
  │    [Search DB] [Crawl New]                        │
  └─────────────────────────────────────────────────┘
```

#### Brand search — two modes:

**Mode A: "Search DB" (instant, searches existing data)**
```
GET /api/ads?brand={brandName}&market={market}

Query: 
  SELECT * FROM AdRecord 
  WHERE (LOWER(brand) LIKE LOWER('%{brandName}%') OR LOWER(pageName) LIKE LOWER('%{brandName}%'))
  AND (market = {market} OR {market} = 'ALL')
  ORDER BY adScore DESC

Returns: list of AdRecords matching that brand from already-crawled data.
Display in the same card grid UI as product search results.
```

**Mode B: "Crawl New" (triggers a new Apify crawl filtered by page/advertiser)**
```
POST /api/crawl
Body: { type: "brand", brandName: "Bear Balanced", market: "US" }

This modifies the Python pipeline to:
  1. Search Meta Ad Library by advertiser name instead of keyword
  2. Use the Apify actor's "ad_reached_countries" filter for market
  3. Skip OCR Gate (already filtered by brand, not keyword relevance)
  4. Still run Haiku + Sonnet gates for analysis
  5. Return all video ads from that specific brand/page
```

#### Brand autocomplete
```
GET /api/brands?q={partial_name}

Query:
  SELECT DISTINCT brand, pageName, market, COUNT(*) as adCount
  FROM AdRecord
  WHERE LOWER(brand) LIKE LOWER('%{q}%') OR LOWER(pageName) LIKE LOWER('%{q}%')
  GROUP BY brand, pageName, market
  ORDER BY adCount DESC
  LIMIT 10

Returns: list of { brand, pageName, market, adCount } for autocomplete dropdown.
Each result shows: "Bear Balanced (US) — 8 ads" format.
```

#### Brand profile page (optional but high-value addition)
```
Route: /brands/[brandName]

Shows:
  - Brand name + total ads crawled
  - Market breakdown (pie chart or pills: "US: 12 ads · UK: 3 ads · AU: 0")
  - Average AdScore for this brand
  - Dominant hook types (bar chart from hookType field)
  - Dominant angles (from primaryAngle field)
  - Ad timeline: horizontal timeline showing when each ad started, which are still active
  - All ads grid below, sortable by adScore / longevity / date
  - "Follow this brand" button → auto-re-crawl weekly (store in a BrandFollow table)
```

---

## FEATURE 4: Trending Ads Section

### What it does
A dedicated `/trending` page that surfaces the most successful video ads across ALL brands, ALL markets, and ALL keywords in the database. This is the "what's winning right now" global leaderboard. No filtering by brand or keyword — pure signal.

### Trending algorithm

```typescript
// Trending Score formula — combines multiple signals of a winning ad
//
// trendingScore = 
//   (longevityDays / maxLongevityInDB) * 0.35          // Longevity signal (35%)
//   + (normalizedImpressions) * 0.20                    // Reach signal (20%)
//   + (adIterations / maxIterationsInDB) * 0.20         // Iteration signal — brand keeps making versions = winner (20%)
//   + (recencyBoost) * 0.15                             // Recency signal — newer ads that already show longevity (15%)
//   + (adScore / 10) * 0.10                             // Existing AdScore (10%)
//
// Where:
//   normalizedImpressions = impressionsMidpoint / maxImpressionsMidpointInDB
//   impressionsMidpoint = (impressionsLow + impressionsHigh) / 2
//   recencyBoost = max(0, 1 - (daysSinceAdStart / 180)) // Linear decay over 6 months
//
// FILTERS applied before ranking:
//   - status = "active" only
//   - longevityDays >= 14 (minimum 2 weeks to prove staying power)
//   - must have videoUrl (video ads only)
```

### API Route

```
GET /api/trending?limit=50&market=ALL&minLongevity=14&hookType=&period=30d

Query params:
  limit:        number of results (default 50)
  market:       "ALL" | "US" | "UK" | "AU" (default ALL)
  minLongevity: minimum days active (default 14)
  hookType:     filter by hookType if set (optional)
  period:       "7d" | "30d" | "90d" | "all" — only show ads started within this window

Implementation:
  Compute trendingScore for all active ads matching filters.
  Sort by trendingScore DESC.
  Return top N results with full AdRecord data.
```

### `/trending` page UI

```
Layout:
  ┌─────────────────────────────────────────────────────────────────┐
  │ 🔥 TRENDING ADS                                                │
  │                                                                 │
  │ Filters bar:                                                    │
  │   Market: [ALL] [US] [UK] [AU]     ← toggle pills              │
  │   Period: [7d] [30d] [90d] [All]   ← toggle pills              │
  │   Min longevity: [14] days         ← number input              │
  │   Hook type: [All types ▼]         ← dropdown from distinct    │
  │                                       hookType values in DB     │
  │                                                                 │
  │ Results: ranked list with position numbers                      │
  │                                                                 │
  │  #1  ┌──────────────────────────────────────────────────┐       │
  │      │ [Video Thumb]  Brand: Bear Balanced               │       │
  │      │                Market: US 🇺🇸                     │       │
  │      │                Longevity: 91 days ✅               │       │
  │      │                Impressions: ~500K+                 │       │
  │      │                Iterations: 5 versions              │       │
  │      │                AdScore: 8.02                       │       │
  │      │                Hook: Investigation-Fraud           │       │
  │      │                Angle: Industry-fraud positioning   │       │
  │      │                Trending Score: 9.4                 │       │
  │      │                                                    │       │
  │      │   [▶ Watch]  [Save to Board]  [Generate Brief]    │       │
  │      └──────────────────────────────────────────────────┘       │
  │                                                                 │
  │  #2  ┌──────────────────────────────────────────────────┐       │
  │      │ ...next ad...                                      │       │
  │      └──────────────────────────────────────────────────┘       │
  └─────────────────────────────────────────────────────────────────┘

Each card shows these metrics prominently:
  - Rank position (#1, #2, #3...)
  - Trending score badge (color-coded)
  - Longevity in days with flame icon if > 60 days
  - Impression range
  - Ad iterations count (how many versions the brand made)
  - Hook type pill
  - Primary angle pill
  - AdScore badge

Card actions:
  - "Watch" → VideoPlayerModal (Feature 2)
  - "Save" → Board save dropdown (Feature 1) 
  - "Generate Brief" → Competitive Brief Generator (Feature 6)
  - "View Full Analysis" → navigate to /ads/[id] detail page
```

---

## FEATURE 5: Side-by-Side Ad Comparison

### What it does
Compare 2-3 ads head-to-head to identify shared winning patterns and differences. This is how you discover the "winning formula" — when 3 top ads all share the same hook type + angle + format, that's your signal.

### How to trigger comparison
```
Option A: From any ad list (trending, board detail, search results)
  - Checkbox on each ad card
  - When 2-3 checkboxes selected, floating "Compare (N)" button appears at bottom
  - Click → navigates to /compare?ids=id1,id2,id3

Option B: From ad detail page
  - "Compare with..." button → opens search modal to find another ad
  - Selecting an ad navigates to comparison view
```

### API Route

```
GET /api/ads/compare?ids=cuid1,cuid2,cuid3

Returns: Array of full AdRecords for the given IDs + a computed "sharedPatterns" object:

{
  ads: [AdRecord, AdRecord, AdRecord],
  sharedPatterns: {
    sameHookType: boolean,       // all ads share the same hookType
    hookType: string | null,     // the shared hook type if same
    sameAngle: boolean,
    angle: string | null,
    sameFramework: boolean,
    framework: string | null,
    sameCreativePattern: boolean,
    creativePattern: string | null,
    averageLongevity: number,
    averageAdScore: number,
    averageDuration: number,
    durationRange: { min: number, max: number },
    commonKeywords: string[],    // extracted from hook + concept fields via simple word frequency
    verdict: string              // AI-generated 2-sentence summary of what these winners share
  }
}

The "verdict" field is generated by a Claude API call:
  System: "You are an ad creative strategist. Analyze these winning ads and state in 2 sentences what pattern they share that makes them winners, and what a competitor should copy."
  User: JSON of the 2-3 ads' hook, hookType, primaryAngle, concept, framework, longevity, adScore
```

### `/compare` page UI

```
Layout: side-by-side columns (2 or 3 columns depending on ad count)

  ┌──────────────────────────────────────────────────────────────────────┐
  │ COMPARE ADS                                                          │
  │                                                                      │
  │ Shared Pattern Banner (highlighted if patterns match):               │
  │ ┌──────────────────────────────────────────────────────────────────┐ │
  │ │ ✅ Same hook type: Investigation-Fraud                           │ │
  │ │ ✅ Same angle: Industry-fraud positioning                        │ │
  │ │ ❌ Different framework: Investigation-Solution vs Problem-First  │ │
  │ │ 📊 Avg longevity: 67 days · Avg AdScore: 7.8                   │ │
  │ │                                                                  │ │
  │ │ AI Verdict: "All three winners use fraud-exposure hooks with     │ │
  │ │ investigative journalism framing. The key to competing: lead     │ │
  │ │ with third-party lab testing proof in the first 5 seconds."      │ │
  │ └──────────────────────────────────────────────────────────────────┘ │
  │                                                                      │
  │ ┌─── Ad 1 ───────┐  ┌─── Ad 2 ───────┐  ┌─── Ad 3 ───────┐       │
  │ │ [Video player]  │  │ [Video player]  │  │ [Video player]  │       │
  │ │                 │  │                 │  │                 │       │
  │ │ Brand: Bear...  │  │ Brand: Swol...  │  │ Brand: Crea...  │       │
  │ │ Market: US      │  │ Market: US      │  │ Market: UK      │       │
  │ │ AdScore: 8.0    │  │ AdScore: 7.5    │  │ AdScore: 7.2    │       │
  │ │ Longevity: 91d  │  │ Longevity: 65d  │  │ Longevity: 45d  │       │
  │ │ Iterations: 5   │  │ Iterations: 3   │  │ Iterations: 2   │       │
  │ │ Duration: 88s   │  │ Duration: 62s   │  │ Duration: 55s   │       │
  │ │                 │  │                 │  │                 │       │
  │ │ Hook Type:      │  │ Hook Type:      │  │ Hook Type:      │       │
  │ │ [Investigation] │  │ [Investigation] │  │ [Investigation] │       │
  │ │                 │  │                 │  │                 │       │
  │ │ Angle:          │  │ Angle:          │  │ Angle:          │       │
  │ │ [Industry-fraud]│  │ [Industry-fraud]│  │ [Purity-proof]  │       │
  │ │                 │  │                 │  │                 │       │
  │ │ Hook text:      │  │ Hook text:      │  │ Hook text:      │       │
  │ │ "I tested 12..."│  │ "Lab results ." │  │ "What's really" │       │
  │ │                 │  │                 │  │                 │       │
  │ │ Concept:        │  │ Concept:        │  │ Concept:        │       │
  │ │ [expandable]    │  │ [expandable]    │  │ [expandable]    │       │
  │ │                 │  │                 │  │                 │       │
  │ │ [Save] [Brief]  │  │ [Save] [Brief]  │  │ [Save] [Brief]  │       │
  │ └─────────────────┘  └─────────────────┘  └─────────────────┘       │
  │                                                                      │
  │ [Generate Combined Brief from All 3] ← Feature 6 trigger            │
  └──────────────────────────────────────────────────────────────────────┘

Matching fields are highlighted with green background.
Differing fields are highlighted with amber background.
This makes patterns instantly visible at a glance.
```

---

## FEATURE 6: Competitive Brief Generator

### What it does
One-click generation of an actionable creative brief for FusiForce (or any Wellness Nest product) based on one or more winning competitor ads. This closes the loop from intelligence → action. Output is a structured brief the creative team or AI video pipeline (Kling, Static Ads Generator) can execute immediately.

### How to trigger
```
1. From any single ad card: "Generate Brief" button
2. From comparison view: "Generate Combined Brief from All" button
3. From a board: "Generate Brief from Board Winners" (uses top 3 by adScore)
4. From trending page: "Generate Brief" on any card
```

### API Route

```
POST /api/briefs/generate
Body: {
  adIds: string[],              // 1-3 AdRecord IDs to base the brief on
  targetProduct: string,        // "FusiForce" | "MenoMate" | "FloraFresh" | "Shilajit" | custom
  targetMarket: string,         // "US" | "UK" | "AU"
  additionalContext?: string    // optional user notes (e.g. "focus on the subscription angle")
}

Response: {
  id: string,                   // brief ID (stored in DB)
  generatedAt: string,
  basedOnAds: string[],         // ad IDs
  targetProduct: string,
  targetMarket: string,
  brief: GeneratedBrief
}
```

### Brief generation — Claude API prompt

```typescript
// System prompt for brief generation:

const systemPrompt = `You are an elite DTC supplement creative strategist. 
You work for Wellness Nest, a supplement brand portfolio.

Your job: analyze winning competitor ads and generate an actionable creative brief 
that our team can execute TOMORROW to compete and dominate.

BRAND CONTEXT:
- FusiForce: World's first creatine gummies with INDIVIDUAL POUCHES (not jars). 
  5g clinical dose per serving. ISO 17025 post-manufacturing lab tested. 
  90-day empty-bottle money-back guarantee. Markets: US, UK, AU.
- MenoMate: Menopause support supplement targeting women 45-65 with hip/joint pain.
- FloraFresh: Gut health probiotic supplement.
- Shilajit: Energy/vitality supplement for men 35-55. Available as resin and gummies.

OUTPUT FORMAT — return valid JSON matching this exact structure:
{
  "briefTitle": "string — compelling 1-line brief title",
  "winningPatternSummary": "string — 2-3 sentences on what the reference ads prove works",
  "recommendedFormat": "string — e.g. '9:16 vertical, 60-90s, voiceover-led UGC'",
  "targetAudience": "string — specific audience segment with psychographics",
  "hookApproach": {
    "hookType": "string — recommended hook type from reference ads",
    "hooks": [
      "string — 3 specific hook options adapted for our product (NEVER use -- or — dashes)"
    ]
  },
  "messagingAngle": "string — the primary messaging angle to use",
  "offerStructure": "string — recommended offer (discount, bundle, subscription, guarantee)",
  "scriptOutline": {
    "phases": [
      {
        "phase": "string — HOOK / AGITATE / REVEAL / PROOF / CTA",
        "duration": "string — e.g. '0-5s'",
        "direction": "string — what happens visually and in voiceover",
        "textSupers": ["string — on-screen text overlays"]
      }
    ]
  },
  "differentiators": [
    "string — 3-5 unique selling points to emphasize that competitors lack"
  ],
  "referenceAds": [
    {
      "brand": "string",
      "whatToSteal": "string — specific element to copy",
      "whatToImprove": "string — specific element we can do better"
    }
  ],
  "productionNotes": "string — practical notes for the video editor/creator"
}

RULES:
- Every hook option must be specific and ready-to-film, not generic
- Never use "--" (double dashes) or "—" (em dash) in any hook or caption text
- Adapt the winning pattern to our product's unique advantages
- Always include our 90-day guarantee (FusiForce) or relevant trust signal
- Script phases should map to specific timecodes
- Differentators must reference things competitors DON'T have
- Be bold and specific, not safe and generic`;

// User prompt:
const userPrompt = `Generate a creative brief for ${targetProduct} in the ${targetMarket} market.

Based on these ${ads.length} winning competitor ad(s):

${ads.map((ad, i) => `
--- REFERENCE AD ${i + 1} ---
Brand: ${ad.brand}
Market: ${ad.market}
AdScore: ${ad.adScore}
Longevity: ${ad.longevity} days
Hook Type: ${ad.hookType}
Hook: ${ad.hook}
Primary Angle: ${ad.primaryAngle}
Framework: ${ad.framework}
Concept: ${ad.concept}
Key Takeaways: ${ad.keyTakeaways}
Production Formula: ${ad.productionFormula}
`).join('\n')}

${additionalContext ? `Additional context from user: ${additionalContext}` : ''}

Return ONLY valid JSON matching the specified structure. No markdown, no preamble.`;
```

### Database Schema — store generated briefs

```prisma
model Brief {
  id              String   @id @default(cuid())
  targetProduct   String   // "FusiForce", "MenoMate", etc.
  targetMarket    String   // "US", "UK", "AU"
  basedOnAdIds    String[] // array of AdRecord IDs
  briefJson       Json     // the full GeneratedBrief JSON
  userContext     String?  // optional additional context user provided
  createdAt       DateTime @default(now())
}
```

### UI — Brief generation flow

```
Step 1: User clicks "Generate Brief" on any ad/comparison/board
Step 2: Modal opens with:
  - Target product dropdown: FusiForce (default) | MenoMate | FloraFresh | Shilajit | Custom
  - Target market: US | UK | AU (pre-filled from the reference ad's market)
  - Additional context: optional textarea ("Focus on subscription angle", "Make it funny", etc.)
  - "Generate" button
Step 3: Loading state with streaming animation (brief generates in ~5-10 seconds)
Step 4: Brief display page (/briefs/[id]) with:
  - Brief title (large heading)
  - Winning pattern summary (highlighted card)
  - Recommended format + audience (side by side)
  - Hook options (3 options, each in a card, with "Copy" button)
  - Script outline (phased timeline, each phase as a collapsible card)
  - Differentiators (bullet list)
  - Reference ads (linked back to the ad detail pages)
  - Production notes (callout box)
  - Actions: "Copy as Markdown" | "Export to Google Sheet" | "Re-generate" | "Save to Board"
```

### `/briefs` page — Brief history
```
List all generated briefs, sorted by createdAt DESC.
Each card shows:
  - Brief title
  - Target product + market
  - Based on N ads
  - Generated date
  - Click → full brief view
```

---

## NAVIGATION — Updated Sidebar

```
Current sidebar (assumed):
  📊 Dashboard (crawl + search)
  📋 Results

Updated sidebar:
  📊 Dashboard        — crawl + search (existing, add brand search toggle)
  🔥 Trending         — Feature 4 (trending ads leaderboard)
  🔖 Saved            — Feature 1 (boards gallery)
  🆚 Compare          — Feature 5 (comparison view, also accessible from selections)
  📝 Briefs           — Feature 6 (brief history + generation)
  ⚙️ Settings         — (future: API keys, notification prefs, followed brands)
```

---

## IMPLEMENTATION ORDER (for tonight)

Build in this exact sequence — each feature unlocks the next:

```
1. Prisma schema migration (add Board, SavedAd, Brief models)     → 15 min
2. Feature 2: VideoPlayerModal component + video proxy route        → 30 min
3. Feature 3: Brand search (DB query mode + autocomplete)           → 30 min
4. Feature 1: Saved boards CRUD + save-to-board dropdown            → 60 min
5. Feature 4: Trending page + trending score algorithm              → 45 min
6. Feature 5: Comparison view + shared pattern detection            → 45 min
7. Feature 6: Brief generator (Claude API + brief display page)     → 60 min
8. Navigation sidebar update + polish                               → 15 min
```

**Total estimated: ~5 hours**

---

## SHARED COMPONENTS TO CREATE

```
/components/
  ├── VideoPlayerModal.tsx       — Feature 2 (used everywhere)
  ├── AdCard.tsx                 — Unified ad card component used across all pages
  │                                Props: ad, showCheckbox?, onSave, onWatch, onBrief
  ├── SaveToBoardDropdown.tsx    — Feature 1 (bookmark dropdown, used on every AdCard)
  ├── MetricBadge.tsx            — Reusable colored badge (adScore, longevity, hookType)
  ├── TrendingScoreBadge.tsx     — Feature 4 (trending score display with flame icon)
  ├── CompareBar.tsx             — Feature 5 (floating bar when ads are selected)
  ├── BriefGenerateModal.tsx     — Feature 6 (product/market/context input modal)
  └── BriefDisplay.tsx           — Feature 6 (renders the generated brief JSON)
```

---

## CRITICAL NOTES

1. **Video URLs expire.** fbcdn URLs are temporary (usually valid for hours to days). The video proxy helps but isn't a permanent fix. Add a `videoUrlExpiry` warning in the UI if the ad was crawled > 7 days ago. Future enhancement: store videos in S3/Vercel Blob.

2. **No double dashes.** Per user preference: never output "--" or "—" in any ad copy, hooks, or brief text. Enforce this in the Claude prompt AND add a post-processing step: `briefText.replace(/--|—/g, ',')`.

3. **AdCard is the atomic unit.** Build AdCard once, use everywhere. Every page (dashboard, trending, saved, compare, search results) renders the same AdCard component with different prop configurations. This prevents inconsistency and speeds development.

4. **Trending score should be computed at query time**, not stored. The inputs (longevity, impressions, iterations, recency) change daily. Add it as a computed column in the API response, not a DB field.

5. **Brand search "Crawl New" mode** reuses the existing Python pipeline. The only change is the Apify actor input: switch from `search_terms` to `ad_reached_countries` + `search_page_ids` (the Facebook Page ID for the brand). You may need to first resolve brand name → Facebook Page ID via the Ad Library search.

6. **Comparison "verdict"** uses a lightweight Claude Haiku call (not Sonnet) to keep it fast and cheap. The input is just the structured fields, not the full analysis text.