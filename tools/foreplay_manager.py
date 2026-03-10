"""
tools/foreplay_manager.py — Project Antigravity
Connection manager that auto-switches between Foreplay API and scraper fallback.
Silent fallback — no user-facing error unless BOTH methods fail.
"""
import os
import sys
import time
from typing import Optional

sys.path.insert(0, os.path.dirname(__file__))
from foreplay_api import test_connection as test_api, get_ad_details
from foreplay_scraper import get_session_cookies_sync, scrape_share_url_sync

# State
_use_scraper = False
_scraper_cookies: dict = {}
_cookies_timestamp: float = 0
COOKIE_REFRESH_INTERVAL = 3 * 3600  # 3 hours (cookies expire at ~4hrs)


def init_connection() -> bool:
    """
    Initialize Foreplay connection.
    Tests API first, falls back to scraper if API is unavailable.

    Returns:
        True if at least one method is available
    """
    global _use_scraper, _scraper_cookies, _cookies_timestamp

    # Try API first
    api_ok = test_api()
    if api_ok:
        _use_scraper = False
        print("✅ Using Foreplay API (primary)")
        return True

    # Fall back to scraper
    print("⚠️ Foreplay API unavailable → initialising scraper session")
    _use_scraper = True
    _scraper_cookies = get_session_cookies_sync()
    _cookies_timestamp = time.time()

    if _scraper_cookies:
        print("✅ Using Foreplay Scraper (fallback)")
        return True

    print("❌ BOTH Foreplay API and Scraper failed")
    return False


def _refresh_cookies_if_needed():
    """Refresh scraper cookies if they're about to expire."""
    global _scraper_cookies, _cookies_timestamp
    if time.time() - _cookies_timestamp > COOKIE_REFRESH_INTERVAL:
        print("🔄 Refreshing Foreplay scraper cookies...")
        _scraper_cookies = get_session_cookies_sync()
        _cookies_timestamp = time.time()


def get_foreplay_ad(
    ad_id: Optional[str] = None,
    share_url: Optional[str] = None,
) -> dict:
    """
    Get ad details from Foreplay (auto-selects API or scraper).

    Args:
        ad_id: Foreplay ad ID (for API)
        share_url: Foreplay share URL (for scraper)

    Returns:
        Dict with videoUrl, landingPageUrl, and other metadata
    """
    global _use_scraper

    if not _use_scraper and ad_id:
        # Try API
        result = get_ad_details(ad_id)
        if result:
            return result
        # API failed for this request — try scraper
        if share_url:
            print(f"⚠️ API failed for {ad_id}, trying scraper...")

    if share_url:
        _refresh_cookies_if_needed()
        return scrape_share_url_sync(share_url, _scraper_cookies)

    return {"videoUrl": "", "landingPageUrl": ""}


def get_connection_status() -> dict:
    """Get current connection status."""
    return {
        "method": "scraper" if _use_scraper else "api",
        "cookiesAge": int(time.time() - _cookies_timestamp) if _use_scraper else None,
        "hasCookies": bool(_scraper_cookies) if _use_scraper else None,
    }


if __name__ == "__main__":
    init_connection()
    print(f"Status: {get_connection_status()}")
