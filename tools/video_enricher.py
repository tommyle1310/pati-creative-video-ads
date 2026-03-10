"""
tools/video_enricher.py — Project Antigravity
Download video, extract audio, transcribe with faster-whisper (local, free).
"""
import os
import subprocess
import requests
from typing import Optional


def download_video(url: str, output_path: str, timeout: int = 30) -> bool:
    """
    Download video from URL to local path.

    Args:
        url: Video CDN URL
        output_path: Local file path to save
        timeout: Download timeout in seconds

    Returns:
        True if download succeeded
    """
    try:
        response = requests.get(url, stream=True, timeout=timeout)
        response.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"❌ Video download failed: {e}")
        return False


def extract_audio(video_path: str, audio_path: str) -> bool:
    """
    Extract audio from video using FFmpeg.

    Args:
        video_path: Path to video file
        audio_path: Path to save audio file (.wav)

    Returns:
        True if extraction succeeded
    """
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-i", video_path,
                "-vn", "-acodec", "pcm_s16le",
                "-ar", "16000",  # 16kHz for Whisper
                "-ac", "1",     # mono
                "-y", audio_path,
            ],
            capture_output=True,
            timeout=30,
        )
        return result.returncode == 0 and os.path.exists(audio_path)
    except Exception as e:
        print(f"❌ Audio extraction failed: {e}")
        return False


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using FFprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_path,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def get_video_format(video_path: str) -> str:
    """Detect video aspect ratio."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=p=0",
                video_path,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        parts = result.stdout.strip().split(",")
        if len(parts) == 2:
            w, h = int(parts[0]), int(parts[1])
            ratio = w / h
            if abs(ratio - 9/16) < 0.1:
                return "9:16"
            elif abs(ratio - 1.0) < 0.1:
                return "1:1"
            elif abs(ratio - 16/9) < 0.1:
                return "16:9"
            elif abs(ratio - 4/5) < 0.1:
                return "4:5"
        return "unknown"
    except Exception:
        return "unknown"


def transcribe_audio(audio_path: str, model_size: str = "base") -> str:
    """
    Transcribe audio using faster-whisper (local, free — no API key needed).

    Args:
        audio_path: Path to audio file
        model_size: Whisper model size — "tiny", "base", "small", "medium", "large-v3"
                    "base" is a good balance of speed vs accuracy for ad transcripts.

    Returns:
        Transcription text
    """
    try:
        from faster_whisper import WhisperModel

        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, info = model.transcribe(audio_path, beam_size=5)

        transcript_parts = []
        for segment in segments:
            transcript_parts.append(segment.text.strip())

        transcript = " ".join(transcript_parts)
        print(f"   🎤 Transcribed {info.duration:.1f}s audio ({info.language}, {info.language_probability:.0%} confidence)")
        return transcript

    except ImportError:
        print("❌ faster-whisper not installed. Run: pip install faster-whisper")
        return ""
    except Exception as e:
        print(f"❌ Whisper transcription failed: {e}")
        return ""


def extract_first_frame(video_path: str, output_path: str) -> bool:
    """Extract first frame of video as PNG."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-i", video_path, "-vframes", "1", "-q:v", "2", "-y", output_path],
            capture_output=True,
            timeout=15,
        )
        return result.returncode == 0 and os.path.exists(output_path)
    except Exception:
        return False


def enrich_video(
    video_url: str,
    job_dir: str,
) -> dict:
    """
    Full video enrichment pipeline:
    1. Download video
    2. Extract audio
    3. Extract first frame
    4. Transcribe with faster-whisper (local)
    5. Get duration and format

    Args:
        video_url: CDN URL of the video
        job_dir: Directory to store intermediate files

    Returns:
        dict with transcript, paths, duration, format
    """
    os.makedirs(job_dir, exist_ok=True)

    video_path = os.path.join(job_dir, "video.mp4")
    audio_path = os.path.join(job_dir, "audio.wav")
    frame_path = os.path.join(job_dir, "frame_0s.png")

    result = {
        "transcript": "",
        "videoPath": video_path,
        "audioPath": audio_path,
        "framePath": frame_path,
        "durationSeconds": 0,
        "videoFormat": "unknown",
    }

    # 1. Download
    if not download_video(video_url, video_path):
        print(f"⚠️ Could not download video from {video_url}")
        return result

    # 2. Get metadata
    result["durationSeconds"] = get_video_duration(video_path)
    result["videoFormat"] = get_video_format(video_path)

    # 3. Extract audio
    if extract_audio(video_path, audio_path):
        # 4. Transcribe (local — no API key needed)
        result["transcript"] = transcribe_audio(audio_path)
    else:
        print("⚠️ No audio track found — transcript will be empty")

    # 5. Extract first frame
    extract_first_frame(video_path, frame_path)

    return result


if __name__ == "__main__":
    print("Video Enricher ready.")
    print("  Whisper: faster-whisper (local, free)")
    print(f"  FFmpeg: ", end="")
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        print("available")
    except Exception:
        print("NOT FOUND")
