# SOP 03 — Foreplay Enrichment

## Goal
Get video CDN URL + landing page URL for each ad via Foreplay.

## Primary Path: API
- Base: `https://api.foreplay.co/v1`
- Auth: Bearer token from `FOREPLAY_API_KEY`
- Test on startup, switch to scraper on 401/403/429

## Fallback Path: Playwright Scraper
- Login to `https://app.foreplay.co/login` with email/password
- Navigate share URLs, intercept network for `.mp4`/`.mov`/`cdn.foreplay`/`fbcdn` responses
- Extract landing page URL from external links on page
- Session cookies expire ~4hrs — refresh every 3hrs

## Connection Manager
- `initForeplayConnection()` → test API → set `useScraper` flag
- `getForeplayAdDetails(shareUrl)` → route to API or scraper
- Silent fallback — error only if BOTH fail
