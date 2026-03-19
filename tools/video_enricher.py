"""
tools/video_enricher.py — Project Antigravity
Download video, extract frames + audio, transcribe with faster-whisper.

Fallback chain for frame extraction:
  1. FFmpeg (best quality, multiple timestamps)
  2. OpenCV (pure Python, no system dependency)
  3. Thumbnail URL from Apify (last resort, single frame)

Fallback chain for transcription:
  1. FFmpeg audio extraction → faster-whisper
  2. No transcript (Sonnet will rely on visual frames only)
"""
import os
import subprocess
import requests as req
from typing import Optional


# ── Dependency detection (run once at import time) ──────────────────────────

def _has_ffmpeg() -> bool:
    try:
        subprocess.run(
            ["ffmpeg", "-version"], capture_output=True, timeout=5,
        )
        return True
    except Exception:
        return False


def _has_opencv() -> bool:
    try:
        import cv2  # noqa: F401
        return True
    except ImportError:
        return False


def _has_whisper() -> bool:
    try:
        from faster_whisper import WhisperModel  # noqa: F401
        return True
    except ImportError:
        return False


HAS_FFMPEG = _has_ffmpeg()
HAS_OPENCV = _has_opencv()
HAS_WHISPER = _has_whisper()


def _log(msg: str):
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        # Windows console can't handle emoji — strip them
        import re
        clean = re.sub(r'[^\x00-\x7F]+', '', msg)
        print(clean, flush=True)


# ── Video download ──────────────────────────────────────────────────────────

def download_video(url: str, output_path: str, timeout: int = 60) -> bool:
    """Download video from URL to local path."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        }
        response = req.get(url, stream=True, timeout=timeout, headers=headers)
        response.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        _log(f"   Downloaded video ({size_mb:.1f} MB)")
        return True
    except Exception as e:
        _log(f"   Video download failed: {e}")
        return False


# ── Frame extraction ────────────────────────────────────────────────────────

def _get_timestamps(duration: float) -> list[int]:
    """Pick strategic timestamps based on video length."""
    if duration <= 0:
        return [0]

    timestamps = [0]
    if duration > 3:
        timestamps.append(2)
    if duration > 7:
        timestamps.append(5)
    if duration > 15:
        timestamps.append(int(duration * 0.5))  # midpoint
    if duration > 10:
        timestamps.append(max(int(duration - 2), 6))  # near end (CTA)

    return sorted(set(t for t in timestamps if t < duration))


def extract_frames_ffmpeg(video_path: str, output_dir: str, duration: float) -> list[str]:
    """Extract key frames using FFmpeg (best quality)."""
    timestamps = _get_timestamps(duration)
    extracted = []

    for ts in timestamps:
        frame_path = os.path.join(output_dir, f"frame_{ts}s.png")
        try:
            result = subprocess.run(
                ["ffmpeg", "-ss", str(ts), "-i", video_path,
                 "-vframes", "1", "-q:v", "2", "-y", frame_path],
                capture_output=True, timeout=15,
            )
            if result.returncode == 0 and os.path.exists(frame_path):
                extracted.append(frame_path)
        except Exception:
            pass

    return extracted


def extract_frames_opencv(video_path: str, output_dir: str, duration: float) -> list[str]:
    """Extract key frames using OpenCV (pure Python fallback)."""
    try:
        import cv2
    except ImportError:
        return []

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _log(f"   ⚠️ OpenCV could not open video")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    # If duration wasn't provided, calculate from video
    if duration <= 0 and fps > 0 and total_frames > 0:
        duration = total_frames / fps

    timestamps = _get_timestamps(duration)
    extracted = []

    for ts in timestamps:
        target_frame = int(ts * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ret, frame = cap.read()
        if ret:
            frame_path = os.path.join(output_dir, f"frame_{ts}s.png")
            cv2.imwrite(frame_path, frame)
            if os.path.exists(frame_path):
                extracted.append(frame_path)

    cap.release()
    return extracted


def download_thumbnail(thumbnail_url: str, output_dir: str) -> list[str]:
    """Download thumbnail image as last-resort frame (single frame)."""
    if not thumbnail_url:
        return []

    frame_path = os.path.join(output_dir, "frame_thumbnail.png")
    try:
        response = req.get(thumbnail_url, timeout=15)
        response.raise_for_status()
        with open(frame_path, "wb") as f:
            f.write(response.content)
        if os.path.exists(frame_path) and os.path.getsize(frame_path) > 1000:
            return [frame_path]
    except Exception as e:
        _log(f"   ⚠️ Thumbnail download failed: {e}")

    return []


# ── Audio + Transcription ──────────────────────────────────────────────────

def extract_audio(video_path: str, audio_path: str) -> bool:
    """Extract audio from video using FFmpeg."""
    if not HAS_FFMPEG:
        return False
    try:
        result = subprocess.run(
            ["ffmpeg", "-i", video_path,
             "-vn", "-acodec", "pcm_s16le",
             "-ar", "16000", "-ac", "1",
             "-y", audio_path],
            capture_output=True, timeout=30,
        )
        return result.returncode == 0 and os.path.exists(audio_path)
    except Exception:
        return False


def transcribe_audio(audio_path: str, model_size: str = "base") -> str:
    """Transcribe audio using faster-whisper (local, free)."""
    if not HAS_WHISPER:
        _log("   ⚠️ faster-whisper not installed — no transcript")
        return ""
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, info = model.transcribe(audio_path, beam_size=5)

        transcript_parts = [seg.text.strip() for seg in segments]
        transcript = " ".join(transcript_parts)
        _log(f"   🎤 Transcribed {info.duration:.1f}s audio ({info.language}, {info.language_probability:.0%} confidence)")
        return transcript
    except Exception as e:
        _log(f"   ❌ Whisper transcription failed: {e}")
        return ""


# ── Metadata via FFprobe or OpenCV ─────────────────────────────────────────

def get_video_duration(video_path: str) -> float:
    """Get video duration — tries FFprobe first, then OpenCV."""
    # Try FFprobe
    if HAS_FFMPEG:
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "error",
                 "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1",
                 video_path],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode == 0 and result.stdout.strip():
                return float(result.stdout.strip())
        except Exception:
            pass

    # Fallback: OpenCV
    if HAS_OPENCV:
        try:
            import cv2
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            total = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
            cap.release()
            if fps > 0 and total > 0:
                return total / fps
        except Exception:
            pass

    return 0.0


def get_video_format(video_path: str) -> str:
    """Detect video aspect ratio — tries FFprobe first, then OpenCV."""
    w, h = 0, 0

    if HAS_FFMPEG:
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "error",
                 "-select_streams", "v:0",
                 "-show_entries", "stream=width,height",
                 "-of", "csv=p=0", video_path],
                capture_output=True, text=True, timeout=10,
            )
            parts = result.stdout.strip().split(",")
            if len(parts) == 2:
                w, h = int(parts[0]), int(parts[1])
        except Exception:
            pass

    if w == 0 and HAS_OPENCV:
        try:
            import cv2
            cap = cv2.VideoCapture(video_path)
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()
        except Exception:
            pass

    if w > 0 and h > 0:
        ratio = w / h
        if abs(ratio - 9 / 16) < 0.1:
            return "9:16"
        elif abs(ratio - 1.0) < 0.1:
            return "1:1"
        elif abs(ratio - 16 / 9) < 0.1:
            return "16:9"
        elif abs(ratio - 4 / 5) < 0.1:
            return "4:5"

    return "unknown"


# ── Main enrichment pipeline ───────────────────────────────────────────────

def enrich_video(
    video_url: str,
    job_dir: str,
    thumbnail_url: str = "",
) -> dict:
    """
    Full video enrichment pipeline with fallback chain:
      Frames: FFmpeg → OpenCV → Thumbnail download
      Audio:  FFmpeg → (skip if unavailable)
      Transcription: faster-whisper → (skip if unavailable)

    Args:
        video_url: CDN URL of the video
        job_dir: Directory to store intermediate files
        thumbnail_url: Fallback thumbnail URL from Apify

    Returns:
        dict with transcript, frame paths, duration, format
    """
    os.makedirs(job_dir, exist_ok=True)

    video_path = os.path.join(job_dir, "video.mp4")
    audio_path = os.path.join(job_dir, "audio.wav")

    result = {
        "transcript": "",
        "videoPath": video_path,
        "audioPath": audio_path,
        "framePath": "",
        "framePaths": [],
        "durationSeconds": 0,
        "videoFormat": "unknown",
    }

    # Log available tools
    tools = []
    if HAS_FFMPEG:
        tools.append("FFmpeg")
    if HAS_OPENCV:
        tools.append("OpenCV")
    if HAS_WHISPER:
        tools.append("Whisper")
    if not tools:
        tools.append("NONE")
    _log(f"   🔧 Tools: {', '.join(tools)}")

    # 1. Download video
    if not download_video(video_url, video_path):
        # Even if video download fails, try thumbnail
        if thumbnail_url:
            thumb_frames = download_thumbnail(thumbnail_url, job_dir)
            if thumb_frames:
                result["framePaths"] = thumb_frames
                result["framePath"] = thumb_frames[0]
                _log(f"   🖼️ Using thumbnail as fallback (1 frame)")
        return result

    # 2. Get metadata (duration + format)
    result["durationSeconds"] = get_video_duration(video_path)
    result["videoFormat"] = get_video_format(video_path)
    duration = result["durationSeconds"]

    # 3. Extract frames — fallback chain: FFmpeg → OpenCV → thumbnail
    frames = []
    if HAS_FFMPEG:
        frames = extract_frames_ffmpeg(video_path, job_dir, duration)
        if frames:
            _log(f"   🖼️ Extracted {len(frames)} frames (FFmpeg)")

    if not frames and HAS_OPENCV:
        frames = extract_frames_opencv(video_path, job_dir, duration)
        if frames:
            _log(f"   🖼️ Extracted {len(frames)} frames (OpenCV)")

    if not frames and thumbnail_url:
        frames = download_thumbnail(thumbnail_url, job_dir)
        if frames:
            _log(f"   🖼️ Using thumbnail as fallback (1 frame)")

    if not frames:
        _log(f"   ⚠️ NO FRAMES EXTRACTED — Sonnet will analyze without visuals")

    result["framePaths"] = frames
    if frames:
        result["framePath"] = frames[0]

    # 4. Extract audio + transcribe
    if extract_audio(video_path, audio_path):
        result["transcript"] = transcribe_audio(audio_path)
    else:
        _log("   ⚠️ Audio extraction failed — transcript will be empty")

    return result


if __name__ == "__main__":
    print("Video Enricher — Dependency Check")
    print(f"  FFmpeg:         {'✅ available' if HAS_FFMPEG else '❌ NOT FOUND'}")
    print(f"  OpenCV:         {'✅ available' if HAS_OPENCV else '❌ NOT FOUND'}")
    print(f"  faster-whisper: {'✅ available' if HAS_WHISPER else '❌ NOT FOUND'}")

    if not HAS_FFMPEG and not HAS_OPENCV:
        print("\n  ⚠️ WARNING: Neither FFmpeg nor OpenCV available!")
        print("     Frames cannot be extracted from videos.")
        print("     Install one: pip install opencv-python-headless")
