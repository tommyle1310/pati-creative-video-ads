# Project Antigravity — Findings

## API Research
- Meta Ad Library API: Requires `ads_read` permission, long-lived token (60 days)
- Rate limit: 200 calls/hr documented, but real-world limit hits at ~180. Use 150 for safety.
- Foreplay API: Bearer token auth at `https://api.foreplay.co/v1`
- Foreplay session cookies expire after ~4 hours — refresh every 3 hours if using scraper

## Cost Analysis
- Whisper: $0.006/min avg
- Claude Haiku pre-screen: $0.0002/call
- Claude Sonnet analysis: $0.030/call
- Demo (30 ads): ~$1.10
- Full (300 ads): ~$10.86 (drops to ~$6.50 with 40% rejection)

## Key Discoveries
(To be updated as development progresses)
