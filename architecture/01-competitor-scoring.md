# SOP 01 — Competitor Scoring

## Goal
Score and rank creatine gummy brands per market to select top 5 for crawling.

## Input
- Meta Ad Library search results for keyword "creatine gummies" per region
- Web search results for omnichannel presence

## Process
1. Query Meta Ad Library for all active VIDEO ads matching keyword per region
2. Group ads by `page_name` (brand)
3. Score each brand on 4 criteria:
   - **Ad Count** (30%): >20=3, 10-20=2, <10=1
   - **Longevity** (35%): >90d=3, 30-90d=2, <30d=1
   - **Omnichannel** (20%): Meta+TikTok+YouTube=3, 2 platforms=2, Meta only=1
   - **Market Fit** (15%): 3 markets=3, 2=2, 1=0
4. `CompetitorScore = (AdCount×0.30) + (Longevity×0.35) + (Omnichannel×0.20) + (MarketFit×0.15)`
5. Return top 5 per market, tiebreak by longevity

## Edge Cases
- Brand has <3 active ads → still include, score = 1pt for ad count
- Brand name variations → normalize to canonical name
- Longevity tie → brand with older ad wins
