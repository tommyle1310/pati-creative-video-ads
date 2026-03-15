"""
tools/apify_crawler.py — Project Antigravity
Fetches video ads from Meta Ad Library via Apify actor.
Uses 'curious_coder/facebook-ads-library-scraper' (actor hash: XtaWFhbtfxyzqrFmd).

The actor takes Facebook Ad Library search URLs and returns raw ad data
including video URLs, page names, spend data, start dates, etc.
"""
import os
import sys
import time
import urllib.parse
import requests
from datetime import datetime, timezone

# Fix Windows encoding
if sys.platform == "win32":
    for stream in [sys.stdout, sys.stderr]:
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

APIFY_TOKEN = os.environ.get("APIFY_API_TOKEN", "")
APIFY_BASE = "https://api.apify.com/v2"
# curious_coder/facebook-ads-library-scraper — 10M+ runs, most popular
ACTOR_ID = "XtaWFhbtfxyzqrFmd"


def _build_ad_library_url(keyword: str, country: str, media_type: str = "video",
                           page_id: str = "") -> str:
    """
    Build a Facebook Ad Library search URL.
    Filters (matching Meta Ad Library UI):
      - Language: All languages (omit param)
      - Platform: All platforms (omit param)
      - Media type: Videos
      - Active status: Active ads
    """
    params = {
        "active_status": "active",
        "ad_type": "all",
        "country": country,
        "media_type": media_type,
        "search_type": "keyword_unordered",
    }
    if page_id:
        params["view_all_page_id"] = page_id
    else:
        params["q"] = keyword
    return "https://www.facebook.com/ads/library/?" + urllib.parse.urlencode(params)


def _normalize_ad(raw: dict) -> dict:
    """
    Normalize Apify output to a flat dict that pipeline.py can consume.
    Maps the nested snapshot/cards structure to flat fields.
    """
    snapshot = raw.get("snapshot", {})
    cards = snapshot.get("cards", [])
    card = cards[0] if cards else {}

    # Extract video URL from card or snapshot
    video_url = (
        card.get("video_hd_url")
        or card.get("video_sd_url")
        or ""
    )
    # Fallback: check snapshot.videos
    if not video_url:
        videos = snapshot.get("videos", [])
        if videos:
            video_url = videos[0].get("video_hd_url") or videos[0].get("video_sd_url") or ""

    # Extract text content
    body = card.get("body", "") or snapshot.get("body", {}).get("text", "")
    title = card.get("title", "") or snapshot.get("title", "")
    caption = card.get("caption", "") or snapshot.get("caption", "")
    # Landing page URL — try multiple sources (Apify actor stores it inconsistently)
    link_url = (
        card.get("link_url", "")
        or snapshot.get("link_url", "")
        or raw.get("link_url", "")
        or raw.get("landing_page_url", "")
        or card.get("cta_link", "")
        or snapshot.get("cta_link", "")
        or ""
    )
    # Fallback: snapshot.caption often contains the domain (e.g., "burstcreatine.com")
    if not link_url:
        cap = snapshot.get("caption", "") or caption
        if cap and "." in cap and " " not in cap.strip() and len(cap.strip()) < 60:
            # Looks like a domain (e.g., "omnicreatine.com")
            domain = cap.strip()
            if not domain.startswith("http"):
                domain = "https://" + domain
            link_url = domain

    # Start date: Apify returns Unix timestamp (seconds) or formatted string
    start_ts = raw.get("start_date")
    start_date_iso = ""
    if start_ts:
        try:
            ts_int = int(start_ts)
            start_date_iso = datetime.fromtimestamp(ts_int, tz=timezone.utc).isoformat()
        except (ValueError, TypeError, OSError):
            # Fallback to formatted string
            start_date_iso = raw.get("start_date_formatted", str(start_ts))

    # Impressions/reach
    reach = raw.get("reach_estimate", {})
    impressions = {}
    if reach:
        impressions = {
            "lower_bound": str(reach.get("lower_bound", "")),
            "upper_bound": str(reach.get("upper_bound", "")),
        }

    # Ad iteration count — "X ads use this creative and text"
    ad_iteration_count = raw.get("ad_count", raw.get("collation_count", 0))
    if not ad_iteration_count:
        collation = raw.get("collation_id")
        if collation:
            ad_iteration_count = raw.get("collation_count", 1)
        else:
            ad_iteration_count = 1

    return {
        "id": raw.get("ad_archive_id", raw.get("ad_id", "")),
        "ad_archive_id": raw.get("ad_archive_id", ""),
        "page_id": str(raw.get("page_id", snapshot.get("page_id", ""))),
        "page_name": raw.get("page_name", snapshot.get("page_name", "")),
        "is_active": raw.get("is_active", True),
        "ad_delivery_start_time": start_date_iso,
        "ad_iteration_count": ad_iteration_count,
        "ad_creative_bodies": [body] if body else [""],
        "ad_creative_link_titles": [title] if title else [""],
        "ad_creative_link_captions": [caption] if caption else [""],
        "videoUrl": video_url,
        "video_hd_url": card.get("video_hd_url", ""),
        "video_sd_url": card.get("video_sd_url", ""),
        "link_url": link_url,
        "landing_page_url": link_url,
        "ad_snapshot_url": raw.get("url", ""),
        "ad_library_url": raw.get("ad_library_url", ""),
        "publisher_platform": raw.get("publisher_platform", []),
        "impressions": impressions,
        "spend": raw.get("spend", {}),
        "currency": raw.get("currency", ""),
        "categories": raw.get("categories", []),
        "thumbnail_url": snapshot.get("page_profile_picture_url", ""),
        "cta_text": card.get("cta_text", snapshot.get("cta_text", "")),
    }


def search_ads(
    keyword: str,
    country_code: str = "US",
    limit: int = 50,
    ad_type: str = "all",
    page_id: str = "",
) -> dict:
    """
    Search Meta Ad Library via Apify actor.

    Args:
        keyword: Search term (e.g. "creatine gummies")
        country_code: "US", "UK"/"GB", "AU"
        limit: Max ads to return
        ad_type: "all" or "video" (media_type filter)
        page_id: Facebook Page ID — if provided, fetches all ads from this page
                 (ignores keyword). Use for brands with known page IDs.

    Returns:
        dict with 'data' (list of normalized ad dicts)
    """
    if not APIFY_TOKEN:
        print("APIFY_API_TOKEN not set", file=sys.stderr)
        return {"data": []}

    # Map region codes
    region_map = {"UK": "GB", "US": "US", "AU": "AU"}
    country = region_map.get(country_code, country_code)

    # Build the Ad Library search URL
    media_type = "video" if ad_type in ("video", "video_and_dynamic") else "all"
    search_url = _build_ad_library_url(keyword, country, media_type, page_id=page_id)

    # Actor requires count >= 10
    actual_count = max(limit, 10)
    run_input = {
        "urls": [{"url": search_url}],
        "count": actual_count,
    }

    if page_id:
        print(f"  Apify: Fetching ads for page_id={page_id} in {country} (limit={limit})...",
              file=sys.stderr, flush=True)
    else:
        print(f"  Apify: Searching '{keyword}' in {country} (limit={limit})...",
              file=sys.stderr, flush=True)

    try:
        # Start the actor run
        resp = requests.post(
            f"{APIFY_BASE}/acts/{ACTOR_ID}/runs",
            params={"token": APIFY_TOKEN},
            json=run_input,
            timeout=30,
        )
        resp.raise_for_status()
        run_data = resp.json().get("data", {})
        run_id = run_data.get("id")

        if not run_id:
            print(f"  Apify: Failed to start actor run", file=sys.stderr)
            return {"data": []}

        print(f"  Apify: Run started (ID: {run_id})", file=sys.stderr, flush=True)

        # Poll for completion (max 5 minutes)
        max_wait = 300
        poll_interval = 5
        elapsed = 0
        status_data = {}

        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval

            status_resp = requests.get(
                f"{APIFY_BASE}/actor-runs/{run_id}",
                params={"token": APIFY_TOKEN},
                timeout=10,
            )
            status_data = status_resp.json().get("data", {})
            status = status_data.get("status", "")

            if status == "SUCCEEDED":
                print(f"  Apify: Run completed in ~{elapsed}s", file=sys.stderr, flush=True)
                break
            elif status in ("FAILED", "ABORTED", "TIMED-OUT"):
                print(f"  Apify: Run {status}", file=sys.stderr)
                return {"data": []}

            if elapsed % 30 == 0:
                print(f"  Apify: Still running... ({elapsed}s)", file=sys.stderr, flush=True)

        if elapsed >= max_wait:
            print(f"  Apify: Timed out after {max_wait}s", file=sys.stderr)
            return {"data": []}

        # Fetch results from dataset
        dataset_id = status_data.get("defaultDatasetId")
        if not dataset_id:
            print(f"  Apify: No dataset ID in run result", file=sys.stderr)
            return {"data": []}

        items_resp = requests.get(
            f"{APIFY_BASE}/datasets/{dataset_id}/items",
            params={"token": APIFY_TOKEN, "limit": limit, "format": "json"},
            timeout=30,
        )

        raw_items = []
        if items_resp.status_code == 200:
            data = items_resp.json()
            if isinstance(data, list):
                raw_items = data
            elif isinstance(data, dict):
                raw_items = data.get("items", data.get("data", []))

        # Normalize all items
        normalized = [_normalize_ad(item) for item in raw_items]

        print(f"  Apify: Got {len(normalized)} ads", file=sys.stderr, flush=True)
        return {"data": normalized}

    except requests.exceptions.RequestException as e:
        print(f"  Apify error: {e}", file=sys.stderr)
        return {"data": []}


def search_ads_by_page(
    page_name: str,
    country_code: str = "US",
    limit: int = 50,
) -> dict:
    """
    Search Meta Ad Library by page/brand name, filtering for active video ads only.
    """
    return search_ads(
        keyword=page_name,
        country_code=country_code,
        limit=limit,
        ad_type="video",
    )


def calculate_longevity_days(ad_delivery_start_time) -> int:
    """Calculate days since ad started running. Accepts ISO string or Unix timestamp."""
    try:
        if isinstance(ad_delivery_start_time, (int, float)):
            start = datetime.fromtimestamp(ad_delivery_start_time, tz=timezone.utc)
        else:
            ts_str = str(ad_delivery_start_time)
            # Try parsing as Unix timestamp first
            try:
                ts = int(ts_str)
                start = datetime.fromtimestamp(ts, tz=timezone.utc)
            except ValueError:
                start = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        return max(0, (now - start).days)
    except (ValueError, TypeError, OSError):
        return 0


if __name__ == "__main__":
    # Quick test
    if not APIFY_TOKEN:
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        k, v = k.strip(), v.strip().strip("'").strip('"')
                        if v and not v.startswith("#"):
                            os.environ.setdefault(k, v)
            APIFY_TOKEN = os.environ.get("APIFY_API_TOKEN", "")

    if APIFY_TOKEN:
        print("Testing Apify crawler...")
        result = search_ads("creatine gummies", "US", limit=10, ad_type="video")
        ads = result.get("data", [])
        print(f"Got {len(ads)} ads")
        if ads:
            for i, ad in enumerate(ads[:3]):
                print(f"\n--- Ad {i+1} ---")
                print(f"  Brand: {ad.get('page_name')}")
                print(f"  ID: {ad.get('id')}")
                print(f"  Start: {ad.get('ad_delivery_start_time')}")
                print(f"  Video: {'YES' if ad.get('videoUrl') else 'NO'}")
                print(f"  Body: {ad.get('ad_creative_bodies', [''])[0][:80]}")
                print(f"  Longevity: {calculate_longevity_days(ad.get('ad_delivery_start_time', ''))} days")
    else:
        print("APIFY_API_TOKEN not set")
