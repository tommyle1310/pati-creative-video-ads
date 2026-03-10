#!/usr/bin/env python3
"""
tools/pipeline.py — Project Antigravity
Complete crawl-to-Excel pipeline orchestrator.

Wires together all stages:
  Stage 0: Competitor scoring (Meta API)
  Stage 1: Metadata + OCR gate
  Stage 2: Haiku pre-screen
  Stage 3: Sonnet full analysis
  Output:  Excel 4-tab intelligence file

Usage:
  python tools/pipeline.py \
    --keyword "creatine gummies" \
    --markets US \
    --mode demo \
    --your-brand FusiForce \
    --job-id job-123 \
    --output-dir .tmp
"""
import argparse
import json
import os
import sys
import time
import re

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


def _save_incremental(records, job_id, output_dir, your_brand="FusiForce", sync_gsheet=True):
    """Save records to JSON + Excel + Google Sheet after each brand."""
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

        build_excel(sorted_recs, excel_path, your_brand=your_brand)
        log(f"    [Incremental] Saved {len(sorted_recs)} records → JSON + Excel ({excel_name})")
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
            )
            if url:
                log(f"    [Incremental] Google Sheet synced: {url}")
        except Exception as e:
            log(f"    [Incremental] Google Sheet sync failed: {e}")
    else:
        log(f"    [Incremental] Skipping GSheet sync (next sync in {3 - (len(records) % 3)} brands)")


# ── Fixed 15 Target Brands ───────────────────────────────────────────────────
# Each brand has: search name (for Apify), known landing page, region hints

TARGET_BRANDS = [
    {"brand": "Omni Creatine", "search": "omni creatine", "landing_page": "https://omnicreatine.com/products/omni-creatine-gummy", "region": "US"},
    {"brand": "Create Wellness", "search": "create wellness creatine", "landing_page": "https://trycreate.co", "region": "US"},
    {"brand": "Legion Athletics", "search": "legion athletics creatine", "landing_page": "https://legionathletics.com/products/supplements/creatine-gummies/", "region": "US"},
    {"brand": "Creatine Gummies", "search": "creatine gummies brand", "landing_page": "https://creatinegummies.com", "region": "US"},
    {"brand": "Bounce Nutrition", "search": "bounce nutrition creatine", "landing_page": "https://bouncenutrition.com", "region": "US"},
    {"brand": "Momentous", "search": "momentous creatine chews", "landing_page": "https://www.livemomentous.com/products/creatine-monohydrate-chews", "region": "US"},
    {"brand": "Organifi", "search": "organifi creatine chews", "landing_page": "https://www.organifishop.com/products/creatine-cherry-chews", "region": "US"},
    {"brand": "OVRLOAD", "search": "ovrload creatine", "landing_page": "https://ovrload.co/", "region": "US"},
    {"brand": "Novomins", "search": "novomins creatine gummies", "landing_page": "https://novomins.com/products/creatine-gummies", "region": "UK"},
    {"brand": "Animal Pak", "search": "animal pak creatine chews", "landing_page": "https://uk.animalpak.com/products/animal-creatine-chews", "region": "UK"},
    {"brand": "Thurst", "search": "thurst creatine gummies", "landing_page": "https://www.thurst.com.au/products/creatine-gummies", "region": "AU"},
    {"brand": "Force Factor", "search": "force factor creatine gummies", "landing_page": "https://forcefactor.com/products/creatine-gummies", "region": "US"},
    {"brand": "NutreeBio", "search": "nutreebio creatine", "landing_page": "https://nutreebio.com/", "region": "US"},
    {"brand": "MMUSA", "search": "mmusa creatine gummies", "landing_page": "https://mmusa.com/product/atp-muscle-fuel-creatine-gummies/", "region": "US"},
    {"brand": "Swoly", "search": "swoly creatine gummies", "landing_page": "https://getswoly.com/products/creatine-mono-gummies", "region": "US"},
]

MIN_ADS_PER_BRAND = 5  # Must have at least 5 video ads per brand


# ── Main Pipeline ────────────────────────────────────────────────────────────

def run_pipeline(keyword, markets, mode, your_brand, job_id, output_dir):
    """
    Main pipeline: Fixed 15 brands → Apify crawl → Stage 1 filter → Stage 2 Haiku → Stage 3 Sonnet → Excel.

    Returns:
        list of AdRecord dicts
    """
    from ocr_gate import passes_metadata_gate
    from prescreen import passes_ai_prescreen
    from record_generator import generate_ad_record, assemble_full_record

    # Meta API (optional — for enrichment fallback)
    access_token = os.environ.get("META_ACCESS_TOKEN", "")

    # Video enricher is optional (needs ffmpeg + faster-whisper)
    video_enricher_available = False
    try:
        from video_enricher import enrich_video
        video_enricher_available = True
    except ImportError:
        log("  Video enricher not available — will skip transcription")

    ads_per_brand = MIN_ADS_PER_BRAND if mode == "demo" else 20
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
    # FIXED BRAND LIST — Filter by requested markets
    # ══════════════════════════════════════════════════════════
    brands_to_crawl = []
    for brand_def in TARGET_BRANDS:
        brand_region = brand_def["region"]
        # Include brand if its region is in the requested markets
        if brand_region in markets:
            brands_to_crawl.append(brand_def)
        elif not markets or "ALL" in [m.upper() for m in markets]:
            brands_to_crawl.append(brand_def)

    # If no brands match the market filter, include all brands
    if not brands_to_crawl:
        log("  No brands match market filter — including all 15 brands")
        brands_to_crawl = TARGET_BRANDS[:]

    total_brands = len(brands_to_crawl)
    log(f"\n  Target brands: {total_brands} brands across markets {markets}")
    for b in brands_to_crawl:
        log(f"    - {b['brand']} ({b['region']})")

    # ══════════════════════════════════════════════════════════
    # PER-BRAND CRAWL — Apify → 3-Stage Filter → Analysis
    # ══════════════════════════════════════════════════════════
    for brand_idx, brand_def in enumerate(brands_to_crawl):
        brand_name = brand_def["brand"]
        region = brand_def["region"]
        known_landing_page = brand_def["landing_page"]
        search_term = brand_def["search"]

        brand_progress = int((brand_idx / total_brands) * 85) + 5
        progress({
            "phase": "crawling",
            "region": region,
            "brand": brand_name,
            "progress": brand_progress,
        })

        log(f"\n{'='*60}")
        log(f"  Brand {brand_idx+1}/{total_brands}: {brand_name} ({region})")
        log(f"  Landing: {known_landing_page}")
        log(f"{'='*60}")

        # ── Fetch ads via Apify ──
        brand_ads = []
        try:
            from apify_crawler import search_ads as apify_search
            # Search with brand-specific term, filter active+video
            result = apify_search(search_term, region, limit=100, ad_type="video")
            brand_ads = result.get("data", [])
            log(f"    Apify: {len(brand_ads)} raw ads returned")

            # If too few, try broader search
            if len(brand_ads) < MIN_ADS_PER_BRAND:
                log(f"    Too few ({len(brand_ads)}) — trying broader search...")
                result2 = apify_search(f"{brand_name} creatine", region, limit=100, ad_type="video")
                seen = {a.get("id", "") for a in brand_ads}
                for ad in result2.get("data", []):
                    aid = ad.get("id", "")
                    if aid and aid not in seen:
                        brand_ads.append(ad)
                        seen.add(aid)
                log(f"    After broader search: {len(brand_ads)} ads total")

        except Exception as e:
            log(f"    Apify search failed: {e}")

        if not brand_ads:
            log(f"    No ads found for {brand_name} — skipping")
            continue

        # ── Filter: only keep ads with video URLs ──
        brand_ads = [a for a in brand_ads if get_video_url_from_ad(a)]
        log(f"    With video URL: {len(brand_ads)} ads")

        if len(brand_ads) < MIN_ADS_PER_BRAND:
            log(f"    WARNING: Only {len(brand_ads)} video ads (min {MIN_ADS_PER_BRAND}) — processing all available")

        brand_records = []
        fetched = 0
        max_fetch = 100

        # ── Process each ad through the 3-stage pipeline ──
        for ad in brand_ads:
            if len(brand_records) >= ads_per_brand:
                break
            if fetched >= max_fetch:
                break
            fetched += 1

            ad_id = str(ad.get("id", ad.get("adId", f"ad-{fetched}")))

            # Delta crawl: skip ads already in DB
            if ad_id in skip_ids:
                log(f"    [{fetched}] Ad {ad_id[:20]}... SKIPPED (already in DB)")
                continue

            log(f"    [{fetched}] Ad {ad_id[:20]}...")

            # ════════════════════════════════════════════════
            # STAGE 1: METADATA + OCR GATE
            # ════════════════════════════════════════════════
            metadata_pass = passes_metadata_gate(ad)
            if metadata_pass:
                log(f"      Stage 1A: PASS (metadata)")
            else:
                log(f"      Stage 1A: FAIL (metadata)")

            # Get video URL
            video_url = get_video_url_from_ad(ad)

            # Try snapshot URL extraction
            if not video_url:
                snapshot_url = ad.get("ad_snapshot_url", "")
                if snapshot_url:
                    video_url = extract_video_url_from_snapshot(
                        snapshot_url, access_token
                    )
                    if video_url:
                        log(f"      Extracted video from snapshot")

            # Stage 1B: OCR (requires video URL)
            ocr_pass = False
            if video_url:
                try:
                    from ocr_gate import passes_ocr_gate
                    ocr_pass = passes_ocr_gate(video_url)
                    if ocr_pass:
                        log(f"      Stage 1B: PASS (OCR)")
                except Exception:
                    pass  # OCR is optional — Tesseract may not be installed

            # Stage 1 Decision: OR logic
            if not metadata_pass and not ocr_pass:
                log(f"      Stage 1: REJECTED (both gates failed)")
                continue

            log(f"      Stage 1: PASSED")

            # ════════════════════════════════════════════════
            # VIDEO ENRICHMENT
            # ════════════════════════════════════════════════
            job_dir = os.path.join(output_dir, "jobs", f"{job_id}", ad_id[:30])
            enrichment = {
                "transcript": "",
                "durationSeconds": 0,
                "videoFormat": "unknown",
                "framePath": "",
                "videoUrl": video_url,
            }

            if video_url and video_enricher_available:
                try:
                    enrichment_result = enrich_video(video_url, job_dir)
                    enrichment.update(enrichment_result)
                    enrichment["videoUrl"] = video_url
                    duration = enrichment.get("durationSeconds", 0)
                    log(f"      Video: {duration:.0f}s, {enrichment.get('videoFormat', '?')}")
                except Exception as e:
                    log(f"      Video enrichment failed: {e}")

            transcript = enrichment.get("transcript", "")

            # Fallback: use ad copy text if no audio transcript
            if not transcript:
                ad_text = get_ad_text(ad)
                if ad_text:
                    transcript = f"[Ad copy — no audio transcript] {ad_text}"
                    log(f"      Using ad copy as transcript fallback")

            if not transcript:
                log(f"      No transcript available — skipping")
                continue

            # ════════════════════════════════════════════════
            # STAGE 2: HAIKU PRE-SCREEN
            # ════════════════════════════════════════════════
            progress({
                "phase": "analysing",
                "region": region,
                "brand": brand_name,
                "ad": ad_id[:20],
                "stage": 2,
                "progress": brand_progress + 5,
            })

            try:
                is_relevant = passes_ai_prescreen(transcript, brand_name)
                if not is_relevant:
                    log(f"      Stage 2: REJECTED by Haiku")
                    continue
                log(f"      Stage 2: PASSED (Haiku confirmed)")
            except Exception as e:
                log(f"      Haiku error ({e}) — assuming relevant")

            # ════════════════════════════════════════════════
            # STAGE 3: SONNET FULL ANALYSIS
            # ════════════════════════════════════════════════
            progress({
                "phase": "analysing",
                "region": region,
                "brand": brand_name,
                "ad": ad_id[:20],
                "stage": 3,
                "progress": brand_progress + 8,
            })

            log(f"      Stage 3: Running Sonnet analysis...")

            # Use known landing page from brand definition, fallback to ad data
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
                )
                log(f"      Stage 3: COMPLETE")
            except Exception as e:
                log(f"      Sonnet analysis failed: {e}")
                continue

            # Check for empty analysis
            if all(v == "—" for v in analysis.values()):
                log(f"      Analysis returned empty — skipping")
                continue

            # ════════════════════════════════════════════════
            # ASSEMBLE FULL RECORD (with new fields)
            # ════════════════════════════════════════════════
            from apify_crawler import calculate_longevity_days

            start_time = ad.get("ad_delivery_start_time", "")
            longevity_days = calculate_longevity_days(start_time) if start_time else 0

            impressions_upper = 500000  # default median
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
                # New fields
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

            brand_records.append(record)
            processed_count += 1
            progress({
                "phase": "analysing",
                "region": region,
                "brand": brand_name,
                "progress": brand_progress + 10,
                "adsProcessed": processed_count,
            })
            log(f"      Record assembled (adScore: {record['adScore']})")

        log(f"    {brand_name}: {fetched} fetched -> "
            f"{len(brand_records)} relevant (cap: {ads_per_brand})")
        all_records.extend(brand_records)

        # ── Incremental save (JSON+Excel every brand, GSheet every 3 brands or last brand) ──
        if all_records:
            is_last_brand = (brand_idx == len(brands_to_crawl) - 1)
            sync_gsheet = is_last_brand or ((brand_idx + 1) % 3 == 0)
            _save_incremental(all_records, job_id, output_dir, your_brand, sync_gsheet=sync_gsheet)

    # Sort by adScore DESC (Tab 1 invariant)
    all_records.sort(key=lambda r: r.get("adScore", 0), reverse=True)

    log(f"\n  Pipeline complete: {len(all_records)} total records across {len(brands_to_crawl)} brands")
    return all_records


# ── Entry Point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Project Antigravity Pipeline")
    parser.add_argument("--keyword", default="creatine gummies")
    parser.add_argument("--markets", nargs="+", default=["US"])
    parser.add_argument("--mode", default="demo", choices=["demo", "full"])
    parser.add_argument("--your-brand", default="FusiForce")
    parser.add_argument("--job-id", default=f"job-{int(time.time())}")
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp"),
    )

    args = parser.parse_args()

    log(f"\n  Project Antigravity Pipeline")
    log(f"   Keyword:  {args.keyword}")
    log(f"   Markets:  {', '.join(args.markets)}")
    log(f"   Mode:     {args.mode}")
    log(f"   Brand:    {args.your_brand}")
    log(f"   Job ID:   {args.job_id}")
    log(f"")

    # Run pipeline
    records = run_pipeline(
        keyword=args.keyword,
        markets=args.markets,
        mode=args.mode,
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

        build_excel(records, excel_path)

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
        "mode": args.mode,
        "excelPath": excel_path,
        "dataPath": data_path,
    }
    print(json.dumps(result))

    progress({"phase": "complete", "progress": 100})
    log(f"\n  Pipeline complete! {len(records)} records analysed.")


if __name__ == "__main__":
    main()
