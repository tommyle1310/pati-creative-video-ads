# SOP 04 — Three-Stage Filter

## Goal
Reject irrelevant ads before expensive operations. Order: Stage 1 → 2 → 3. Inviolable.

## Stage 1: Metadata + OCR Gate
- **1A**: Check `ad_creative_bodies` + `link_captions` + `link_titles` for TARGET_KEYWORDS, reject if EXCLUDE_KEYWORDS found
- **1B**: FFmpeg extract frame 0, Tesseract OCR, check for TARGET_KEYWORDS
- **Decision**: `metadata_pass OR ocr_pass` → proceed. Neither → REJECT.
- **Cost**: ~$0, ~0.1s/ad

## Stage 2: AI Pre-Screen (Haiku)
- Whisper transcription first
- Claude Haiku prompt: "Is this ad specifically promoting CREATINE in GUMMY form? Yes/No"
- **Cost**: ~$0.0002/call
- Reject "No" answers. Continue crawling for more ads.

## Stage 3: Full Analysis (Sonnet)
- Only runs on Haiku-approved ads
- 9-field forensic breakdown
- **Cost**: ~$0.03/call

## Dynamic Cap
- Target: 20 relevant ads per brand (6 in demo)
- Keep fetching batches of 10 until cap met or brand exhausted
- Absolute max: 100 fetched per brand
