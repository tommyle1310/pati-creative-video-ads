#!/usr/bin/env python3
"""
tools/analyze_single.py — Project Antigravity
Analyze a single ad from URL or local video file.
Outputs full 8-field analysis + transcript as JSON to stdout.

Usage:
  python tools/analyze_single.py --video-url "https://..."
  python tools/analyze_single.py --video-file "/path/to/video.mp4"
  python tools/analyze_single.py --ad-url "https://facebook.com/ads/library/?id=..."
"""
import argparse
import json
import os
import re
import sys

if sys.platform == "win32":
    for s in [sys.stdout, sys.stderr]:
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

# Load .env
def _load_dotenv():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip("'").strip('"')
            if val and not val.startswith("#"):
                os.environ.setdefault(key, val)

_load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def extract_ad_id_from_url(url: str) -> str:
    match = re.search(r'[?&]id=(\d+)', url)
    return match.group(1) if match else ""


def extract_video_from_ad_page(ad_url: str) -> str:
    """Try to extract video URL from Meta Ad Library page."""
    import requests
    try:
        resp = requests.get(ad_url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        patterns = [
            r'"(https://video-[^"]+\.mp4[^"]*)"',
            r'"(https://scontent[^"]+\.mp4[^"]*)"',
            r'"(https://[^"]+fbcdn[^"]+\.mp4[^"]*)"',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, resp.text)
            for match in matches:
                if ".mp4" in match or "video" in match:
                    return match.replace("\\/", "/")
    except Exception as e:
        log(f"  Could not extract video from ad page: {e}")
    return ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-url", default="", help="Direct video URL")
    parser.add_argument("--video-file", default="", help="Local video file path")
    parser.add_argument("--ad-url", default="", help="Meta Ad Library URL")
    parser.add_argument("--output-dir", default=".tmp/analyze")
    parser.add_argument("--brand", default="Unknown")
    parser.add_argument("--region", default="US")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    job_dir = os.path.join(args.output_dir, f"single-{os.getpid()}")
    os.makedirs(job_dir, exist_ok=True)

    video_url = args.video_url
    video_file = args.video_file
    ad_library_url = args.ad_url

    # If Meta Ad Library URL, try to extract video
    if ad_library_url and not video_url:
        log(f"  Extracting video from Ad Library URL...")
        video_url = extract_video_from_ad_page(ad_library_url)
        if video_url:
            log(f"  Found video URL")
        else:
            log(f"  Could not extract video URL from ad page")

    # Import enricher
    from video_enricher import enrich_video, HAS_FFMPEG, HAS_OPENCV, HAS_WHISPER
    from record_generator import generate_ad_record

    log(f"  Tools: FFmpeg={HAS_FFMPEG} OpenCV={HAS_OPENCV} Whisper={HAS_WHISPER}")

    enrichment = {
        "transcript": "",
        "framePaths": [],
        "framePath": "",
        "durationSeconds": 0,
        "videoFormat": "unknown",
    }

    # If we have a local file, process it directly
    if video_file and os.path.exists(video_file):
        log(f"  Processing local file: {video_file}")
        import shutil
        local_path = os.path.join(job_dir, "video.mp4")
        shutil.copy2(video_file, local_path)

        # Get duration and format
        from video_enricher import get_video_duration, get_video_format
        from video_enricher import extract_frames_ffmpeg, extract_frames_opencv
        from video_enricher import extract_audio, transcribe_audio

        duration = get_video_duration(local_path)
        vid_format = get_video_format(local_path)

        # Extract frames
        frames = []
        if HAS_FFMPEG:
            frames = extract_frames_ffmpeg(local_path, job_dir, duration)
        if not frames and HAS_OPENCV:
            frames = extract_frames_opencv(local_path, job_dir, duration)

        # Transcribe
        transcript = ""
        audio_path = os.path.join(job_dir, "audio.wav")
        if extract_audio(local_path, audio_path):
            transcript = transcribe_audio(audio_path)

        enrichment = {
            "transcript": transcript,
            "framePaths": frames,
            "framePath": frames[0] if frames else "",
            "durationSeconds": duration,
            "videoFormat": vid_format,
        }
        log(f"  Local file: {duration:.0f}s, {vid_format}, {len(frames)} frames")

    elif video_url:
        log(f"  Downloading and enriching video...")
        enrichment_result = enrich_video(video_url, job_dir)
        enrichment.update(enrichment_result)
        log(f"  Video: {enrichment['durationSeconds']:.0f}s, "
            f"{enrichment['videoFormat']}, {len(enrichment['framePaths'])} frames")
    else:
        # Output error
        result = {
            "success": False,
            "error": "No video source provided. Supply --video-url, --video-file, or --ad-url.",
        }
        print(json.dumps(result))
        return

    transcript = enrichment.get("transcript", "")
    has_frames = len(enrichment.get("framePaths", [])) > 0

    if not transcript and not has_frames:
        result = {
            "success": False,
            "error": "Could not extract frames or transcript from video. "
                     "The video URL may be expired or inaccessible.",
        }
        print(json.dumps(result))
        return

    if not transcript and has_frames:
        transcript = "[No audio voiceover — visual-only ad. Analyze based on the video frames provided.]"

    # Run Sonnet analysis
    log(f"  Running Sonnet analysis ({len(enrichment.get('framePaths', []))} frames)...")
    analysis = generate_ad_record(
        transcript=transcript,
        brand=args.brand,
        region=args.region,
        your_brand="FusiForce",
        your_parent="Wellness Nest",
        landing_page="",
        duration=enrichment.get("durationSeconds", 0),
        video_format=enrichment.get("videoFormat", "unknown"),
        frame_paths=enrichment.get("framePaths", []),
    )

    result = {
        "success": True,
        "transcript": enrichment.get("transcript", ""),
        "durationSeconds": enrichment.get("durationSeconds", 0),
        "videoFormat": enrichment.get("videoFormat", "unknown"),
        "frameCount": len(enrichment.get("framePaths", [])),
        "analysis": analysis,
        "adLibraryUrl": ad_library_url or "",
        "videoUrl": video_url or "",
    }

    # Clean up frames from output (they're local paths)
    print(json.dumps(result, ensure_ascii=False))

    # Clean up
    import shutil
    try:
        shutil.rmtree(job_dir, ignore_errors=True)
    except Exception:
        pass


if __name__ == "__main__":
    main()
