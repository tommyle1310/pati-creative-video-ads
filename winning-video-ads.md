---
name: winning-video-ads
description: >
  Use this skill whenever the user wants to identify, analyze, or reverse-engineer winning competitor video ads, define what makes a "perfect" video ad for a DTC supplement brand, score or audit an existing ad creative, build a video ad brief, or decide what to test next in a paid video creative pipeline. Trigger this skill for any request involving: competitor ad analysis, Meta Ads Library review, video creative strategy, ad scoring rubrics, hook analysis, retention strategy, UGC or paid social video briefs, or creative iteration frameworks. This is the authoritative reference for video ad excellence — use it aggressively whenever the conversation touches winning ads, creative benchmarks, or production priorities.
---

# Winning Video Ads — Expert Synthesis Framework

> Synthesized from: Derral Eves · Tim Schmoyer · Paddy Galloway · Seb Losardo · Jamie Whiffen · Gary Vaynerchuk · Dharmesh Shah · Yans Media · Sandwich Video · Lemonlight · VeracityColab

---

## PART 1 — WHAT DEFINES A TRUE WINNING AD

A "winning ad" is not defined by aesthetics, spend, or virality alone. A true winner satisfies **all three layers simultaneously**:

```
LAYER 1: SCROLL STOP     → Does it earn the first 3 seconds?
LAYER 2: RETENTION       → Does it sustain attention to the CTA?
LAYER 3: CONVERSION      → Does it produce profitable action at scale?
```

An ad that wins Layer 1 but fails Layer 2 is a cheap hook. An ad that wins Layers 1–2 but fails Layer 3 is entertainment. Only all three = winner.

### How This Project Detects Winners

**IMPORTANT:** AI (Claude Sonnet) CANNOT reliably score creative quality (hook effectiveness, retention, etc.) because:
- An "ugly" shaky UGC video might outperform a polished studio ad 10:1
- AI biases toward what sounds clever/structured, not what actually converts
- Sonnet has never seen actual performance data (CTR, thumb-stop rate, ROAS)

**Winner detection uses DATA signals, not AI opinions:**

| Signal | What it proves | Weight in AdScore |
|--------|---------------|-------------------|
| **Longevity (90+ days)** | Advertiser keeps paying → it converts | 40% |
| **Impressions** | Meta's algorithm serves it → it performs | 25% |
| **Iteration count (>5)** | Brand is scaling this creative → proven winner | 25% |
| **Duration** | Longer watch time = engagement signal | 10% |

**Sonnet's role is DESCRIPTIVE only** — classify hookType, creativePattern, framework. Never score quality.

---

## PART 2 — THE 7-SIGNAL WINNING AD SCORECARD

This scorecard is for **human review** of the top-ranked ads (ranked by data-driven AdScore). The creative team watches each video and evaluates these 7 signals manually. AI does NOT score these.

Rate each signal 1–5. Any signal scoring ≤2 is a **kill condition** — fix before scaling.

### SIGNAL 1 — THE HOOK PACKAGE *(Jamie Whiffen PVSS + Paddy Galloway)*
The PVSS (Pattern, Visual, Sound, Statement) framework governs the first 3 seconds:

| Element | What to evaluate |
|---------|-----------------|
| **P**attern interrupt | Does it visually break the feed scroll? Unusual angle, movement, color contrast, or unexpected subject. |
| **V**isual clarity | Can you understand the product/problem in <1s with sound OFF? |
| **S**ound hook | Does the first word/sound create a reason to unmute or keep watching? |
| **S**tatement hook | Is the opening line a bold claim, provocative question, or identity trigger? NOT a product intro. |

> Winning hooks fall into 6 archetypes: **Problem-First UGC · Result-First Scroll Stop · Curiosity Gap · Social Proof Cascade · Comparison/Versus · Authority Demo**

**Score 5:** All four PVSS elements fire. Hook type is specific and non-generic.
**Score 1:** Opens with logo, brand name, or generic "Hey guys" intro.

---

### SIGNAL 2 — RETENTION ARCHITECTURE *(Tim Schmoyer + Derral Eves)*

Structure the ad so every 5–8 seconds delivers a "retention anchor" — a reason to keep watching.

**The 4-part retention spine for 30–60s ads:**
```
0:00–0:03  → HOOK (PVSS)
0:03–0:15  → PROBLEM AMPLIFICATION (make pain/desire feel real)
0:15–0:45  → PROOF STACK (mechanism + social proof + credibility)
0:45–0:60  → CTA with urgency/consequence framing
```

**For 15s ads:**
```
0:00–0:03  → HOOK
0:03–0:10  → One-sentence mechanism + social proof
0:10–0:15  → CTA
```

Watch for **drop-off death zones**: seconds 3–5 (post-hook), 15–18 (proof begins), and last 5 seconds (CTA fatigue). Competitor ads that survive all three zones are structurally strong.

---

### SIGNAL 3 — PACKAGING & THUMBNAIL LOGIC *(Paddy Galloway)*

In paid video, the "thumbnail" = first frame + first 0.5s of motion. This is what Meta's auction optimizes CTR against.

**Evaluate:**
- Is the first frame a standalone communicator? (If frozen, does it still tell a story?)
- Is there a **visual hierarchy**? One dominant element (face/emotion OR product OR result text)
- Does the first frame match the emotional register of the target audience's current state?

---

### SIGNAL 4 — IDENTITY & CULTURE FIT *(Gary Vaynerchuk)*

The ad must feel like it belongs *inside* the culture of the target, not *shouted at* them.

Ask:
- Does this ad use the language, slang, or references of the buyer natively?
- Does it validate or elevate the buyer's **self-image** (who they want to be)?
- Does it feel platform-native? (Facebook/IG Reels UGC ≠ YouTube mid-roll ≠ TikTok)

---

### SIGNAL 5 — MECHANISM CLARITY *(Sandwich Video + Yans Media)*

The viewer must understand **WHY this product works** in plain language — not just *that* it works.

**Mechanism formula:**
```
"[Product] works because [specific ingredient/process] → which causes [biological/physical result] → so you feel/see [outcome]."
```

---

### SIGNAL 6 — PROOF VELOCITY *(Dharmesh Shah + Tim Schmoyer)*

Social proof must arrive **early and fast**, not saved for the end.

**Proof hierarchy (highest to lowest conversion impact):**
1. Specific result claim with number ("Lost 8 lbs in 3 weeks")
2. User-generated testimonial (real person, real name, authentic delivery)
3. Before/after visual
4. Review count / star rating flash
5. Expert/doctor mention
6. Brand name/award

**Rules:**
- Proof type #1 or #2 must appear before the 15-second mark
- Proof must be **specific**, not general

---

### SIGNAL 7 — SYSTEM REPLICABILITY *(Seb Losardo + Lemonlight)*

A winning ad is only strategically valuable if it can be iterated and scaled via a **system**, not a one-off talent.

**Evaluate:**
- Can this ad be re-created with a different hook in <48 hours?
- Is the visual style/format documented?
- Does the brand own the format, or does it depend on one creator's persona?

---

## PART 3 — HOW THIS PROJECT IDENTIFIES WINNERS

### Step 1 — Data-Driven Ranking (Automated)
AdScore formula ranks all crawled ads by objective performance signals:
```
AdScore = (Longevity × 0.40) + (Impressions × 0.25) + (Iterations × 0.25) + (Duration × 0.10)
```
Top-scored ads = ads where the brand kept paying because they converted.

### Step 2 — AI Classification (Automated, Descriptive Only)
Sonnet classifies each ad's:
- `hookType` — which of the 6 archetypes (string classification, NOT quality score)
- `creativePattern` — Problem-First UGC / Result-First / Curiosity Gap / Social Proof Cascade / Comparison / Authority Demo
- `frameworkName` — PAS / AIDA / Testimonial Teaser / etc.

### Step 3 — Pattern Aggregation (Automated)
After all ads are collected, one summary pass identifies:
- "7 of top 10 ads use Problem-Curiosity hooks" (data-driven pattern)
- "UGC format has 2x avg longevity vs studio" (data-driven insight)
- These are DATA-DRIVEN patterns, not AI quality opinions

### Step 4 — Human Review (Manual)
Creative team reviews Top 5 by AdScore on Google Sheet:
- Watches actual videos (links provided in sheet)
- Applies 7-Signal Scorecard manually
- Decides what to mimic based on their market knowledge

---

## PART 4 — CREATIVE PATTERN TYPES

Group winners by pattern, not by content:

| Pattern Type | Description |
|---|---|
| **Problem-First UGC** | Opens with pain, delivers mechanism, closes with result |
| **Result-First Scroll Stop** | Opens with the outcome ("I lost 12 lbs"), works backwards |
| **Curiosity Gap** | Opens with a question/incomplete claim that forces watch-through |
| **Social Proof Cascade** | Stacks multiple short testimonials back-to-back, builds momentum |
| **Comparison/Versus** | Positions vs. old category behavior (pills → gummies, powder → no prep) |
| **Authority Demo** | Creator/expert explains the mechanism live with product |

---

## PART 5 — THE PERFECT AD BRIEF: EDGE Framework

After identifying winning patterns, build a brief that *improves on*, not copies, the competitor benchmark.

```
E — Emotion depth     : Is our emotional trigger more specific/resonant than theirs?
D — Data precision    : Is our proof claim more specific/credible than theirs?
G — Gap exploitation  : What did their winning ad NOT address? Lead with that.
E — Execution system  : Can we produce this in our current pipeline?
```

### Brief Required Fields

| Field | Standard |
|---|---|
| **Hook type** | One of the 6 pattern types, with first sentence written out |
| **PVSS spec** | Explicit direction for all 4 PVSS elements |
| **Retention anchors** | Timestamps for each retention anchor in the script |
| **Mechanism line** | The exact product-mechanism sentence |
| **Proof stack** | Proof type + delivery timing + format |
| **CTA frame** | Urgency / identity / FOMO — pick one, write the line |
| **Visual format** | Platform-native spec (aspect ratio, UGC vs. produced, caption style) |
| **Replication score** | Can a new creator execute this from this brief alone? Y/N |

---

## PART 6 — ITERATION PRIORITY LOGIC

When deciding which ad to test next:

```
1. Is there a current control (winning ad)?
   NO  → Test 3 different Hook types simultaneously (Hook Breadth Test)
   YES → Go to 2

2. Does the control score ≤3 on any single signal?
   YES → Isolate and test that signal only (Signal Fix Test)
   NO  → Go to 3

3. Is the control ad tied to one creator persona?
   YES → Test same script, different creator (Persona Transfer Test)
   NO  → Go to 4

4. Has the control been running >45 days?
   YES → Test new Hook type against same mechanism (Hook Refresh Test)
   NO  → Hold and optimize spend on current control
```

---

## PART 6 — AI CURATION LAYER: SELECTING TOP N FROM RANKED DATASET

> **This governs how the dashboard selects the best N ads from the DB and outputs all fields for immediate creative team use. Implemented in `/api/top-winners`.**

### 6.1 — Why Raw AdScore Ranking Alone Is Not Enough

Taking top 10 by AdScore produces a **biased set**, not a strategically useful one:
- 8 of 10 ads from 2 brands → same pattern repeated, no new intelligence
- 10 Problem-First UGC ads → zero Curiosity Gap, zero Comparison represented
- US-only ads → no UK/AU creative intelligence
- The **underexploited archetype** (low frequency, highest longevity) gets buried

**Strategic selection requires diversity across 4 dimensions simultaneously:**

```
DIMENSION 1: Creative Pattern diversity   → All 6 patterns represented where possible
DIMENSION 2: Market diversity             → US / UK / AU each have entries
DIMENSION 3: Brand diversity              → Max 2 ads from any single brand
DIMENSION 4: Hook type diversity          → No more than 40% from one hook archetype
```

### 6.2 — The Selection Algorithm (5 Steps, Run in Order)

**Input:** All records sorted by AdScore DESC
**Output:** Top N records (N = user-specified: 3–20) meeting diversity constraints

```
STEP 1 — HARD EXCLUSIONS (remove before any selection)
  Exclude if: longevityDays < 14                         → too new to judge
  Exclude if: adIterationCount = 1 AND longevityDays < 30 → single test, unvalidated
  Exclude if: all analysis fields null/empty              → pipeline failure

STEP 2 — ANCHOR SELECTION (lock in highest-confidence winners first)
  Select #1 AdScore ad per market (US, UK, AU) → up to 3 anchors locked
  These are non-negotiable regardless of pattern overlap

STEP 3 — PATTERN DIVERSITY FILL
  For each of the 6 creative patterns NOT yet represented in anchors:
    → Select highest AdScore ad of that pattern type
    → Apply brand cap: skip if brand already has 2 selected ads
  Continue until N reached OR all patterns represented

STEP 4 — SCORE FILL (if N not yet reached)
  Fill remaining slots from top of AdScore ranking
  Apply brand cap (max 2 per brand)
  Apply hook type cap (max 40% of final N from any single hookType)

STEP 5 — UNDEREXPLOITED ARCHETYPE BONUS (if N ≥ 10)
  Identify: creative pattern with lowest frequency in eligible pool
            BUT highest average longevity among its members
  → Force-include 1 ad of this pattern even if lower AdScore
  → Tag: isUnderexploitedArchetype = true
  → This is the creative moat opportunity
```

### 6.3 — Output Validation Rules

```
VALIDATION CHECKLIST:
□ Count = requested N (or max available)
□ No brand appears more than 2 times
□ No hookType exceeds 40% of N
□ At least 1 ad per market present in dataset
□ If N ≥ 10: exactly 1 ad flagged isUnderexploitedArchetype
□ All required fields present and non-null per ad
□ patternsRepresented contains ≥ 3 distinct values (when available)
```

### 6.4 — Creative Team Handoff

```
TOOL OUTPUT                              CREATIVE TEAM ACTION
─────────────────────────────────        ──────────────────────────────────────
Top N ads, full fields, ranked           Watch actual videos via ad link
Production Formulas per ad               Copy formula → swap in own brand product
STEAL/KAIZEN/UPGRADE per ad              Build EDGE brief targeting KAIZEN gaps
Pattern distribution in meta             Identify which pattern to lead with
isUnderexploitedArchetype = true         Brief 1 ad of this type — it's your moat
7-Signal Scorecard (Part 2)              Score each video watched, 1–5 per signal
                                         Signal ≤2 = kill condition, brief the fix
```

### 6.5 — Market-Specific Curation Notes

| Market | Regulatory | Format preference | Selection note |
|---|---|---|---|
| **US** | FTC: substantiation required | 9:16 UGC talking head, gym/lifestyle | Largest pool — apply all diversity rules |
| **UK** | ASA: stricter on before/after | 1:1 format, reserved tone, benefit-led | Flag if claims won't transfer to US |
| **AU** | TGA: therapeutic claims need registration | Outdoor/active, shorter 15–30s | Category less saturated — first-mover gaps |

**Cross-market pattern win = strongest signal:** Same creative pattern ranks top across all 3 markets → universal structure → #1 production priority.

---

## PART 6B — MINIMUM DATA THRESHOLDS

```
Longevity < 14 days                        → flag "monitoring"   — exclude from Top N
adIterationCount = 1 AND longevity < 30d   → flag "testing"      — exclude from Top N
All analysis fields null                   → flag "pipeline fail" — exclude entirely

Ads meeting threshold  → eligible for AdScore + curation
Ads below threshold    → appear in full sheet, flagged, never in Top N
```

**Impression range rule:** Always use upper bound of Meta's impression range for AdScore.
Ads with wide ranges carry more uncertainty — use longevity and iteration count as tiebreakers.

---

## QUICK REFERENCE — EXPERT PRINCIPLES CHEATSHEET

| Expert | Core Principle for Video Ads |
|---|---|
| **Derral Eves** | Algorithm rewards sustained CTR + watch time. Design for signal velocity, not just creative quality. |
| **Tim Schmoyer** | Build retention architecture. The 5-second drop-off zones kill more ads than bad products. |
| **Paddy Galloway** | Packaging is the bottleneck. If the first frame and hook sentence aren't world-class, nothing else matters. |
| **Seb Losardo** | Build a system that produces winners, not a one-off winner. Document every format as a replicable template. |
| **Jamie Whiffen** | PVSS governs the first 3 seconds. Four elements, all must fire. Front-load everything. |
| **Gary Vaynerchuk** | Culture-first. Speak native. Give value before the ask. Identity > feature list. |
| **Dharmesh Shah** | Data doesn't lie. Specific numbers in claims outperform vague superlatives every time. |
| **Sandwich Video** | One product. One claim. One emotion. Constraint is the creative discipline. |
| **Yans Media** | The explainer moment converts skeptics. Never skip mechanism clarity even in short-form. |
| **Lemonlight** | Speed and volume matter. A system that ships 3 good ads beats a system that ships 1 perfect ad. |
| **VeracityColab** | Trend-native formats outperform timeless formats. Read the platform culture before scripting. |

---

## USAGE IN THIS PROJECT

| Task | Parts to use |
|---|---|
| Define what makes a winner | Part 1 + Part 2 |
| Score a competitor ad (human) | Part 2 (7-Signal Scorecard) |
| Classify an ad (AI, per-ad) | Part 4 (Creative Pattern Types) |
| **Select Top N from DB (dashboard)** | **Part 6 (AI Curation Layer)** |
| Build a new ad brief | Part 5 (EDGE Framework) |
| Decide what to test next | Part 5B (Iteration Logic) |
| Exclude bad data | Part 6B (Thresholds) |
| **Sonnet analysis prompt** | Part 4 for classification |
| **AdScore formula** | Part 3 Step 1 (data-driven signals) |
| **Google Sheet Tab 5** | Part 3 Step 3 (Pattern Aggregation) |
| **Production Formula field** | Part 5 (EDGE Brief) structure |
| **Human review** of Top Winners | Part 2 (7-Signal Scorecard) manually |

---

## PART 7 — DEEP EXPERT RESEARCH (RAW FINDINGS)

This section contains detailed, practical research on each expert's specific methodology, applied to DTC supplement/wellness brands and competitor intelligence automation.

---

### 7.1 DERRAL EVES — YouTube Algorithm & Data-Driven Video

**Who:** Author of WSJ bestseller *The YouTube Formula*. Generated 60B+ views. Helped 24 channels grow from 0 to 1M subscribers. Works with MrBeast.

**Core Framework: Try > Fail > Analyze > Adjust**
Eves treats video success as an iterative data science problem, not a creative one. His formula is audience-first, data-centered, and human-optimized.

**Specific Metrics & Signals:**

| Metric | What Eves Says | Threshold |
|--------|---------------|-----------|
| **Watch Time** | "Watch time is the currency of YouTube. The longer you keep people watching, the more YouTube will push your content." | Primary ranking signal |
| **Click-Through Rate** | Percentage of thumbnail impressions that turned into views. Measures whether packaging works. | 4-10% is healthy range |
| **Audience Retention** | Retention graph analysis is core. He uses the "bridge technique" — insert cards at retention drop points to redirect viewers. | 50%+ average view duration = strong |
| **Engagement** | Likes, dislikes, comments. Measures how compelling content is. | Track per-video trends |
| **Viewer Satisfaction** | YouTube shifted from view-based to audience-based metrics. Happy viewers = more recommendations. | Qualitative + data signals |

**Reverse-Engineering Competitors:**
- If competitors' videos outperform yours, metrics help you reverse-engineer what's working in your industry
- Examine data closely to identify particular aspects that with slight modifications could greatly enhance audience numbers
- Focus on: tone, topic, timing, thumbnails, editing style, motion, angles
- Case study: Matt's Off Road Recovery — Eves identified that thumbnails drew viewers in but quick exits hurt average view duration. After fixing angles, motion, and editing style, viewership reached 1.7M daily

**Four Diagnostic Questions:**
1. What's working well? Continue/optimize these elements
2. Is content clear? If not resonating, find out why
3. What opportunities exist based on audience feedback?
4. What specific issues (low CTR, bad intros) cause drop-off?

**Audience-First Method (Persona Breakdown):**
- Go beyond demographics (age, gender, location)
- Map psychographics: what audience does online/offline, what shows they watch, what problems they solve
- Content must speak directly to audience's self-identity
- Value proposition is the ultimate hack for reaching right audience

**Application to DTC Supplements:**
- Longevity of an ad = equivalent of watch time. Brand keeps paying because viewers keep watching and converting
- CTR on first frame = equivalent of thumbnail CTR. First frame must earn the click
- Iteration count = equivalent of a creator making more videos on same topic. Brand found something that works and keeps producing variants

**How a Competitor Intel Tool Detects This:**
- Track ad longevity (days running) as proxy for watch time / ROI
- Track iteration count as proxy for "the brand found a winning format"
- Track impressions as proxy for algorithmic distribution (Meta equivalent of YouTube recommendations)
- Ads running 90+ days with high iteration counts are Eves-style "proven winners"

---

### 7.2 TIM SCHMOYER — Retention Architecture

**Who:** Founder of Video Creators Agency. YouTube consultant. Now at vidIQ. Pioneer of retention-focused video strategy.

**Core Framework: 50% Average View Duration Target**
Schmoyer found that the difference between channels that "do OK" and those that "really take off" is maintaining consistently around 50% Average View Duration through the end of the video. This is the single most important algorithmic signal.

**The 7-Question Storytelling Model:**
Every video (or ad) must answer seven questions to maintain retention. The critical ones identified:

1. **What does the character want?** — The story revolves around whether they get it or not
2. **Why can't they get what they want?** — Obstacles and barriers
3. **What are the stakes?** — What it costs if they fail. "Many people miss this one, and without it the story falls flat"
4. What if they don't get it? (consequence amplification)
5. How do they attempt to overcome? (mechanism/solution)
6. Do they succeed or fail? (resolution)
7. What changes as a result? (transformation)

**Performance Evidence:**
- Storytelling videos get DOUBLE the watch time
- DOUBLE the retention
- QUADRUPLE the engagement
- Typically around 10X the views compared to non-storytelling videos

**Specific Retention Techniques:**

| Technique | How It Works |
|-----------|-------------|
| **Dangling Questions** | Guide viewers segment-to-segment using questions like "What happens next?" as "dangling carrots" |
| **Open/Close Loops** | As you close one loop, open a new one. Never let all tension resolve at once |
| **Title/Thumbnail Promise** | Set viewer expectations in title/thumbnail, then deliver on that promise within the first 15 seconds |
| **Stakes Establishment** | The #1 missed element. Without stakes, viewers have no reason to stay |
| **Drop-Off Monitoring** | Track where viewers drop off. Monitor replays — they indicate either confusion or exceptional interest |

**Drop-Off Patterns That Kill Ads:**
- Seconds 0-3: Post-hook drop (50-60% of all drop-offs happen here)
- Seconds 3-5: "Promise gap" — hook made a promise, content isn't delivering
- Seconds 15-18: Proof section begins but feels boring or unbelievable
- Last 5 seconds: CTA fatigue — viewer already decided and bounces before action

**Application to DTC Supplements:**
- Creatine gummy ads must answer: "What does the viewer want?" (energy, gains, convenience) within 3 seconds
- Stakes: "What happens if you keep using powder/pills?" (inconvenience, bad taste, inconsistency)
- Mechanism = the "how they overcome" question
- Result = transformation ("After 30 days of creatine gummies...")

**How a Competitor Intel Tool Detects This:**
- Ads with 60+ second duration AND 90+ day longevity = structurally strong retention
- Iteration count > 5 suggests the narrative structure works across variations
- Video duration itself signals whether the ad attempts short hook-only (15s) or full story arc (60s+)

---

### 7.3 PADDY GALLOWAY — Packaging & Pre-Production

**Who:** World's most sought-after YouTube strategist. Clients generate 750M views/month. Has worked with MrBeast, Ryan Trahan, Noah Kagan. Founder of Outlier Strategy LLC.

**Core Philosophy:**
"The idea sets the ceiling, the execution determines the result." Top creators put far more time into pre-production/planning than beginners. Packaging should count for 40% of the weight in a click + watch game.

**The 0-100-10-1 Ideation Framework:**
1. Start with 0 assumptions
2. Generate 100+ ideas (most will be bad — that's the point)
3. Filter to 10 strong ones using elimination criteria
4. Develop 1 final concept

**Packaging Framework (Title + Thumbnail):**

| Element | Galloway's Rule |
|---------|----------------|
| **Titles** | Generate 30-50 titles per video. Get peer feedback. Pick top 3. Keep title short, concise, clear, emotionally resonant. |
| **Thumbnails** | Create 3 distinct thumbnails per video. Follow the "three focus area rule" — max 3 elements visible. Bright colors (60-70% of users watch in dark mode). |
| **Title + Thumbnail Relationship** | Imagery must complement title and tease narrative. Never duplicate information between title and thumbnail. |

**Retention Intro Formula:**
- Reaffirm title/thumbnail premise immediately
- Launch directly into storyline (no preamble)
- Eliminate unnecessary context
- Front-load best clips before payoff moments
- Establish stakes immediately
- Avoid anything that feels like a formal introduction

**Competitor Analysis Method:**
- Identify what competitors can't do that you can (competitive advantage)
- Look for things that have worked before in similar contexts
- Generate ideas by examining what's trending beyond your niche
- Segment audiences: core, casual, and new viewers

**Metrics Hierarchy:**
- "Views are the G.O.A.T. of all metrics, especially in the beginning"
- Secondary: CTR and average view duration, benchmarked against comparable videos
- Quality formula: Production value + quality idea + storytelling + effort shown

**Application to DTC Supplements:**
- The "first frame" of a paid video ad is the equivalent of a YouTube thumbnail
- If the first frame + first line don't pass the "would I click this?" test, nothing else matters
- For creatine gummies: the thumbnail/first frame should show EITHER the transformation result OR the product in an unexpected context — never both
- 3 thumbnail variants = 3 hook variants in ad testing

**How a Competitor Intel Tool Detects This:**
- Capture and analyze thumbnailUrl for each competitor ad
- Track which first-frame styles correlate with longevity (the ones that "click" run longer)
- Compare packaging patterns across top-scoring ads vs low-scoring ads

---

### 7.4 SEB LOSARDO — Systemizing Winning Formats

**Who:** Strategist behind Sky Sports YouTube (0 to 10M subscribers). Works with WillNE, Quadrant. Clients generate 700M views/month.

**Core Philosophy:**
Packaging is 40% of success. The first two minutes of a video are worth more than the last twenty. Build systems that produce winners, not one-off winners.

**Scaling Framework:**
1. **Document the winner** — When an ad/video works, immediately deconstruct it into components: hook type, structure, pacing, visual style, audio, CTA placement
2. **Template the format** — Convert the winning structure into a replicable brief that any creator can execute
3. **Vary the variable** — Change one element at a time (new hook, new creator, new product) while keeping the system constant
4. **Measure and iterate** — Track performance of each variant against the original

**Application to DTC Supplements:**
- When a creatine gummy UGC testimonial wins, the SYSTEM is: [Hook: problem statement] + [10s: mechanism explanation] + [10s: personal result] + [5s: CTA]
- Different creators execute the same template
- The brand owns the FORMAT, not the individual creative

**How a Competitor Intel Tool Detects This:**
- When a brand has multiple ads with the same creativePattern but different iteration counts, they've systemized
- High iteration count (>5) on a single creative = the brand has a template they're scaling
- Track which creativePatterns appear most frequently within a single brand's top ads

---

### 7.5 JAMIE WHIFFEN — PVSS Framework (First 3 Seconds)

**Who:** YouTube consultant with 10+ years experience. Creator of the PVSS framework for opening hooks.

**The PVSS Framework:**
Every winning video opening must fire all four elements within the first 3 seconds:

| Element | Definition | Example (Creatine Gummy) |
|---------|-----------|-------------------------|
| **P**attern Interrupt | Something that visually breaks the scroll pattern. Unusual angle, unexpected movement, color contrast, shocking visual. | Close-up of gummy being bitten in half in slow motion, showing texture |
| **V**isual Clarity | The viewer must understand the product/problem in under 1 second with sound OFF. | Product clearly visible, or transformation result clearly shown |
| **S**ound Hook | The first word or sound creates a reason to unmute or keep watching. | "I stopped taking creatine powder and..." (incomplete statement) |
| **S**tatement Hook | Opening line is a bold claim, provocative question, or identity trigger. NOT a product introduction. | "This tiny gummy replaced my entire supplement stack" |

**Key Principle:** All four elements must fire simultaneously. Missing even one reduces hook effectiveness significantly. The first 3 seconds are THE bottleneck — if they fail, no amount of great content afterward matters.

**Application to DTC Supplements:**
- Pattern interrupt for creatine gummies: Show the gummy doing something unexpected (dissolving in water to show absorption, being compared size-by-size to a pile of powder)
- Visual clarity: Product must be identifiable without sound
- Sound hook: Start with an incomplete claim that forces curiosity
- Statement hook: Lead with identity ("If you're still scooping powder...")

---

### 7.6 GARY VAYNERCHUK — Day Trading Attention & Culture-First Creative

**Who:** CEO of VaynerMedia. Author of *Day Trading Attention*. Pioneer of platform-native content strategy.

**Core Framework: Day Trading Attention**
"Day trading attention means constantly monitoring where people focus their energy and marketing within those spaces before competitors do." Focus on what people are actually doing, not the newest platform.

**Three Essential Components:**
1. **Observation Over Technology** — Don't chase platforms. Identify where actual audience attention concentrates
2. **Cultural Trend Recognition** — Monitor cultural movements. "Culture trading" = identifying what captivates public consciousness
3. **Presence Where Attention Exists** — "If you're not there — where the attention is — you're going to lose"

**Native vs. Interruption Content:**
- Traditional advertising steals attention from what the consumer actually wants to consume
- Native content customizes delivery, style, and language to blend naturally with the distinct atmosphere of each platform
- "Social media died four years ago — for the last four years we've been in interest media" (TikTokification)
- Platforms now distribute content based on what users are interested in, not who they follow

**The PAC Requirement (Platforms and Culture):**
Understanding native features, trending audio, cultural moments, and demographic-specific references within each platform is now non-negotiable.

**Specific Content Rules:**

| Rule | Details |
|------|---------|
| **Publishing Cadence** | 5 short videos weekly across TikTok, Reels, Shorts, LinkedIn |
| **Hook Testing** | Test one new hook daily |
| **Pillar Content** | One 5-10 minute piece weekly tied to real customer problems |
| **Performance Signals** | Watch time, comments, and saves guide iteration |
| **Volume > Perfection** | Volume and speed matter more than perfection initially |

**Content Elements That Work (from DTA examples):**
- Feature actors/actresses resembling target audience in first 3 seconds
- Add thought-provoking headlines immediately
- Use movement and camera angles that prompt curiosity
- Platform-specific trending sounds increase algorithmic favorability
- Long-form captions paired with short videos work when video creates curiosity
- Demographic callouts in headline ("turns 30") achieve massive reach (26.5M views example)
- Relatable daily experiences for specific cohorts
- Platform-native features (green screen, duets, photo replies)

**Application to DTC Supplements:**
- Creatine gummy ads must feel like they belong in the viewer's feed, not interrupting it
- Use language of the fitness/wellness community natively
- Identity triggers: "If you're a gym bro who hates chalky powder..." vs "Our creatine gummies are..."
- Platform adaptation: same message, different trending audio per platform
- The ad that looks like native content (UGC, creator-led) outperforms polished brand content

**How a Competitor Intel Tool Detects This:**
- Ads running as UGC vs. polished brand content — track creativePattern to identify format
- Long-running UGC ads suggest "native" approach works for that category
- Multiple regions with same ad but different hooks = brand is adapting to cultural context

---

### 7.7 DHARMESH SHAH / DATA-DRIVEN CLAIMS — Proof Velocity

**Who:** Co-founder and CTO of HubSpot. Advocate of systematic, data-driven marketing.

**Core Concept: Specific Numbers Beat Vague Claims**

Research-backed findings on specificity in advertising claims:

| Claim Type | Example | Performance |
|-----------|---------|-------------|
| **Specific number** | "37% faster drying time" | Significantly outperforms vague equivalent |
| **Vague adjective** | "Quick-drying" | Subjective, easily dismissed |
| **Specific scenario** | "Removes spaghetti sauce stains in one wash" | Better storytelling than abstract promises |
| **Vague promise** | "Superior cleaning power" | Means almost nothing to consumers |
| **Social proof with number** | "Trusted by 90% of users" | Far more persuasive than simple endorsement |
| **Social proof without number** | "Trusted by many" | Dismissed as marketing speak |

**Why Numbers Work:**
- "Consumers can't argue with numbers; words are a lot more subjective"
- "Removes 99.9% of allergens down to 0.3 microns" is inarguable — "superior cleaning performance" is not
- 76% of consumers say most ad claims are exaggerated (57.4% somewhat, 19.0% very)
- Specific claims get faster legal approval AND generate better marketing performance

**Four Evidence-Backed Principles:**
1. **Specificity principle** — Quantified results generate higher credibility
2. **Self-verification** — Claims consumers can personally validate are most powerful (e.g., "try for 30 days")
3. **Loss aversion** — "Doesn't pill" resonates stronger than "smooth application"
4. **Concrete scenarios** — Paint a picture the viewer can see themselves in

**Proof Velocity Concept:**
Social proof must arrive EARLY and FAST in the ad, not saved for the end. The speed at which an ad establishes credibility determines whether the viewer stays past the proof section (seconds 15-18 drop-off zone).

**Application to DTC Supplements:**
- "5g of creatine per gummy" beats "packed with creatine"
- "237,000 customers switched from powder" beats "thousands of customers love us"
- "Absorbs 3x faster than monohydrate powder" beats "better absorption"
- For creatine gummies: lead with the specific claim, not the brand story
- "Supports energy" messaging converts better than "Contains B12" (benefit framing + specificity)

**How a Competitor Intel Tool Detects This:**
- Sonnet can classify whether an ad uses specific-number claims vs. vague claims (hookType classification)
- Ads with specific-number hooks that also have high longevity = proven that specificity converts
- Track which proof types correlate with highest AdScores across the competitive set

---

### 7.8 YANS MEDIA — Mechanism Clarity & Explainer Structure

**Who:** Explainer video production company since 2012. Trusted by Cisco, DoorDash, VISA, 500+ brands.

**Core Concept: Mechanism Clarity Converts Skeptics**
The single most underused element in DTC ads is showing HOW the product works, not just THAT it works.

**5-Point Narrative Structure:**
1. **Problem identification** — Address viewer pain points
2. **Solution revelation** — Introduce the value proposition
3. **Mechanism demonstration** — Show product/service operation (THIS is the key differentiator)
4. **Benefits articulation** — Describe end-user outcomes
5. **Call-to-action** — Compelling next steps

**Key Production Rules:**

| Rule | Details |
|------|---------|
| **One Main Message** | "Being too broad is a common mistake. Focus on 1 main message and develop the rest of the concept around that." |
| **Duration Sweet Spot** | 60-90 seconds. "Anything too much shorter than 60 seconds doesn't give you enough time to establish trust." |
| **Benefit-Forward** | "Focus on benefits is a must" — what viewers will experience, not just features |
| **Audience Specificity** | Distinguish between decision-makers, administrators, and executives — each requires different persuasion |
| **Platform Adaptation** | Restrict Instagram versions to under 60 seconds to prevent truncation |

**Case Study: Varpet**
- Problem: Users couldn't tell if Varpet was an app or a service (confusion = the biggest blocker)
- Solution: Story-driven explainer video showing the mechanism
- Result: Video replaced lengthy sales calls, built instant trust, helped convert 15,000 users

**Application to DTC Supplements:**
- For creatine gummies: Show the MECHANISM. "Creatine monohydrate is encapsulated in a pectin-based gummy matrix that dissolves in your stomach in under 10 minutes, delivering 5g directly to muscle cells"
- This converts the skeptic who thinks "gummies can't have enough creatine"
- The mechanism moment should land between seconds 15-30 of the ad (after hook, before CTA)

**How a Competitor Intel Tool Detects This:**
- Sonnet can classify whether an ad includes mechanism explanation vs. benefit-only messaging
- Ads that include mechanism clarity + high longevity = proven that explanation converts skeptics
- Track `concept` and `scriptBreakdown` fields for mechanism presence

---

### 7.9 SANDWICH VIDEO (Adam Lisagor) — One Product, One Claim, One Emotion

**Who:** Adam Lisagor, founder of Sandwich (formerly Sandwich Video). Creator of Dollar Shave Club's viral video. Commercial director specializing in tech/DTC products.

**Core Philosophy: Constraint is Creative Discipline**

**Storytelling Structure:**
1. State a problem
2. Show a solution
3. Explain what that solution is
4. Introduce ancillary benefits
5. Restate the solution

**The One-Message Constraint:**
- "A key mistake is trying to tell too much story to too many people instead of telling one small story that can apply to everybody"
- "Simplicity is everything"
- Each video should have ONE clear, digestible problem with ONE solution that seems obvious in retrospect

**What Makes Products Compelling to Film:**
- "A very clear, digestible problem that is easy to put into words"
- "A solution that is new and different and inventive but seems in retrospect so obvious"
- Products solving problems that are easy to articulate + solved in a unique way that makes obvious sense

**Authenticity Principle:**
- "I choose to represent products that I actually believe in. Then I don't have to act."
- Following Coppola's philosophy: only work on things you believe in, because then you're telling the truth, and it looks like the truth
- "What Sandwich does is make an authentic video that lets a viewer feel how your user will feel"

**Dollar Shave Club Case Study:**
- $4,500 production budget, shot in one day
- Highly planned production with a targeted script with nothing unnecessary
- Only included scenes that would offer something to the final result
- Focused on simplicity: simple razors, simple process, simple savings
- Clarity first, cleverness second, humor works only when the value is obvious
- Result: The video that turned Dollar Shave Club into a $1B company

**Application to DTC Supplements:**
- For creatine gummies: ONE claim. Not "tastes great AND has 5g AND absorbs faster AND is convenient AND is vegan." Pick ONE.
- "The creatine gummy that actually works" (mechanism) OR "The tastiest way to get your daily creatine" (experience) — not both
- Constraint forces clarity. Clarity forces understanding. Understanding forces purchase.

**How a Competitor Intel Tool Detects This:**
- Sonnet analysis of `concept` field can identify single-claim vs. multi-claim ads
- Ads with a single focused claim + high longevity suggest the constraint approach works
- The `productionFormula` field captures whether the ad follows a tight narrative structure

---

### 7.10 LEMONLIGHT — Speed, Volume & Modular Production

**Who:** Video production company specializing in scaled content. Works with DTC and enterprise brands.

**Core Philosophy: Modular Creative Framework**
Design productions to generate a flexible library of modular assets — short scenes, standalone vignettes, platform-ready clips, and persona-specific versions — from a single shoot.

**DTC-Specific Video Philosophy:**
- "DTC video is a sales tool, not a brand asset — it needs to convert viewers immediately"
- DTC creative is "disposable and iterative, designed to be tested, optimized, and replaced quickly"
- UGC videos excel because they "feel authentic and remove the polished distance"
- Recommended formats: product demos, unboxings, testimonials, short-form performance ads
- Real-time feedback loop: "Brands know what works because the conversions either happen or they don't within hours"

**The Volume Advantage:**
- "A series of videos is often more effective than one video"
- The hybrid model: AI handles volume, traditional handles impact. Together they scale without losing quality
- Export platform-specific versions: vertical for TikTok/Reels, square for paid social, horizontal for YouTube
- Test channel strategy with AI video variants first, then commit to full production

**Modular Production Method:**
1. Shoot modular scenes (problem shot, mechanism shot, result shot, CTA shot)
2. Mix and match into dozens of variations
3. Test each variation
4. Scale the winners
5. Replace the losers with new modular combinations

**Application to DTC Supplements:**
- Shoot 10 modular scenes in one session: 3 hooks, 3 mechanism explanations, 2 result testimonials, 2 CTAs
- Combine into 3x3x2x2 = 36 unique ad variants
- Test all 36, identify top 5, scale those
- Monthly creative refresh: swap out hooks and CTAs, keep winning mechanisms

**How a Competitor Intel Tool Detects This:**
- Brands running many ad variants (high iteration count) with the same base creative = modular production approach
- Track how many distinct ads a brand runs simultaneously (high count = volume philosophy)
- Cross-reference longevity: do volume-first brands also have long-running winners?

---

### 7.11 VERACITYCOLAB — Platform-Native & Trend-Native Formats

**Who:** Video agency founded 2008. 15+ years experience. Specialize in video-only strategy.

**Core Philosophy: "Because we only focus on video, we deliver better insights and results than a traditional full-service agency."**

**Platform-Native Approach:**
- Video definitions constantly evolve alongside consumer behavior and technology
- Design content structure around platform requirements rather than adapting single assets across channels
- Omni-channel strategy means creating natively for each platform, not repurposing one video everywhere

**Services That Indicate Methodology:**
- Vertical video production (platform-specific from the start)
- Audience A/B testing capabilities
- High volume production & delivery
- Rapid iteration
- Format-specific assets: GIFs, cinemagraphs, text overlays

**Trend-Native vs. Timeless Creative:**
- Trend-native formats (using current platform features, trending audio, cultural references) outperform "timeless" creative
- Platform features change. Ad creative must change with them.
- Emerging formats: 360 video, projection mapping, interactive experiences

**Application to DTC Supplements:**
- Don't create one "brand video" and cut it for all platforms
- TikTok creatine gummy ad should use TikTok-native transitions, trending sounds, green screen format
- Instagram Reels version should use Reels-native text overlays and music
- Facebook feed version should work with sound off (captions mandatory)

---

## PART 8 — THE ECONOMICS OF WINNING ADS

### What "10x Revenue" Actually Means in DTC

**ROAS Benchmarks for DTC Supplement Brands:**

| Metric | Benchmark | Context |
|--------|-----------|---------|
| **Average DTC ROAS** | 2:1 to 4:1 | For every $1 spent, $2-$4 back |
| **Median incremental ROAS** | 2.31x | Interquartile range: 1.36x - 3.24x |
| **"Good" ROAS** | 3x+ on warm, 2x on cold | For supplements with strong LTV |
| **"Great" ROAS** | 4:1+ | Top online retailers |
| **"Elite" ROAS** | 5:1+ | Leading ecommerce stores |
| **Meta median iROAS** | 2.92x | Platform-specific |
| **Google Performance Max** | 2.98x | Platform-specific |
| **CTV (Tatari)** | 3.30x | Highest channel performance |

**The 80/20 Rule in Ad Creatives:**
- 80% of results come from 20% of ad creatives (Pareto Principle)
- Real-world case study: 85% of installs came from ONE winning creative. 90% of ad spend was allocated to that single top performer
- "The top performer basically carried the whole performance"
- New test creatives "never managed to outperform the winner"
- Out of 10 advertisements, only 2 typically make a huge success

**What "10x" Really Means:**
- A losing ad: 0.5x-1.0x ROAS (losing money or breaking even)
- A mediocre ad: 1.5x-2.0x ROAS (barely profitable)
- A winning ad: 3x-5x ROAS (solidly profitable)
- A "10x" ad: The single creative that carries the entire account, running for 90+ days, getting most of the spend allocation
- The gap from a 0.5x loser to a 5x winner = 10x improvement in revenue per ad dollar
- This is not "10x total revenue" but "10x return efficiency on the same ad spend"

**Supplement-Specific Performance:**

| Metric | Benchmark |
|--------|-----------|
| Video ad CTR | 2.4% (3x higher than static at 0.8%) |
| UGC vs brand creative | UGC outperforms by 28% |
| CPA target | $18-$30 |
| Conversion rate | 3-8% |
| Customer LTV | $90-$180 |
| Creative refresh cycle | Every 2-4 weeks |
| Audience segmentation by health goal | Up to 40% higher CTR |

---

### Meta's Algorithm & Why It Rewards Winners

**The Total Value Formula:**
```
Total Value = (Advertiser Bid x Estimated Action Rate) + Ad Quality Score
```

**Three Components:**
1. **Advertiser Bid** — How much you're willing to pay per result
2. **Estimated Action Rate (EAR)** — Meta's prediction of how likely a user is to take desired action
3. **Ad Quality & Relevance** — Composite score based on user feedback, engagement, click-through, post-click experience

**How Creative Determines the Winner:**
- Creative can impact Estimated Action Rate by up to 50%
- Creative can impact User Value by up to 10%
- Bad creative can swing 50% and 10% in the WRONG direction
- "Creative is now your targeting" — creative assets determine which auctions you enter and what prices you pay
- A highly relevant, high-quality ad can BEAT one with a much higher bid

**The CTR Feedback Loop:**
1. New ad launches → Meta shows it to a test audience
2. If CTR is high → Meta predicts higher action rate → shows it to more people
3. More engagement → better quality score → lower CPM → more reach → more conversions
4. This compounds: winning creatives get progressively cheaper to deliver
5. Losing creatives get the opposite: lower CTR → higher CPM → less reach → death spiral

**Creative Fatigue Replacement Triggers:**
- Replace when frequency exceeds 4.0
- Replace when CTR declines more than 20% over two weeks
- Maintain 8-12 active creative variations per campaign
- Refresh 25-30% of creative library monthly
- Dedicate 20-30% of production to experimental formats

**The "Holy Trinity" of Creative Scaling:**
1. **Creative Velocity** — How quickly you produce and deploy new variations
2. **Creative Diversity** — Range of messaging angles, value propositions, emotional hooks
3. **Creative Liquidity** — Competing in every placement with native, optimized formats

**"Monotony Tax":**
Meta's system literally penalizes creative lack by increasing CPMs and reducing reach. Competitors with robust scaling capture inventory you never see.

---

### How Top DTC Brands Use Competitor Intelligence

**AG1 (Athletic Greens) — $600M+ Brand:**
- Maintains nearly 500 active ads across Facebook, Instagram, TikTok
- Continuous creative testing: underperformers deactivated, winners kept running (some for over a year)
- Uses ad longevity as proxy for conversion success
- Hooks: "4 reasons I drink this," "Why I quit my supplements for this," "Sign up for AG1"
- Reverse-engineers competitors (ARMRA, Bloom) using tools like Foreplay Spyder
- Extracts: high-converting ad elements, emotional triggers, target audience positioning
- Leverages proven market concepts competitors have already validated
- AI-generated briefs, scripts, and storyboards reduce development time

**Bloom Nutrition — $170M Revenue (120% CAGR):**
- 75% of marketing budget on influencer/creator partnerships
- Strategy: "built a brand that people wanted to film" rather than traditional ad buys
- Vast army of micro and mid-tier influencers (not just celebrities)
- Always-on seeding with micro/mid-tier creators + paid amplification of top-performing UGC
- Content: quick demos, honest reactions, day-in-the-life edits that mirror native behavior
- Natural promotion > paid promotion. Influencers show organic day-to-day for social proof
- Platforms: TikTok, Instagram Reels, YouTube Shorts with steady UGC cadence

**Obvi (Collagen) — $40M+ Revenue ($60M cumulative in 5 years):**
- 170 active Meta ads: 50% static AI graphics (cheap/fast to test), 50% UGC videos
- Started at $100/day Meta Ads with 3x ROAS target
- Scaled to $18,000/day Meta + $2,000/day TikTok
- Hyper-niche messaging: "Noticing hair thinning?" for specific products, "Struggling with joint pain?" for collagen stacks
- Seeds 100+ products/week to influencers
- Creative testing: Dynamic Creative Testing with 3 video/static + 2 primary text + 2 headlines = 12 combinations per test
- Winner threshold: 50 conversions in 7 days at target CPA
- Scaling: 19% budget increase every couple days, stress-testing the asset
- ASC campaigns start at 5x testing budget with 6-10 winning ad post IDs
- Attribution: 7-day click for testing, 1-day click for scaling
- Key metrics: thumb-stop ratio, hold-rate, drop-off rates, NC-CPA, NC-ROAS
- Result: 4x more winning creative shipped after implementing systematic testing culture
- AI audiences: 57% of ad spend directed to AI-powered audiences, lowering CPA by 12%

---

### The Spy > Analyze > Steal > Iterate > Scale Workflow

**Phase 1: DISCOVERY (Weekly)**
- Monitor Meta Ad Library, Foreplay, TrendTrack for competitor activity
- Identify long-running ads (longevity = proven winners)
- Trigger retargeting by visiting competitor stores to reveal targeting strategies
- Filter for brands with >50% ad growth in last 7 days (Hidden Gems signal)

**Phase 2: COLLECTION**
- Capture: ad creative, landing page URL, UTM parameters, hook transcript
- Build swipe file organized by funnel stage, offer style, creative pattern
- Track: ad launch dates, duration, variant count

**Phase 3: VALIDATION (The Profit Pattern)**
- Look for simultaneous spikes in active ad count AND store traffic
- This correlation proves which creative strategies actually drive sales, not just views
- Check if ad promise matches landing page delivery
- Note: offer, pricing, conversion elements on landing page

**Phase 4: ANALYSIS**
- Extract hooks (first 5-8 words)
- Identify persuasion framework (PAS, AIDA, etc.)
- Capture: offer framing (discounts, bundles, risk-reversal), CTA language
- Map each component of the winning ad structure

**Phase 5: ADAPTATION (Ethical Steal)**
- Focus on transferable elements: hooks, offer types, formats, funnel placement
- Learn patterns and adapt to your brand voice
- Reapply the STRUCTURE, not the specific words
- The transcript approach: understanding the framework matters more than mimicking

**Phase 6: TESTING**
- Test in controlled batches, starting with small budgets
- Isolate a single variable per test
- Testing multiple variables simultaneously dilutes insights
- Every test starts with a specific, measurable hypothesis

**Phase 7: SCALING**
- Aggressively scale winners once performance is proven
- A winning ad is not a finished product — it's a data source
- Repurpose winning messaging across new creative formats
- Creative diversity matters more than creative volume

---

## PART 9 — CREATIVE TESTING FRAMEWORKS (2026)

### Meta Creative Testing: Two Methods

**Method 1: Dedicated Testing Ad Sets (ABO)**
- Separate ad sets per creative batch (1-10 ads per batch)
- Guaranteed budget allocation per test
- Requires 50+ conversions per ad before migration (rarely practical)
- Better for: brands with lower creative volume, early-stage testing

**Method 2: Direct Main Campaign Testing (CBO)**
- New creative drops directly into existing high-budget campaigns
- Maintain 10-20 active ads per ad set
- Pause underperformers to create space for fresh tests
- Better for: brands with high creative volume, scaling phase

**Most brands have shifted from Method 1 to Method 2 as creative volume increased.**

### Creative Volume Targets (2026)

| Brand Size | Creative Volume |
|-----------|----------------|
| New advertisers | 1 creative batch weekly |
| Mid-sized brands | 40-50 new ads monthly |
| Large-scale advertisers | 100+ ads monthly |

### The $10K Test
"Could this ad potentially spend $10,000?" If no, improve or discard it. Production quality matters less than strategic design for generating sales.

### 8 Ways to Scale a Winning Ad Through Iteration

1. **Discover the core driver** — What element is doing the heavy lifting? (message, visual, format, endorsement)
2. **Test winning element in new formats** — Convert static to video, use winning stat as video opener
3. **Add trust-building enhancements** — Review counts, testimonials, press logos, guarantee badges
4. **Add a header/label** — "Best-Seller," "New," "97% Would Buy Again"
5. **Swap people, settings, or style** — Change creator, location, tone while keeping structure
6. **Reframe the problem** — Shift from frustration to convenience or long-term value framing
7. **Use different creators or combine multiple** — New face/tone/delivery gives winning message new life
8. **Remix format with visual tweaks** — Photo review to short video, add unboxing visuals, bold captions

---

## PART 10 — SUPPLEMENT ADS INTELLIGENCE (2025 Industry Report)

Data from analysis of 500 ads from 50 supplement brands across US, UK, Australia, Western Europe.

### Winning Ad Format Distribution

| Format | % of Ads | Key Insight |
|--------|----------|-------------|
| Single Images | 43.4% | Simplicity and clarity still work, especially retargeting |
| UGC/CGC | 29.2% | Growing consumer trust in peer-to-peer |
| Video | 17.4% | Usage instructions, ingredient breakdowns |
| Animation | 9.8% | Mechanism explanation |
| Carousel | 0.2% | Virtually absent — only 1 of 500 ads |

### Dominant Creative Hooks in Supplements

| Hook Type | % of Ads | Strategy |
|-----------|----------|----------|
| **Demonstration** | 42.2% | Show product usage, mixing, ingredients — THE strongest pattern |
| **Value-Driven** | 17.4% | Health benefits, bundles, limited offers |
| **CTA-Focused** | 14.2% | Urgency, direct purchase intent |
| **Social Proof** | 13.8% | Reviews, testimonials, validation |
| **Lifestyle** | 11.0% | Aspirational brand identity |
| **Meme-Style** | 1.4% | Niche humor-based differentiation |

**Key Finding:** "Demonstration" creatives showing HOW the product works = 42.2% of all supplement ads. This aligns with Yans Media's mechanism clarity concept.

### Campaign Longevity Patterns
- Peak campaign duration: 150-250 days
- Most campaigns: 100-300 day range
- Shift toward longer-term evergreen campaigns
- Long longevity correlates with clear product-market fit and scalable funnel

### Landing Page Strategy
- Product pages: 56.8% (direct path to purchase)
- Quizzes: 4.4% (underutilized)
- Science explainers: minimal (underutilized)
- Testimonial-driven pages: minimal (underutilized)
- Gap: Quiz pages, science explainers, and testimonial funnels remain substantially underdeployed

### Compliance Constraints (Supplements)
- Meta: Before/after imagery banned; tighter wellness claims as of 2025
- Google: Substance prohibitions reinforced; claim substantiation mandatory
- TikTok: Wellness messaging only; weight-loss claims prohibited
- Prohibited: unsubstantiated health claims, restricted keywords, misleading wellness statements
- Server-side tracking improved attribution accuracy by 22% for one brand

### Creatine Market Context
- Global supplement market: $200B+ by 2026
- Creatine specifically: $4.2B projected by 2030
- Women and older adults now driving creatine sales growth
- Create Wellness: $15M+ cumulative revenue, $5M Series A from Unilever Ventures
- Key positioning: "The first delicious creatine gummy that works as well as powder but tastes like candy"
- Quality/transparency becoming key differentiator (brands batch-testing and publishing results)
- Thorne marketing creatine beyond "muscleman" narrative — endurance and cognition benefits
