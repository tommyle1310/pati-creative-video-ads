#!/usr/bin/env python3
"""
tools/pipeline.py — Project Antigravity v2
Bulk-first pipeline: Crawl ALL → Filter → Rank → Analyze TOP ads.

Architecture (Motion-inspired):
  Phase 1: BULK CRAWL — 1 Apify call per market (3 calls max, ~10 min)
  Phase 2: METADATA FILTER — keyword check on all ads (instant, free)
  Phase 3: GROUP BY BRAND — cluster by page_name, enforce diversity
  Phase 4: PRE-RANK — score by data signals BEFORE any AI (instant)
  Phase 5: AI ANALYSIS — Sonnet on top-ranked ads only ($0.03/ad)
  Phase 6: STRATEGIC SUMMARY — pattern aggregation

Key changes from v1:
  - Bulk crawl first, analyze later (not interleaved)
  - No Haiku pre-screen (metadata filter after keyword search is sufficient)
  - Pre-rank by AdScore BEFORE Sonnet (best ads get analyzed, not random ones)
  - Brand diversity enforced (top N brands, top M ads per brand)
  - 3x faster, same cost, 10x better output quality

Usage:
  python tools/pipeline.py \\
    --keyword "creatine gummies" \\
    --markets US UK AU \\
    --your-brand FusiForce \\
    --job-id job-123 \\
    --output-dir .tmp
"""
import argparse
import json
import os
import sys
import time
import re
import math

# Fix Windows console encoding for emoji/unicode output
if sys.platform == "win32":
    for stream in [sys.stdout, sys.stderr]:
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")

# Load .env file from project root
def _load_dotenv():
    """Load .env file into os.environ (no external dependency needed)."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip("'").strip('"')
            # Skip comments after value
            if val and not val.startswith("#"):
                os.environ.setdefault(key, val)

_load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))


# ── Helpers ──────────────────────────────────────────────────────────────────

def progress(data):
    """Write progress update to stderr for the Node.js route to read."""
    print(f"PROGRESS:{json.dumps(data)}", file=sys.stderr, flush=True)


def log(msg):
    """Write log message to stderr."""
    print(msg, file=sys.stderr, flush=True)


def get_ad_text(ad: dict) -> str:
    """Extract combined text from ad metadata fields."""
    parts = []
    for field in ["ad_creative_bodies", "ad_creative_link_captions", "ad_creative_link_titles"]:
        val = ad.get(field, "")
        if isinstance(val, list):
            parts.append(val[0] if val else "")
        elif isinstance(val, str):
            parts.append(val)
    return " ".join(filter(None, parts))


def get_video_url_from_ad(ad: dict) -> str:
    """Try multiple fields to find a video URL in the ad data."""
    for field in ["videoUrl", "video_url", "mediaUrl", "media_url",
                   "video_sd_url", "video_hd_url", "source"]:
        url = ad.get(field, "")
        if url and ("http" in url):
            return url
    return ""


def extract_video_url_from_snapshot(snapshot_url: str, access_token: str = "") -> str:
    """
    Attempt to extract a direct video URL from Meta Ad Library snapshot page.
    The snapshot page is an HTML iframe — we try to parse for video src URLs.
    """
    import requests as req
    try:
        url = snapshot_url
        if access_token and "access_token=" not in url:
            sep = "&" if "?" in url else "?"
            url += f"{sep}access_token={access_token}"

        resp = req.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })

        video_patterns = [
            r'"(https://video-[^"]+\.mp4[^"]*)"',
            r'"(https://scontent[^"]+\.mp4[^"]*)"',
            r'src="(https://[^"]+video[^"]+)"',
            r'"(https://[^"]+fbcdn[^"]+\.mp4[^"]*)"',
        ]
        for pattern in video_patterns:
            matches = re.findall(pattern, resp.text)
            for match in matches:
                if ".mp4" in match or "video" in match:
                    return match.replace("\\/", "/")
    except Exception as e:
        log(f"    Snapshot extraction failed: {e}")
    return ""


def _pre_score(ad: dict) -> float:
    """
    Compute a lightweight pre-score using only metadata (no AI needed).
    Same formula as AdScore but works on raw Apify data before enrichment.
    Used to RANK ads before deciding which ones get expensive Sonnet analysis.
    """
    from apify_crawler import calculate_longevity_days

    # Longevity
    start_time = ad.get("ad_delivery_start_time", "")
    longevity_days = calculate_longevity_days(start_time) if start_time else 0
    longevity_score = min(longevity_days / 90, 1.0) * 10

    # Impressions (upper bound)
    impressions_upper = 500000  # default
    imp = ad.get("impressions", {})
    if isinstance(imp, dict) and imp.get("upper_bound"):
        try:
            impressions_upper = int(imp["upper_bound"])
        except (ValueError, TypeError):
            pass
    impressions_score = (math.log10(max(impressions_upper, 1)) / math.log10(10_000_000)) * 10

    # Iteration count
    ad_iteration_count = ad.get("ad_iteration_count", 1) or 1
    iteration_score = min(ad_iteration_count / 10, 1.0) * 10

    # Duration — not available pre-enrichment, use default
    duration_score = min(30 / 120, 1.0) * 10  # assume 30s default

    score = (longevity_score * 0.40) + (impressions_score * 0.25) + (iteration_score * 0.25) + (duration_score * 0.10)
    return round(min(score, 10.0), 2)


def _save_json_only(records, job_id, output_dir):
    """Fast JSON-only save — called after every ad for crash safety."""
    sorted_recs = sorted(records, key=lambda r: r.get("adScore", 0), reverse=True)
    data_path = os.path.join(output_dir, f"{job_id}-data.json")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(sorted_recs, f, indent=2, default=str)
    log(f"    [Incremental] JSON saved: {len(sorted_recs)} records")


def _save_incremental(records, job_id, output_dir, your_brand="FusiForce", sync_gsheet=True, summary=None):
    """Full save: JSON + Excel + optional Google Sheet. Called after each brand completes."""
    sorted_recs = sorted(records, key=lambda r: r.get("adScore", 0), reverse=True)

    # Save JSON
    data_path = os.path.join(output_dir, f"{job_id}-data.json")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(sorted_recs, f, indent=2, default=str)

    # Rebuild Excel with proper naming: latest-{regions}-{timestamp}.xlsx
    try:
        from excel_builder import build_excel
        excel_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        os.makedirs(excel_dir, exist_ok=True)

        regions_in_data = sorted(set(r.get("region", "").lower() for r in sorted_recs if r.get("region")))
        region_slug = "_".join(regions_in_data) if regions_in_data else "all"
        timestamp = time.strftime("%Y-%m-%d-%H-%M-%S")
        excel_name = f"latest-{region_slug}-{timestamp}.xlsx"
        excel_path = os.path.join(excel_dir, excel_name)

        build_excel(sorted_recs, excel_path, your_brand=your_brand, summary=summary)
        log(f"    [Incremental] Saved {len(sorted_recs)} records -> JSON + Excel ({excel_name})")
    except Exception as e:
        log(f"    [Incremental] Excel rebuild failed: {e}")

    # Sync to Google Sheet (non-blocking — don't fail pipeline if sheet fails)
    if sync_gsheet:
        try:
            from gsheet_writer import write_records_to_gsheet
            regions = list(set(r.get("region", "") for r in sorted_recs))
            url = write_records_to_gsheet(
                records=sorted_recs,
                regions=regions,
                spreadsheet_title="Antigravity Intelligence",
                summary=summary,
            )
            if url:
                log(f"    [Incremental] Google Sheet synced: {url}")
        except Exception as e:
            log(f"    [Incremental] Google Sheet sync failed: {e}")
    else:
        log(f"    [Incremental] Skipping GSheet sync this round")


# ── Fallback Known Brands ────────────────────────────────────────────────────
# Used as FALLBACK when dynamic keyword discovery returns too few brands.
# Primary approach: broad keyword search discovers brands dynamically.

FALLBACK_BRANDS = [
    {"brand": "Omni Creatine", "search": "omni creatine", "landing_page": "https://omnicreatine.com/products/omni-creatine-gummy", "region": "US", "page_id": "", "page_aliases": ["omni creatine", "omni"]},
    {"brand": "Create Wellness", "search": "create wellness creatine", "landing_page": "https://trycreate.co", "region": "US", "page_id": "", "page_aliases": ["create", "create wellness"]},
    {"brand": "Legion Athletics", "search": "legion athletics creatine", "landing_page": "https://legionathletics.com/products/supplements/creatine-gummies/", "region": "US", "page_id": "", "page_aliases": ["legion athletics", "legion"]},
    {"brand": "Creatine Gummies", "search": "bear balanced creatine gummies", "landing_page": "https://creatinegummies.com", "region": "US", "page_id": "", "page_aliases": ["creatine gummies", "bear balanced"]},
    {"brand": "Bounce Nutrition", "search": "bounce nutrition creatine", "landing_page": "https://bouncenutrition.com", "region": "US", "page_id": "", "page_aliases": ["bounce nutrition", "bounce"]},
    {"brand": "Momentous", "search": "momentous creatine chews", "landing_page": "https://www.livemomentous.com/products/creatine-monohydrate-chews", "region": "US", "page_id": "", "page_aliases": ["momentous", "live momentous"]},
    {"brand": "Organifi", "search": "organifi creatine chews", "landing_page": "https://www.organifishop.com/products/creatine-cherry-chews", "region": "US", "page_id": "", "page_aliases": ["organifi"]},
    {"brand": "OVRLOAD", "search": "ovrload creatine", "landing_page": "https://ovrload.co/", "region": "US", "page_id": "", "page_aliases": ["ovrload"]},
    {"brand": "Novomins", "search": "novomins creatine gummies", "landing_page": "https://novomins.com/products/creatine-gummies", "region": "UK", "page_id": "", "page_aliases": ["novomins"]},
    {"brand": "Animal Pak", "search": "animal pak creatine chews", "landing_page": "https://uk.animalpak.com/products/animal-creatine-chews", "region": "UK", "page_id": "", "page_aliases": ["animal pak", "animal"]},
    {"brand": "Thurst", "search": "thurst creatine gummies", "landing_page": "https://www.thurst.com.au/products/creatine-gummies", "region": "AU", "page_id": "", "page_aliases": ["thurst"]},
    {"brand": "Force Factor", "search": "force factor creatine gummies", "landing_page": "https://forcefactor.com/products/creatine-gummies", "region": "US", "page_id": "", "page_aliases": ["force factor"]},
    {"brand": "NutreeBio", "search": "nutreebio creatine", "landing_page": "https://nutreebio.com/", "region": "US", "page_id": "", "page_aliases": ["nutreebio"]},
    {"brand": "MMUSA", "search": "mmusa creatine gummies", "landing_page": "https://mmusa.com/product/atp-muscle-fuel-creatine-gummies/", "region": "US", "page_id": "", "page_aliases": ["mmusa"]},
    {"brand": "Swoly", "search": "swoly creatine gummies", "landing_page": "https://getswoly.com/products/creatine-mono-gummies", "region": "US", "page_id": "", "page_aliases": ["swoly"]},
]

ADS_PER_BRAND = 5        # How many ads to analyze per brand
MAX_BRANDS = 20          # Max brands to process (top by ad count)
MIN_BRANDS_EXPECTED = 5  # Minimum brands from discovery before using fallback

# Keywords for Stage 1 metadata filter
TARGET_KEYWORDS = ["creatine", "gummies", "gummy", "crealyte", "gummie"]
# "creatine" alone is too broad — matches powder, capsules, etc.
# Require BOTH creatine + gummy-form indicator, OR a gummy-specific keyword
GUMMY_INDICATORS = ["gummies", "gummy", "gummie", "gummie", "chew", "chewable", "bear balanced",
                     "crealyte", "creatine gumm"]
EXCLUDE_KEYWORDS = ["protein powder", "pre-workout", "preworkout", "whey", "bcaa",
                     "creatine powder", "creatine capsule", "creatine tablet",
                     "creatine pill", "creatine monohydrate powder"]


def _matches_brand(ad: dict, brand_name: str, landing_page: str = "", page_aliases: list = None) -> bool:
    """
    Check if an ad belongs to a specific brand.
    Uses landing_page domain match (strongest) OR page_name alias match.
    """
    # Check landing page domain match (strongest signal)
    if landing_page:
        from urllib.parse import urlparse
        known_domain = urlparse(landing_page).netloc.lower().replace("www.", "")
        ad_link = (ad.get("link_url") or ad.get("landing_page_url") or "").lower()
        if known_domain and known_domain in ad_link:
            return True

    page_name = (ad.get("page_name") or "").strip().lower()
    if not page_name:
        return False  # FIX: reject ads with missing page_name (was True — bug)

    brand_lower = brand_name.lower()
    if brand_lower in page_name or page_name in brand_lower:
        return True

    for alias in (page_aliases or []):
        alias_lower = alias.lower()
        if alias_lower in page_name or page_name in alias_lower:
            return True

    return False


def _passes_metadata_filter(ad: dict) -> bool:
    """
    Keyword filter for creatine GUMMIES specifically.
    "creatine" alone is too broad — also matches powder, capsules, monohydrate.
    Must have a gummy-form indicator OR be a gummy-specific keyword.
    Also checks page_name and landing page URL for gummy signals.
    """
    text = get_ad_text(ad).lower()
    page_name = (ad.get("page_name") or "").lower()
    link_url = (ad.get("link_url") or ad.get("landing_page_url") or "").lower()
    all_text = f"{text} {page_name} {link_url}"

    has_exclude = any(kw in all_text for kw in EXCLUDE_KEYWORDS)
    if has_exclude:
        return False

    # Direct gummy-specific keyword match — always passes
    has_gummy = any(kw in all_text for kw in GUMMY_INDICATORS)
    if has_gummy:
        return True

    # "creatine" alone is NOT enough — too many powder/capsule ads
    return False


def _find_fallback_brand_def(brand_name: str) -> dict:
    """Check if a discovered brand matches any FALLBACK_BRANDS entry (for enrichment with known landing page)."""
    brand_lower = brand_name.lower()
    for fb in FALLBACK_BRANDS:
        if fb["brand"].lower() in brand_lower or brand_lower in fb["brand"].lower():
            return fb
        for alias in fb.get("page_aliases", []):
            if alias.lower() in brand_lower or brand_lower in alias.lower():
                return fb
    return {}


# ── Main Pipeline ────────────────────────────────────────────────────────────

def run_pipeline(keyword, markets, your_brand, job_id, output_dir):
    """
    Bulk-first pipeline:
      Phase 1: BULK CRAWL — 1 Apify call per market
      Phase 2: METADATA FILTER — keyword check (instant, free)
      Phase 3: GROUP BY BRAND — cluster by page_name, enforce diversity
      Phase 4: PRE-RANK — score by data signals BEFORE Sonnet
      Phase 5: AI ANALYSIS — Sonnet on top-ranked ads only
      Phase 6: STRATEGIC SUMMARY — pattern aggregation

    Returns:
        (list of AdRecord dicts, summary dict)
    """
    from ocr_gate import passes_metadata_gate
    from record_generator import generate_ad_record, assemble_full_record
    from apify_crawler import search_ads as apify_search, calculate_longevity_days

    access_token = os.environ.get("META_ACCESS_TOKEN", "")

    # Video enricher — check available tools
    video_enricher_available = False
    try:
        from video_enricher import enrich_video, HAS_FFMPEG, HAS_OPENCV, HAS_WHISPER
        video_enricher_available = True

        tools_status = []
        if HAS_FFMPEG:
            tools_status.append("FFmpeg ✅")
        else:
            tools_status.append("FFmpeg ❌")
        if HAS_OPENCV:
            tools_status.append("OpenCV ✅")
        else:
            tools_status.append("OpenCV ❌")
        if HAS_WHISPER:
            tools_status.append("Whisper ✅")
        else:
            tools_status.append("Whisper ❌")
        log(f"  Video tools: {' | '.join(tools_status)}")

        if not HAS_FFMPEG and not HAS_OPENCV:
            log("  ⚠️ WARNING: Neither FFmpeg nor OpenCV available!")
            log("     Video frames CANNOT be extracted. AI analysis will be text-only.")
            log("     Install: pip install opencv-python-headless")
    except ImportError:
        log("  ❌ video_enricher.py not found — will skip ALL video processing")

    all_records = []
    processed_count = 0
    os.makedirs(output_dir, exist_ok=True)

    # Load skip list (already-crawled ad IDs) for delta crawl
    skip_ids = set()
    skip_file = os.path.join(output_dir, f"{job_id}-skip-ids.json")
    if os.path.exists(skip_file):
        try:
            with open(skip_file, "r") as f:
                skip_ids = set(json.load(f))
            log(f"  Delta crawl: {len(skip_ids)} ads already in DB — will skip")
        except Exception:
            pass

    # ══════════════════════════════════════════════════════════
    # PHASE 1: BULK CRAWL — One Apify call per market
    # ══════════════════════════════════════════════════════════
    progress({"phase": "crawling", "progress": 2, "brand": "Bulk crawling all markets..."})
    log(f"\n  Phase 1: BULK CRAWL — '{keyword}' across {markets}")

    all_raw_ads = []  # (ad_dict, market) tuples

    for market in markets:
        log(f"\n  [Crawl] Searching '{keyword}' in {market} (limit=200)...")
        try:
            result = apify_search(keyword, market, limit=200, ad_type="video")
            raw_ads = result.get("data", [])
            log(f"  [Crawl] {market}: {len(raw_ads)} raw ads returned")
            for ad in raw_ads:
                ad["_market"] = market  # Tag with market for later
                all_raw_ads.append(ad)
        except Exception as e:
            log(f"  [Crawl] {market}: Apify search failed: {e}")

    log(f"\n  Phase 1 complete: {len(all_raw_ads)} total raw ads across {markets}")

    # ══════════════════════════════════════════════════════════
    # PHASE 2: METADATA FILTER — Keyword check + video URL required
    # ══════════════════════════════════════════════════════════
    progress({"phase": "scoring", "progress": 15, "brand": "Filtering ads..."})
    log(f"\n  Phase 2: METADATA FILTER")

    filtered_ads = []
    for ad in all_raw_ads:
        ad_id = str(ad.get("id", ad.get("adId", "")))

        # Delta crawl: skip already-processed ads
        if ad_id and ad_id in skip_ids:
            continue

        # Must have video URL
        video_url = get_video_url_from_ad(ad)
        if not video_url:
            continue

        # Metadata keyword check (free, instant)
        if not _passes_metadata_filter(ad):
            # Fallback: try the Stage 1A gate from ocr_gate (handles list fields)
            if not passes_metadata_gate(ad):
                continue

        # Must have page_name (brand identity)
        page_name = (ad.get("page_name") or "").strip()
        if not page_name:
            continue

        filtered_ads.append(ad)

    log(f"  Phase 2 complete: {len(filtered_ads)} ads passed (from {len(all_raw_ads)} raw)")

    # ══════════════════════════════════════════════════════════
    # PHASE 3: GROUP BY BRAND — Cluster by page_name
    # ══════════════════════════════════════════════════════════
    progress({"phase": "scoring", "progress": 20, "brand": "Grouping by brand..."})
    log(f"\n  Phase 3: GROUP BY BRAND")

    # Group ads by page_name (brand)
    brand_groups = {}  # page_name_lower -> { "brand": str, "market": str, "ads": list, "landing_page": str }
    for ad in filtered_ads:
        page_name = ad.get("page_name", "").strip()
        brand_key = page_name.lower()

        if brand_key not in brand_groups:
            landing = ad.get("link_url") or ad.get("landing_page_url") or ""
            # Check if this brand matches a known fallback (for landing page enrichment)
            fb = _find_fallback_brand_def(page_name)
            if fb:
                landing = fb.get("landing_page", "") or landing

            brand_groups[brand_key] = {
                "brand": page_name,
                "market": ad.get("_market", "US"),
                "ads": [],
                "landing_page": landing,
            }

        brand_groups[brand_key]["ads"].append(ad)

    # Sort brands by ad count DESC (most active first)
    sorted_brands = sorted(brand_groups.values(), key=lambda b: len(b["ads"]), reverse=True)

    log(f"  Found {len(sorted_brands)} unique brands:")
    for b in sorted_brands[:25]:
        log(f"    - {b['brand']} ({b['market']}): {len(b['ads'])} ads")

    # ══════════════════════════════════════════════════════════
    # PHASE 3B: FALLBACK — Supplement with known brands if needed
    # ══════════════════════════════════════════════════════════
    if len(sorted_brands) < MIN_BRANDS_EXPECTED:
        log(f"\n  Only {len(sorted_brands)} brands discovered (min {MIN_BRANDS_EXPECTED}) — adding fallback brands")
        discovered_keys = {b["brand"].lower() for b in sorted_brands}

        for fb in FALLBACK_BRANDS:
            fb_region = fb["region"]
            if fb_region not in markets and "ALL" not in [m.upper() for m in markets]:
                continue

            # Check if already discovered
            fb_lower = fb["brand"].lower()
            already_found = any(
                fb_lower in dk or dk in fb_lower
                for dk in discovered_keys
            )
            if already_found:
                continue

            # Targeted Apify search for this specific brand
            log(f"  [Fallback] Searching for {fb['brand']}...")
            try:
                result = apify_search(fb["search"], fb_region, limit=50, ad_type="video")
                fb_ads = result.get("data", [])

                # Filter: must match brand + have video URL + pass metadata
                verified_ads = []
                for ad in fb_ads:
                    ad["_market"] = fb_region
                    if not get_video_url_from_ad(ad):
                        continue
                    if _matches_brand(ad, fb["brand"], fb["landing_page"], fb.get("page_aliases", [])):
                        verified_ads.append(ad)

                if verified_ads:
                    sorted_brands.append({
                        "brand": fb["brand"],
                        "market": fb_region,
                        "ads": verified_ads,
                        "landing_page": fb["landing_page"],
                    })
                    log(f"  [Fallback] {fb['brand']}: {len(verified_ads)} verified ads added")
            except Exception as e:
                log(f"  [Fallback] {fb['brand']} search failed: {e}")

        log(f"  After fallback: {len(sorted_brands)} total brands")

    # Enforce MAX_BRANDS limit (top by ad count)
    brands_to_process = sorted_brands[:MAX_BRANDS]
    log(f"\n  Processing top {len(brands_to_process)} brands (max {MAX_BRANDS})")

    # ══════════════════════════════════════════════════════════
    # PHASE 4: PRE-RANK — Score ads by data signals BEFORE Sonnet
    # ══════════════════════════════════════════════════════════
    progress({"phase": "scoring", "progress": 25, "brand": "Pre-ranking ads by data signals..."})
    log(f"\n  Phase 4: PRE-RANK (data-driven, no AI)")

    # For each brand, pre-score all ads and pick the top N
    ranked_queue = []  # list of (ad, brand_info, pre_score)

    for brand_info in brands_to_process:
        brand_name = brand_info["brand"]
        brand_ads = brand_info["ads"]

        # Deduplicate by ad ID within brand
        seen_ids = set()
        unique_ads = []
        for ad in brand_ads:
            ad_id = str(ad.get("id", ad.get("adId", "")))
            if ad_id and ad_id not in seen_ids:
                seen_ids.add(ad_id)
                unique_ads.append(ad)

        # Pre-score each ad
        scored_ads = []
        for ad in unique_ads:
            score = _pre_score(ad)
            scored_ads.append((ad, score))

        # Sort by pre-score DESC, pick top N
        scored_ads.sort(key=lambda x: x[1], reverse=True)
        top_ads = scored_ads[:ADS_PER_BRAND]

        for ad, score in top_ads:
            ranked_queue.append((ad, brand_info, score))

        if top_ads:
            log(f"    {brand_name}: {len(unique_ads)} unique -> top {len(top_ads)} "
                f"(pre-scores: {top_ads[0][1]:.1f} to {top_ads[-1][1]:.1f})")

    # Sort the entire queue by pre-score DESC (best ads first globally)
    ranked_queue.sort(key=lambda x: x[2], reverse=True)

    log(f"\n  Phase 4 complete: {len(ranked_queue)} ads queued for analysis "
        f"(from {len(brands_to_process)} brands × {ADS_PER_BRAND} max each)")

    # ══════════════════════════════════════════════════════════
    # PHASE 5: AI ANALYSIS — Sonnet on pre-ranked ads
    # No Haiku pre-screen: metadata filter + keyword search is sufficient
    # ══════════════════════════════════════════════════════════
    progress({"phase": "analysing", "progress": 30, "brand": "Running AI analysis..."})
    log(f"\n  Phase 5: AI ANALYSIS (Sonnet only, {len(ranked_queue)} ads)")

    total_to_analyze = len(ranked_queue)
    current_brand_name = ""
    brand_record_count = 0

    for queue_idx, (ad, brand_info, pre_score) in enumerate(ranked_queue):
        brand_name = brand_info["brand"]
        region = brand_info["market"]
        known_landing_page = brand_info["landing_page"]

        # Track brand transitions for incremental saves
        if brand_name != current_brand_name:
            # Save after each brand completes (if we have records)
            if current_brand_name and all_records:
                is_last = (queue_idx == total_to_analyze)
                sync_gsheet = is_last or (brand_record_count > 0 and processed_count % 15 == 0)
                _save_incremental(all_records, job_id, output_dir, your_brand, sync_gsheet=sync_gsheet)
            current_brand_name = brand_name
            brand_record_count = 0

        ad_id = str(ad.get("id", ad.get("adId", f"ad-{queue_idx}")))
        video_url = get_video_url_from_ad(ad)

        # Progress update
        analysis_progress = 30 + int((queue_idx / max(total_to_analyze, 1)) * 55)
        progress({
            "phase": "analysing",
            "region": region,
            "brand": brand_name,
            "ad": ad_id[:20],
            "progress": analysis_progress,
            "adsProcessed": processed_count,
        })

        log(f"\n    [{queue_idx+1}/{total_to_analyze}] {brand_name} — ad {ad_id[:20]}... (pre-score: {pre_score})")

        # ── VIDEO ENRICHMENT ──
        job_dir = os.path.join(output_dir, "jobs", f"{job_id}", ad_id[:30])
        enrichment = {
            "transcript": "",
            "durationSeconds": 0,
            "videoFormat": "unknown",
            "framePath": "",
            "framePaths": [],
            "videoUrl": video_url,
        }

        # Try snapshot URL extraction if no video URL
        if not video_url:
            snapshot_url = ad.get("ad_snapshot_url", "")
            if snapshot_url:
                video_url = extract_video_url_from_snapshot(snapshot_url, access_token)
                if video_url:
                    enrichment["videoUrl"] = video_url
                    log(f"      Extracted video from snapshot")

        # Get thumbnail URL for fallback frame
        thumbnail_url = ad.get("thumbnail_url", "") or ad.get("thumbnailUrl", "")

        if video_url and video_enricher_available:
            try:
                enrichment_result = enrich_video(video_url, job_dir, thumbnail_url=thumbnail_url)
                enrichment.update(enrichment_result)
                enrichment["videoUrl"] = video_url
                duration = enrichment.get("durationSeconds", 0)
                frame_count = len(enrichment.get("framePaths", []))
                log(f"      Video: {duration:.0f}s, {enrichment.get('videoFormat', '?')}, {frame_count} frames")
            except Exception as e:
                log(f"      Video enrichment failed: {e}")

        transcript = enrichment.get("transcript", "")
        has_frames = len(enrichment.get("framePaths", [])) > 0

        # Fallback: use ad copy text if no audio transcript
        # But ONLY skip if we have NEITHER transcript NOR frames
        if not transcript:
            ad_text = get_ad_text(ad)
            if ad_text:
                transcript = f"[Ad copy text — no audio voiceover detected] {ad_text}"
                log(f"      Using ad copy as transcript fallback")

        if not transcript and not has_frames:
            log(f"      No transcript AND no frames — skipping")
            continue

        # If we have frames but no transcript, provide a note
        if not transcript and has_frames:
            transcript = "[No audio voiceover — this is a visual-only ad. Analyze based on the video frames provided.]"
            log(f"      No transcript but {len(enrichment.get('framePaths', []))} frames available — visual-only analysis")

        # ── SONNET FULL ANALYSIS (no Haiku gate — metadata filter is sufficient) ──
        log(f"      Running Sonnet analysis...")

        landing_page = known_landing_page or (
            ad.get("landingPageUrl") or ad.get("landing_page_url")
            or ad.get("link_url") or ""
        )
        foreplay_url = (
            ad.get("foreplayUrl") or ad.get("share_url")
            or ad.get("ad_library_url")
            or ad.get("ad_snapshot_url")
            or f"https://www.facebook.com/ads/library/?id={ad_id}"
        )

        try:
            analysis = generate_ad_record(
                transcript=transcript,
                brand=brand_name,
                region=region,
                your_brand=your_brand,
                landing_page=landing_page,
                duration=enrichment.get("durationSeconds", 0),
                video_format=enrichment.get("videoFormat", "unknown"),
                frame_path=enrichment.get("framePath", ""),
                frame_paths=enrichment.get("framePaths", []),
            )
            log(f"      Sonnet: COMPLETE (visual analysis: {len(enrichment.get('framePaths', []))} frames)")
        except Exception as e:
            log(f"      Sonnet analysis failed: {e}")
            continue

        # Check for empty analysis
        if all(v == "—" for v in analysis.values()):
            log(f"      Analysis returned empty — skipping")
            continue

        # ── ASSEMBLE FULL RECORD ──
        start_time = ad.get("ad_delivery_start_time", "")
        longevity_days = calculate_longevity_days(start_time) if start_time else 0

        impressions_upper = 500000
        imp = ad.get("impressions", {})
        impressions_lower = ""
        if isinstance(imp, dict):
            impressions_lower = str(imp.get("lower_bound", ""))
            if imp.get("upper_bound"):
                try:
                    impressions_upper = int(imp["upper_bound"])
                except (ValueError, TypeError):
                    pass

        spend = ad.get("spend", {})
        spend_lower = str(spend.get("lower_bound", "")) if isinstance(spend, dict) else ""
        spend_upper = str(spend.get("upper_bound", "")) if isinstance(spend, dict) else ""
        spend_currency = str(spend.get("currency", ad.get("currency", ""))) if isinstance(spend, dict) else ""

        ad_meta = {
            "foreplayUrl": foreplay_url,
            "landingPageUrl": landing_page,
            "adLibraryId": ad_id,
            "adLibraryUrl": f"https://www.facebook.com/ads/library/?id={ad_id}",
            "videoUrl": video_url,
            "pageName": ad.get("page_name", brand_name),
            "pageId": ad.get("page_id", ""),
            "thumbnailUrl": ad.get("thumbnail_url", ""),
            "adStartDate": start_time,
            "adIterationCount": ad.get("ad_iteration_count", 1),
            "isActive": ad.get("is_active", True),
            "impressionsLower": impressions_lower,
            "impressionsUpper": str(impressions_upper),
            "spendLower": spend_lower,
            "spendUpper": spend_upper,
            "spendCurrency": spend_currency,
        }

        record = assemble_full_record(
            ad_meta=ad_meta,
            enrichment=enrichment,
            analysis=analysis,
            brand=brand_name,
            region=region,
            your_brand=your_brand,
            longevity_days=longevity_days,
            impressions_upper=impressions_upper,
        )

        all_records.append(record)
        processed_count += 1
        brand_record_count += 1
        log(f"      Record assembled (adScore: {record['adScore']})")

        # Save JSON after EVERY ad (crash-safe)
        _save_json_only(all_records, job_id, output_dir)

    # Final save for the last brand
    if all_records:
        _save_incremental(all_records, job_id, output_dir, your_brand, sync_gsheet=True)

    # Sort by adScore DESC (Tab 1 invariant)
    all_records.sort(key=lambda r: r.get("adScore", 0), reverse=True)

    # ══════════════════════════════════════════════════════════
    # PHASE 6: STRATEGIC SUMMARY — Pattern aggregation (Sonnet pass)
    # ══════════════════════════════════════════════════════════
    summary = {}
    if all_records:
        progress({"phase": "analysing", "brand": "Strategic Summary", "progress": 88})
        log(f"\n  Phase 6: STRATEGIC SUMMARY (pattern aggregation)")
        try:
            from record_generator import generate_strategic_summary
            summary = generate_strategic_summary(
                records=all_records,
                your_brand=your_brand,
            )
            # Save summary to a separate file
            summary_path = os.path.join(output_dir, f"{job_id}-summary.json")
            with open(summary_path, "w", encoding="utf-8") as f:
                json.dump(summary, f, indent=2, default=str)
            log(f"  Strategic summary saved: {summary_path}")
        except Exception as e:
            log(f"  Strategic summary failed: {e}")

    # Final save with summary
    if all_records:
        _save_incremental(all_records, job_id, output_dir, your_brand, sync_gsheet=True, summary=summary)

    log(f"\n  Pipeline complete: {len(all_records)} total records from {len(brands_to_process)} brands")
    return all_records, summary


# ── Entry Point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Project Antigravity Pipeline v2")
    parser.add_argument("--keyword", default="creatine gummies")
    parser.add_argument("--markets", nargs="+", default=["US"])
    parser.add_argument("--mode", default="default")  # Kept for backward compat, ignored
    parser.add_argument("--your-brand", default="FusiForce")
    parser.add_argument("--job-id", default=f"job-{int(time.time())}")
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp"),
    )

    args = parser.parse_args()

    log(f"\n  Project Antigravity Pipeline v2 (Bulk-First)")
    log(f"   Keyword:  {args.keyword}")
    log(f"   Markets:  {', '.join(args.markets)}")
    log(f"   Ads/brand: {ADS_PER_BRAND}")
    log(f"   Max brands: {MAX_BRANDS}")
    log(f"   Brand:    {args.your_brand}")
    log(f"   Job ID:   {args.job_id}")
    log(f"")

    # Run pipeline
    records, summary = run_pipeline(
        keyword=args.keyword,
        markets=args.markets,
        your_brand=args.your_brand,
        job_id=args.job_id,
        output_dir=args.output_dir,
    )

    # Build final Excel with naming: latest-{regions}-{timestamp}.xlsx
    excel_path = ""
    if records:
        progress({"phase": "building_excel", "progress": 90})
        from excel_builder import build_excel

        excel_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        os.makedirs(excel_dir, exist_ok=True)

        regions_in_data = sorted(set(r.get("region", "").lower() for r in records if r.get("region")))
        region_slug = "_".join(regions_in_data) if regions_in_data else "all"
        timestamp = time.strftime("%Y-%m-%d-%H-%M-%S")
        excel_name = f"latest-{region_slug}-{timestamp}.xlsx"
        excel_path = os.path.join(excel_dir, excel_name)

        build_excel(records, excel_path, summary=summary)

        log(f"\n  Excel saved: {excel_path}")
    else:
        log("\n  No records produced — no Excel generated")

    # Save records JSON
    data_path = os.path.join(args.output_dir, f"{args.job_id}-data.json")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, default=str)

    # Final result to stdout (Node.js route parses this)
    result = {
        "recordCount": len(records),
        "markets": args.markets,
        "excelPath": excel_path,
        "dataPath": data_path,
    }
    print(json.dumps(result))

    progress({"phase": "complete", "progress": 100})
    log(f"\n  Pipeline complete! {len(records)} records analysed.")


if __name__ == "__main__":
    main()
