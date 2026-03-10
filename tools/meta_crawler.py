"""
tools/meta_crawler.py — Project Antigravity
Meta Ad Library API client. Searches by keyword + region, filters ad_type=VIDEO.
"""
import os
import time
import requests
from datetime import datetime, timezone
from typing import Optional

META_API_BASE = "https://graph.facebook.com/v21.0/ads_archive"
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")

# Rate limiting: 150 calls/hr (safety margin below 200 limit)
RATE_LIMIT_CALLS = 150
RATE_LIMIT_WINDOW = 3600  # seconds
_call_timestamps: list[float] = []


def _rate_limit():
    """Enforce rate limiting on Meta API calls."""
    global _call_timestamps
    now = time.time()
    _call_timestamps = [t for t in _call_timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(_call_timestamps) >= RATE_LIMIT_CALLS:
        wait_time = RATE_LIMIT_WINDOW - (now - _call_timestamps[0]) + 1
        print(f"⏳ Rate limit hit. Waiting {wait_time:.0f}s...")
        time.sleep(wait_time)
    _call_timestamps.append(time.time())


def search_ads(
    keyword: str,
    country_code: str,
    limit: int = 25,
    after_cursor: Optional[str] = None,
) -> dict:
    """
    Search Meta Ad Library for active video ads.

    Args:
        keyword: Search term (e.g. "creatine gummies")
        country_code: ISO country code — "US", "GB" (for UK), "AU"
        limit: Results per page (max 25)
        after_cursor: Pagination cursor

    Returns:
        dict with 'data' (list of ads) and 'paging' (cursor info)
    """
    _rate_limit()

    # Map region codes to Meta's expected format
    region_map = {"UK": "GB", "US": "US", "AU": "AU"}
    country = region_map.get(country_code, country_code)

    params = {
        "search_terms": keyword,
        "ad_type": "POLITICAL_AND_ISSUE_ADS",  # Required param — we filter to video post-fetch
        "ad_reached_countries": f'["{country}"]',
        "ad_active_status": "ACTIVE",
        "fields": ",".join([
            "ad_creative_bodies",
            "ad_creative_link_captions",
            "ad_creative_link_titles",
            "ad_snapshot_url",
            "ad_delivery_start_time",
            "page_id",
            "page_name",
            "publisher_platforms",
            "impressions",
            "spend",
            "id",
        ]),
        "access_token": META_ACCESS_TOKEN,
        "limit": min(limit, 25),
    }

    if after_cursor:
        params["after"] = after_cursor

    try:
        response = requests.get(META_API_BASE, params=params, timeout=30)

        if response.status_code == 429:
            print("⚠️ Meta API 429 — backing off 60s")
            time.sleep(60)
            return search_ads(keyword, country_code, limit, after_cursor)

        response.raise_for_status()
        return response.json()

    except requests.exceptions.RequestException as e:
        print(f"❌ Meta API error: {e}")
        return {"data": [], "paging": {}}


def get_ads_by_page(
    page_id: str,
    country_code: str,
    limit: int = 25,
    after_cursor: Optional[str] = None,
) -> dict:
    """
    Get all active ads for a specific page (brand).

    Args:
        page_id: Facebook Page ID
        country_code: ISO country code
        limit: Results per page
        after_cursor: Pagination cursor

    Returns:
        dict with 'data' and 'paging'
    """
    _rate_limit()

    region_map = {"UK": "GB", "US": "US", "AU": "AU"}
    country = region_map.get(country_code, country_code)

    params = {
        "search_page_ids": page_id,
        "ad_reached_countries": f'["{country}"]',
        "ad_active_status": "ACTIVE",
        "fields": ",".join([
            "ad_creative_bodies",
            "ad_creative_link_captions",
            "ad_creative_link_titles",
            "ad_snapshot_url",
            "ad_delivery_start_time",
            "page_id",
            "page_name",
            "publisher_platforms",
            "impressions",
            "spend",
            "id",
        ]),
        "access_token": META_ACCESS_TOKEN,
        "limit": min(limit, 25),
    }

    if after_cursor:
        params["after"] = after_cursor

    try:
        response = requests.get(META_API_BASE, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Meta API error: {e}")
        return {"data": [], "paging": {}}


def calculate_longevity_days(ad_delivery_start_time: str) -> int:
    """Calculate days since ad started running."""
    try:
        start = datetime.fromisoformat(ad_delivery_start_time.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        return (now - start).days
    except (ValueError, TypeError):
        return 0


def test_connection() -> bool:
    """Test Meta API connection with a minimal request."""
    if not META_ACCESS_TOKEN:
        print("❌ META_ACCESS_TOKEN not set")
        return False

    try:
        response = requests.get(
            META_API_BASE,
            params={
                "search_terms": "test",
                "ad_reached_countries": '["US"]',
                "ad_active_status": "ACTIVE",
                "access_token": META_ACCESS_TOKEN,
                "limit": 1,
            },
            timeout=10,
        )
        if response.status_code == 200:
            print("✅ Meta Ad Library API connected")
            return True
        else:
            print(f"❌ Meta API returned {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Meta API connection failed: {e}")
        return False


if __name__ == "__main__":
    test_connection()
