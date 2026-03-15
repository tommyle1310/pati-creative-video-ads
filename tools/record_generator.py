"""
tools/record_generator.py — Project Antigravity
Stage 3: Claude Sonnet full 9-field forensic ad analysis.
Cost: ~$0.03 per call. Only runs after Haiku pre-screen approval.
"""
import os
import json
import base64
import math
from datetime import datetime, timezone
from typing import Optional

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ── Ad Scoring ────────────────────────────────────────────────────────────────

def compute_ad_score(
    longevity_days: int,
    impressions_upper: int = 500000,  # default median
    ad_iteration_count: int = 0,      # default 0 (missing = weak signal)
    duration_seconds: float = 30,     # default
) -> float:
    """
    AdScore = (LongevityScore × 0.40) + (ImpressionsScore × 0.25) + (IterationScore × 0.25) + (DurationScore × 0.10)
    """
    longevity_score = min(longevity_days / 90, 1.0) * 10
    impressions_score = (math.log10(max(impressions_upper, 1)) / math.log10(10_000_000)) * 10
    iteration_score = min(ad_iteration_count / 10, 1.0) * 10
    duration_score = min(duration_seconds / 120, 1.0) * 10

    ad_score = (longevity_score * 0.40) + (impressions_score * 0.25) + (iteration_score * 0.25) + (duration_score * 0.10)
    return round(min(ad_score, 10.0), 2)


# ── Analysis Prompt ───────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a forensic ad analyst working for {your_brand} ({your_parent}), a creatine gummy brand. Your job is to dissect competitor video ads across 8 analysis fields with surgical precision.

Every field must be a rich, detailed paragraph — NOT a bullet list. Write as if you're briefing a creative strategy team.

Your brand's key differentiators:
- Full 5g clinical dose (most competitors underdose)
- ISO 17025 certified lab testing AFTER manufacturing
- Individual pouches (not jars)
- 90-day money-back guarantee (even if empty)
- Published COAs on product page"""

ANALYSIS_PROMPT = """Analyse this {region} market video ad from "{brand}".

TRANSCRIPT:
"{transcript}"

AD METADATA:
- Brand: {brand}
- Region: {region}
- Duration: {duration}s
- Landing Page: {landing_page}
- Format: {video_format}

Produce EXACTLY this JSON structure. Every field must be a rich paragraph (not bullets). Do not include any text outside the JSON:

{{
  "hook": "Type: [Named Hook Type] — [Exact execution, what happens 0-5s]. Why it stops the scroll: [Psychological mechanism with name]",
  "concept": "Big Idea: \\"[One-sentence idea]\\" [Full strategic architecture]. Secondary angles: [bulleted list]",
  "scriptBreakdown": "Framework: [Named Framework]. Narrative arc: (1) [Beat name] ([timecode]) — [description]. (2) ... (3) ... (4) ... (5) ...",
  "visual": "A-Roll: [presenter description, setting, camera]. B-Roll: [product shots with timecodes]. C-Roll: [text overlays/certs or 'NONE' with strategic note]",
  "psychology": "Primary audience: [demographic]. Cognitive biases triggered: (1) [Named Bias] — [exact execution]. (2) ... [Regional market resonance note]",
  "cta": "[Mechanism] CTA — [offer details or why no offer]. [Landing page job description]",
  "keyTakeaways": "✅ STEAL: [What to replicate with {your_brand} implementation]\\n\\n✅ STEAL: [Second steal]\\n\\n🔨 KAIZEN: [Gap to exploit with {your_brand} action]\\n\\n🔨 KAIZEN: [Second kaizen]\\n\\n🚀 UPGRADE: [Where {your_brand} structurally wins]",
  "productionFormula": "🎬 {your_brand_upper} PRODUCTION FORMULA — {brand} Format Adaptation\\nFORMAT: [format spec]\\n\\nPHASE 01 — HOOK (0–5s)\\n[Screen direction]\\n📝 \\"[Voiceover]\\"\\n🖥 TEXT SUPER: \\"[text]\\"\\n\\nPHASE 02 — AGITATE (5–25s)\\n[Direction]\\n📝 \\"[VO]\\"\\n🖥 TEXT SUPER: \\"[text]\\"\\n\\nPHASE 03 — REVEAL (25–45s)\\n[Direction]\\n📝 \\"[VO]\\"\\n🖥 TEXT SUPER: \\"[text]\\"\\n\\nPHASE 04 — TRUST (45–80s)\\n[Direction]\\n📝 \\"[VO]\\"\\n🖥 TEXT SUPER: \\"[text]\\"\\n\\nPHASE 05 — CTA (80–95s)\\n[Direction]\\n📝 \\"[VO]\\"\\n🖥 TEXT SUPERS (MANDATORY): \\"[text]\\"",
  "hookType": "[Short hook type label for filtering, e.g. Problem-Curiosity Hook]",
  "primaryAngle": "[Short positioning angle, e.g. Taste-first positioning]",
  "frameworkName": "[Short framework name, e.g. PAS Compression]",
  "creativePattern": "EXACTLY one of: Problem-First UGC | Result-First Scroll Stop | Curiosity Gap | Social Proof Cascade | Comparison/Versus | Authority Demo | Unclassifiable"
}}

QUALITY RULES:
- hook MUST contain a named hook TYPE + "Why it stops the scroll" section
- scriptBreakdown MUST contain a named framework + numbered beats with timecodes
- keyTakeaways MUST have ≥2 ✅ STEAL + ≥2 🔨 KAIZEN + 1 🚀 UPGRADE, all referencing {your_brand}
- productionFormula MUST have FORMAT line + ≥5 phases, each with direction + 📝 voiceover + 🖥 TEXT SUPER
- creativePattern MUST be EXACTLY one of these 7 values (no free text, no variations): "Problem-First UGC", "Result-First Scroll Stop", "Curiosity Gap", "Social Proof Cascade", "Comparison/Versus", "Authority Demo", "Unclassifiable"
- hookType, primaryAngle, frameworkName MUST be short filterable strings (5-30 chars), NOT full paragraphs
- Every analysis field = rich paragraph, not a list"""


def generate_ad_record(
    transcript: str,
    brand: str,
    region: str,
    your_brand: str = "FusiForce",
    your_parent: str = "Wellness Nest",
    landing_page: str = "",
    duration: float = 0,
    video_format: str = "unknown",
    frame_path: Optional[str] = None,
) -> dict:
    """
    Generate full 8-field forensic analysis using Claude Sonnet.

    Args:
        transcript: Video transcript
        brand: Competitor brand name
        region: Market region
        your_brand: Your brand name
        your_parent: Your parent company
        landing_page: Landing page URL
        duration: Video duration in seconds
        video_format: Aspect ratio
        frame_path: Path to first frame image (optional)

    Returns:
        Dict with 8 analysis fields
    """
    if not ANTHROPIC_API_KEY:
        print("❌ ANTHROPIC_API_KEY not set")
        return _empty_record()

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        # Build messages
        user_content = []

        # Add first frame if available
        if frame_path and os.path.exists(frame_path):
            with open(frame_path, "rb") as f:
                img_data = base64.b64encode(f.read()).decode("utf-8")
            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": img_data,
                },
            })

        user_content.append({
            "type": "text",
            "text": ANALYSIS_PROMPT.format(
                brand=brand,
                region=region,
                transcript=transcript[:3000],
                your_brand=your_brand,
                your_brand_upper=your_brand.upper(),
                duration=int(duration),
                landing_page=landing_page,
                video_format=video_format,
            ),
        })

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT.format(your_brand=your_brand, your_parent=your_parent),
            messages=[{"role": "user", "content": user_content}],
        )

        raw_text = response.content[0].text.strip()

        # Parse JSON from response
        # Handle potential markdown code blocks
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        parsed = json.loads(raw_text)

        # Validate required fields
        required = ["hook", "concept", "scriptBreakdown", "visual", "psychology", "cta", "keyTakeaways", "productionFormula"]
        for field in required:
            if field not in parsed or not parsed[field]:
                print(f"⚠️ Missing field: {field}")
                parsed[field] = "—"

        # Validate creativePattern is one of the allowed values
        VALID_PATTERNS = [
            "Problem-First UGC", "Result-First Scroll Stop", "Curiosity Gap",
            "Social Proof Cascade", "Comparison/Versus", "Authority Demo", "Unclassifiable",
        ]
        cp = parsed.get("creativePattern", "")
        if cp not in VALID_PATTERNS:
            print(f"⚠️ Invalid creativePattern '{cp}' — defaulting to 'Unclassifiable'")
            parsed["creativePattern"] = "Unclassifiable"

        return parsed

    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse Sonnet response as JSON: {e}")
        return _empty_record()
    except Exception as e:
        print(f"❌ Sonnet analysis error: {e}")
        return _empty_record()


def _empty_record() -> dict:
    """Return empty analysis record (for error cases)."""
    return {
        "hook": "—",
        "concept": "—",
        "scriptBreakdown": "—",
        "visual": "—",
        "psychology": "—",
        "cta": "—",
        "keyTakeaways": "—",
        "productionFormula": "—",
        "creativePattern": "Unclassifiable",
    }


def assemble_full_record(
    ad_meta: dict,
    enrichment: dict,
    analysis: dict,
    brand: str,
    region: str,
    your_brand: str = "FusiForce",
    longevity_days: int = 0,
    impressions_upper: int = 500000,
) -> dict:
    """
    Assemble a complete AdRecord from metadata + enrichment + analysis.

    Returns:
        Complete AdRecord dict ready for DB and Excel
    """
    import re

    duration = enrichment.get("durationSeconds", 0)
    ad_iteration_count = ad_meta.get("adIterationCount", 0) or 0
    ad_score = compute_ad_score(longevity_days, impressions_upper, ad_iteration_count, duration)

    # Use direct Sonnet output for classification fields (no regex — Sonnet returns these as separate JSON fields)
    hook_type = analysis.get("hookType", "")
    primary_angle = analysis.get("primaryAngle", "")
    framework_name = analysis.get("frameworkName", "")

    # Fallback: regex extraction if Sonnet didn't return separate fields (backward compat with old records)
    if not hook_type:
        m = re.search(r"Type:\s*([^\n—]+)", analysis.get("hook", ""))
        if m:
            hook_type = m.group(1).strip()
    if not primary_angle:
        m = re.search(r'Big Idea:\s*["\']?([^"\'\n.]+)', analysis.get("concept", ""))
        if m:
            primary_angle = m.group(1).strip()
    if not framework_name:
        m = re.search(r"Framework:\s*([^\n.]+)", analysis.get("scriptBreakdown", ""))
        if m:
            framework_name = m.group(1).strip()

    return {
        "brand": brand,
        "foreplayUrl": ad_meta.get("foreplayUrl", ""),
        "landingPageUrl": ad_meta.get("landingPageUrl", ""),
        "hook": analysis.get("hook", "—"),
        "concept": analysis.get("concept", "—"),
        "scriptBreakdown": analysis.get("scriptBreakdown", "—"),
        "visual": analysis.get("visual", "—"),
        "psychology": analysis.get("psychology", "—"),
        "cta": analysis.get("cta", "—"),
        "keyTakeaways": analysis.get("keyTakeaways", "—"),
        "productionFormula": analysis.get("productionFormula", "—"),
        "adScore": ad_score,
        "longevityDays": longevity_days,
        "hookType": hook_type,
        "primaryAngle": primary_angle,
        "frameworkName": framework_name,
        "creativePattern": analysis.get("creativePattern", "Unclassifiable"),
        "adLibraryId": ad_meta.get("adLibraryId", ""),
        "adLibraryUrl": ad_meta.get("adLibraryUrl", ""),
        "region": region,
        "keyword": "creatine gummies",
        "status": "active" if all(v != "—" for v in analysis.values()) else "partial",
        "crawledAt": datetime.now(timezone.utc).isoformat(),
        "videoUrl": enrichment.get("videoUrl", "") or ad_meta.get("videoUrl", ""),
        "thumbnailUrl": ad_meta.get("thumbnailUrl", ""),
        "durationSeconds": duration,
        "videoFormat": enrichment.get("videoFormat", "unknown"),
        "pageName": ad_meta.get("pageName", brand),
        "pageId": ad_meta.get("pageId", ""),
        # New fields
        "adStartDate": ad_meta.get("adStartDate", ""),
        "adIterationCount": ad_meta.get("adIterationCount", 1),
        "isActive": ad_meta.get("isActive", True),
        "impressionsLower": ad_meta.get("impressionsLower", ""),
        "impressionsUpper": ad_meta.get("impressionsUpper", ""),
        "spendLower": ad_meta.get("spendLower", ""),
        "spendUpper": ad_meta.get("spendUpper", ""),
        "spendCurrency": ad_meta.get("spendCurrency", ""),
    }


SUMMARY_PROMPT = """You are analyzing crawled competitor ad data for {your_brand} ({your_parent}), a creatine gummy brand.

Below is aggregated data from {total_ads} competitor ads across {markets}. Ads are ranked by data-driven AdScore (Longevity 40% + Impressions 25% + Iterations 25% + Duration 10%).

TOP {top_n} ADS BY ADSCORE:
{top_ads_summary}

PATTERN DISTRIBUTION (all ads):
{pattern_stats}

HOOK TYPE DISTRIBUTION:
{hook_stats}

FRAMEWORK DISTRIBUTION:
{framework_stats}

Produce EXACTLY this JSON structure. Every field must be a rich paragraph. Do not include any text outside the JSON:

{{
  "dominantPatterns": "Data-backed pattern analysis: which creative patterns dominate among top performers, which hook types correlate with highest AdScores, and what frameworks the top ads share. Include specific counts and percentages.",
  "top5Analysis": "For each of the top 5 ads by AdScore: brand name, AdScore, why it ranks high (longevity/impressions/iterations), its creative pattern, and what makes it structurally strong. Number each ad 1-5.",
  "marketInsights": "Per-market breakdown: which patterns dominate in each market (US/UK/AU), any regional differences in what works, and which markets have the strongest competition.",
  "strategicRecommendation": "Specific recommendations for {your_brand}: (1) Which 2-3 creative patterns to test first based on competitor success data, (2) Which hook types to prioritize, (3) Key gaps/weaknesses in competitor ads that {your_brand} can exploit (based on KAIZEN patterns), (4) Recommended first 3 ads to produce with format specs.",
  "competitorRanking": "Rank competitor brands by total ad presence and average AdScore. Identify which brands are most aggressively scaling (high iteration counts) vs. testing (low iterations, many creatives)."
}}

RULES:
- Base ALL analysis on the DATA provided (AdScore, longevity, iterations, impressions) — never score creative quality
- Reference specific numbers: "7 of 10 top ads use X pattern" not "many ads use X"
- {your_brand} recommendations must be actionable and specific
- Keep each field to 1-2 substantial paragraphs"""


def generate_strategic_summary(
    records: list,
    your_brand: str = "FusiForce",
    your_parent: str = "Wellness Nest",
    top_n: int = 5,
) -> dict:
    """
    Generate a strategic summary from all crawled records using Sonnet.
    This is a pattern aggregation pass — data-driven, NOT quality scoring.

    Args:
        records: All AdRecord dicts (already scored)
        your_brand: Your brand name
        your_parent: Your parent company
        top_n: Number of top ads to highlight

    Returns:
        Dict with 5 summary fields
    """
    if not ANTHROPIC_API_KEY:
        print("ANTHROPIC_API_KEY not set — skipping strategic summary")
        return _empty_summary()

    if not records:
        return _empty_summary()

    # Sort by adScore DESC
    sorted_recs = sorted(records, key=lambda r: r.get("adScore", 0), reverse=True)

    # Build top ads summary
    top_ads = sorted_recs[:top_n]
    top_ads_lines = []
    for i, rec in enumerate(top_ads):
        top_ads_lines.append(
            f"{i+1}. {rec.get('brand', '?')} ({rec.get('region', '?')}) — "
            f"AdScore: {rec.get('adScore', 0)}, "
            f"Longevity: {rec.get('longevityDays', 0)}d, "
            f"Iterations: {rec.get('adIterationCount', 1)}, "
            f"Duration: {rec.get('durationSeconds', 0)}s, "
            f"Pattern: {rec.get('creativePattern', '?')}, "
            f"Hook: {rec.get('hookType', '?')}, "
            f"Framework: {rec.get('frameworkName', '?')}"
        )

    # Pattern stats
    from collections import Counter
    patterns = Counter(r.get("creativePattern", "Unclassifiable") for r in sorted_recs)
    pattern_lines = [f"  {p}: {c} ads ({c*100//len(sorted_recs)}%)" for p, c in patterns.most_common()]

    hooks = Counter(r.get("hookType", "Unknown") for r in sorted_recs)
    hook_lines = [f"  {h}: {c} ads" for h, c in hooks.most_common(10)]

    frameworks = Counter(r.get("frameworkName", "Unknown") for r in sorted_recs)
    framework_lines = [f"  {f}: {c} ads" for f, c in frameworks.most_common(10)]

    markets = list(set(r.get("region", "") for r in sorted_recs if r.get("region")))

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        prompt_text = SUMMARY_PROMPT.format(
            your_brand=your_brand,
            your_parent=your_parent,
            total_ads=len(sorted_recs),
            markets=", ".join(markets),
            top_n=top_n,
            top_ads_summary="\n".join(top_ads_lines),
            pattern_stats="\n".join(pattern_lines),
            hook_stats="\n".join(hook_lines),
            framework_stats="\n".join(framework_lines),
        )

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt_text}],
        )

        raw_text = response.content[0].text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        parsed = json.loads(raw_text)

        required = ["dominantPatterns", "top5Analysis", "marketInsights", "strategicRecommendation", "competitorRanking"]
        for field in required:
            if field not in parsed or not parsed[field]:
                parsed[field] = "—"

        return parsed

    except Exception as e:
        print(f"Strategic summary generation failed: {e}")
        return _empty_summary()


def _empty_summary() -> dict:
    return {
        "dominantPatterns": "—",
        "top5Analysis": "—",
        "marketInsights": "—",
        "strategicRecommendation": "—",
        "competitorRanking": "—",
    }


if __name__ == "__main__":
    print("Record Generator ready.")
    print(f"  ANTHROPIC_API_KEY: {'set' if ANTHROPIC_API_KEY else 'NOT SET'}")
    score = compute_ad_score(longevity_days=95, impressions_upper=1000000, ad_iteration_count=8, duration_seconds=95)
    print(f"  Test ad score (95d, 1M imp, 8 iter, 95s): {score}")
