# SOP 02 — Meta Ad Library Crawl

## Goal
Fetch active video ads from Meta Ad Library by keyword and region.

## API Endpoint
`GET https://graph.facebook.com/v21.0/ads_archive`

## Required Params
- `search_terms`: "creatine gummies"
- `ad_type`: "POLITICAL_AND_ISSUE_ADS" (required by API, we filter to VIDEO after)
- `ad_reached_countries`: ["US"] / ["GB"] / ["AU"]
- `ad_active_status`: "ACTIVE"
- `fields`: ad_creative_bodies, ad_creative_link_captions, ad_creative_link_titles, ad_snapshot_url, ad_delivery_start_time, page_id, page_name, publisher_platforms, impressions, spend
- `access_token`: from env
- `limit`: 25

## Rate Limiting
- API limit: 200/hr documented, real-world ~180
- Our limiter: 150/hr with exponential backoff on 429

## Edge Cases
- Token expired → log error, halt crawl, notify user
- Empty results → brand has no active ads, score = 0
- Pagination → follow `paging.next` cursor until exhausted or cap hit
