"""
tools/competitor_scorer.py — Project Antigravity
Score & rank brands per market using 4-criteria weighted scoring.

Criteria:
  Ad Count    (30%): >20=3, 10-20=2, <10=1
  Longevity   (35%): >90d=3, 30-90d=2, <30d=1
  Omnichannel (20%): All 3=3, 2=2, Meta only=1
  Market Fit  (15%): 3 markets=3, 2=2, 1=0
"""
import os
import sys
from datetime import datetime, timezone
from collections import defaultdict
from typing import Optional

sys.path.insert(0, os.path.dirname(__file__))
from meta_crawler import search_ads, calculate_longevity_days


def score_ad_count(count: int) -> int:
    """Score based on number of active video ads."""
    if count > 20:
        return 3
    elif count >= 10:
        return 2
    else:
        return 1


def score_longevity(days: int) -> int:
    """Score based on oldest active ad's longevity."""
    if days > 90:
        return 3
    elif days >= 30:
        return 2
    else:
        return 1


def score_omnichannel(platforms: list[str]) -> int:
    """Score based on platform presence."""
    has_meta = any(p in platforms for p in ["facebook", "instagram", "messenger", "audience_network"])
    has_tiktok = "tiktok" in platforms
    has_youtube = "youtube" in platforms

    count = sum([has_meta, has_tiktok, has_youtube])
    if count >= 3:
        return 3
    elif count >= 2:
        return 2
    else:
        return 1


def score_market_fit(markets_served: list[str]) -> int:
    """Score based on markets served."""
    target_markets = {"US", "UK", "AU"}
    overlap = len(target_markets.intersection(set(markets_served)))
    if overlap >= 3:
        return 3
    elif overlap >= 2:
        return 2
    else:
        return 0


def compute_competitor_score(
    ad_count_score: int,
    longevity_score: int,
    omnichannel_score: int,
    market_fit_score: int,
) -> float:
    """
    Compute weighted composite score.

    CompetitorScore = (AdCount × 0.30) + (Longevity × 0.35) + (Omnichannel × 0.20) + (MarketFit × 0.15)
    """
    return (
        ad_count_score * 0.30
        + longevity_score * 0.35
        + omnichannel_score * 0.20
        + market_fit_score * 0.15
    )


def score_competitors_for_region(
    keyword: str,
    region: str,
    top_n: int = 5,
    known_platforms: Optional[dict] = None,
    known_markets: Optional[dict] = None,
) -> list[dict]:
    """
    Score and rank competitors for a given region.

    Args:
        keyword: Search keyword (e.g. "creatine gummies")
        region: Market region ("US", "UK", "AU")
        top_n: Number of top competitors to return
        known_platforms: Optional dict of brand→[platforms] from web search
        known_markets: Optional dict of brand→[markets] from web search

    Returns:
        List of CompetitorScore dicts, sorted by composite score DESC.
    """
    known_platforms = known_platforms or {}
    known_markets = known_markets or {}

    # Fetch ads from Meta
    all_ads = []
    cursor = None
    max_pages = 10  # Limit pagination to avoid excessive API calls

    for _ in range(max_pages):
        result = search_ads(keyword, region, limit=25, after_cursor=cursor)
        ads = result.get("data", [])
        if not ads:
            break
        all_ads.extend(ads)
        paging = result.get("paging", {})
        cursor = paging.get("cursors", {}).get("after")
        if not cursor or "next" not in paging:
            break

    # Group ads by brand (page_name)
    brands: dict[str, list] = defaultdict(list)
    for ad in all_ads:
        page_name = ad.get("page_name", "Unknown")
        brands[page_name].append(ad)

    # Score each brand
    scores = []
    for brand_name, brand_ads in brands.items():
        # Ad Count
        ad_count = len(brand_ads)
        ac_score = score_ad_count(ad_count)

        # Longevity — oldest active ad
        longevity_days_list = []
        for ad in brand_ads:
            start_time = ad.get("ad_delivery_start_time", "")
            if start_time:
                days = calculate_longevity_days(start_time)
                longevity_days_list.append(days)
        oldest_ad_days = max(longevity_days_list) if longevity_days_list else 0
        lon_score = score_longevity(oldest_ad_days)

        # Omnichannel
        meta_platforms = set()
        for ad in brand_ads:
            pubs = ad.get("publisher_platforms", [])
            if isinstance(pubs, list):
                meta_platforms.update(p.lower() for p in pubs)
        # Add known external platforms
        external = known_platforms.get(brand_name, [])
        all_platforms = list(meta_platforms) + [p.lower() for p in external]
        omni_score = score_omnichannel(all_platforms)

        # Market Fit
        brand_markets = known_markets.get(brand_name, [region])
        mf_score = score_market_fit(brand_markets)

        # Composite
        composite = compute_competitor_score(ac_score, lon_score, omni_score, mf_score)

        scores.append({
            "brand": brand_name,
            "region": region,
            "adCountScore": ac_score,
            "longevityScore": lon_score,
            "omnichannelScore": omni_score,
            "marketFitScore": mf_score,
            "compositeScore": round(composite, 3),
            "activeAdCount": ad_count,
            "oldestAdDays": oldest_ad_days,
            "platforms": all_platforms,
            "marketsServed": brand_markets,
            "pageId": brand_ads[0].get("page_id", ""),
        })

    # Sort by composite score DESC, tiebreak by longevity
    scores.sort(key=lambda s: (s["compositeScore"], s["oldestAdDays"]), reverse=True)

    top = scores[:top_n]
    print(f"\n🏆 Top {len(top)} competitors in {region}:")
    for i, s in enumerate(top, 1):
        print(f"   {i}. {s['brand']} — Score: {s['compositeScore']} "
              f"(Ads: {s['activeAdCount']}, Longevity: {s['oldestAdDays']}d)")

    return top


if __name__ == "__main__":
    # Test with dummy data
    print("Competitor Scorer ready. Set META_ACCESS_TOKEN to run.")
