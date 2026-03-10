# SOP 05 — Video Enrichment

## Goal
Download video, extract audio, transcribe with faster-whisper (local, free).

## Process
1. Download video from CDN URL to `.tmp/jobs/{job_id}/video.mp4`
2. Extract audio: `ffmpeg -i video.mp4 -vn -acodec pcm_s16le audio.wav`
3. Extract first frame: `ffmpeg -i video.mp4 -vframes 1 frame_0s.png`
4. Transcribe with faster-whisper (local model, no API key needed)
5. Return `{ transcript, audioPath, framePath, durationSeconds }`

## Edge Cases
- Video download timeout (30s) → retry once, then skip
- No audio track → set transcript = "" and mark for manual review
- faster-whisper model auto-downloads on first run (~150MB for "base" model)

