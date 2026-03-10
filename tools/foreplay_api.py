"""
tools/foreplay_api.py — Project Antigravity
Primary Foreplay REST API client using API key authentication.
"""
import os
import requests
from typing import Optional

FP_BASE = "https://api.foreplay.co/v1"
FP_API_KEY = os.environ.get("FOREPLAY_API_KEY", "")

FP_HEADERS = {
    "Authorization": f"Bearer {FP_API_KEY}",
    "Content-Type": "application/json",
}


def test_connection() -> bool:
    """Test Foreplay API connection."""
    if not FP_API_KEY:
        print("❌ FOREPLAY_API_KEY not set")
        return False

    try:
        res = requests.get(f"{FP_BASE}/me", headers=FP_HEADERS, timeout=10)
        if res.status_code in (401, 403):
            print("⚠️ Foreplay API key invalid or quota exceeded")
            return False
        if res.ok:
            print("✅ Foreplay API connected")
            return True
        print(f"⚠️ Foreplay API returned {res.status_code}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Foreplay connection failed: {e}")
        return False


def get_ad_details(ad_id: str) -> Optional[dict]:
    """
    Fetch ad details from Foreplay API.

    Args:
        ad_id: Foreplay ad ID

    Returns:
        Dict with ad details or None on failure
    """
    try:
        res = requests.get(
            f"{FP_BASE}/ads/{ad_id}",
            headers=FP_HEADERS,
            timeout=15,
        )
        if res.ok:
            return res.json()
        print(f"⚠️ Foreplay API {res.status_code} for ad {ad_id}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Foreplay API error: {e}")
        return None


def search_ads(
    query: str,
    platform: str = "facebook",
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """
    Search Foreplay ad library.

    Args:
        query: Search keyword
        platform: Ad platform
        limit: Results per page
        offset: Pagination offset

    Returns:
        dict with search results
    """
    try:
        res = requests.get(
            f"{FP_BASE}/ads",
            headers=FP_HEADERS,
            params={
                "q": query,
                "platform": platform,
                "limit": limit,
                "offset": offset,
            },
            timeout=15,
        )
        if res.ok:
            return res.json()
        return {"ads": [], "total": 0}
    except requests.exceptions.RequestException as e:
        print(f"❌ Foreplay search error: {e}")
        return {"ads": [], "total": 0}


def get_board_ads(board_id: str, limit: int = 50, offset: int = 0) -> dict:
    """
    Get ads from a Foreplay board (swipe file).

    Args:
        board_id: Foreplay board ID
        limit: Results per page
        offset: Pagination offset

    Returns:
        dict with board ad results
    """
    try:
        res = requests.get(
            f"{FP_BASE}/boards/{board_id}/ads",
            headers=FP_HEADERS,
            params={"limit": limit, "offset": offset},
            timeout=15,
        )
        if res.ok:
            return res.json()
        return {"ads": [], "total": 0}
    except requests.exceptions.RequestException as e:
        print(f"❌ Foreplay board error: {e}")
        return {"ads": [], "total": 0}


def save_ad_to_board(ad_id: str, board_id: str) -> bool:
    """Save an ad to a Foreplay board."""
    try:
        res = requests.post(
            f"{FP_BASE}/boards/{board_id}/ads",
            headers=FP_HEADERS,
            json={"adId": ad_id},
            timeout=10,
        )
        return res.ok
    except requests.exceptions.RequestException:
        return False


if __name__ == "__main__":
    test_connection()
