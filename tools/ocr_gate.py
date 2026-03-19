"""
tools/ocr_gate.py — Project Antigravity
Stage 1B: Extract first frame via FFmpeg, OCR with Tesseract, check for target keywords.
Cost: ~$0 and ~0.1s per ad. Rejects ~40-60% of non-relevant ads.
"""
import os
import subprocess
import tempfile
from typing import Optional

try:
    import pytesseract
    from PIL import Image
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

# Keywords — must match GUMMY form specifically, not just "creatine"
TARGET_KEYWORDS = ["creatine", "gummies", "gummy", "crealyte", "gummie"]
GUMMY_INDICATORS = ["gummies", "gummy", "gummie", "chew", "chewable", "bear balanced",
                     "crealyte", "creatine gumm"]
EXCLUDE_KEYWORDS = ["protein powder", "pre-workout", "preworkout", "whey", "bcaa",
                     "creatine powder", "creatine capsule", "creatine tablet",
                     "creatine pill", "creatine monohydrate powder"]


def passes_metadata_gate(ad: dict) -> bool:
    """
    Stage 1A: Check ad text metadata for creatine GUMMY keywords.
    "creatine" alone is too broad — must also have gummy-form indicator.
    """
    text = " ".join([
        (ad.get("ad_creative_bodies") or [""])[0] if isinstance(ad.get("ad_creative_bodies"), list) else ad.get("ad_creative_bodies", ""),
        (ad.get("ad_creative_link_captions") or [""])[0] if isinstance(ad.get("ad_creative_link_captions"), list) else ad.get("ad_creative_link_captions", ""),
        (ad.get("ad_creative_link_titles") or [""])[0] if isinstance(ad.get("ad_creative_link_titles"), list) else ad.get("ad_creative_link_titles", ""),
    ]).lower()

    # Also check page_name and link_url
    page_name = (ad.get("page_name") or "").lower()
    link_url = (ad.get("link_url") or ad.get("landing_page_url") or "").lower()
    all_text = f"{text} {page_name} {link_url}"

    has_exclude = any(kw in all_text for kw in EXCLUDE_KEYWORDS)
    if has_exclude:
        return False

    has_gummy = any(kw in all_text for kw in GUMMY_INDICATORS)
    return has_gummy


def ocr_first_frame(video_url: str, fallback_time: float = 2.0) -> str:
    """
    Extract text from first frame of video using FFmpeg + Tesseract.

    Args:
        video_url: URL or local path to video
        fallback_time: If frame 0 fails/low contrast, try this timestamp

    Returns:
        OCR text string (lowercase)
    """
    if not HAS_OCR:
        return ""

    with tempfile.TemporaryDirectory() as tmpdir:
        frame_path = os.path.join(tmpdir, "frame0.png")

        # Try frame at 0s
        result = subprocess.run(
            [
                "ffmpeg", "-i", video_url,
                "-vframes", "1",
                "-q:v", "2",
                "-y", frame_path,
            ],
            capture_output=True,
            timeout=15,
        )

        if result.returncode != 0 or not os.path.exists(frame_path):
            # Fallback: try frame at 2s (handles dark/fade-in intros)
            frame_path = os.path.join(tmpdir, "frame2s.png")
            result = subprocess.run(
                [
                    "ffmpeg", "-i", video_url,
                    "-ss", str(fallback_time),
                    "-vframes", "1",
                    "-q:v", "2",
                    "-y", frame_path,
                ],
                capture_output=True,
                timeout=15,
            )

            if result.returncode != 0 or not os.path.exists(frame_path):
                return ""

        try:
            img = Image.open(frame_path)
            text = pytesseract.image_to_string(img).lower()
            return text
        except Exception as e:
            print(f"⚠️ OCR failed: {e}")
            return ""


def passes_ocr_gate(video_url: str) -> bool:
    """
    Stage 1B: Check if first frame contains target keywords.

    Returns:
        True if any target keyword found in OCR text
    """
    ocr_text = ocr_first_frame(video_url)
    if not ocr_text:
        return False
    return any(kw in ocr_text for kw in TARGET_KEYWORDS)


def stage1_filter(ad: dict, video_url: Optional[str] = None) -> bool:
    """
    Combined Stage 1 gate: Metadata OR OCR.
    Uses OR logic to prevent false negatives.

    Args:
        ad: Raw Meta ad data dict
        video_url: Video URL for OCR check

    Returns:
        True if ad passes Stage 1 (either metadata or OCR)
    """
    metadata_pass = passes_metadata_gate(ad)
    ocr_pass = passes_ocr_gate(video_url) if video_url else False

    return metadata_pass or ocr_pass


if __name__ == "__main__":
    # Test metadata gate
    test_ad = {
        "ad_creative_bodies": ["Try our delicious creatine gummies!"],
        "ad_creative_link_captions": [""],
        "ad_creative_link_titles": ["Creatine Gummies"],
    }
    print(f"Metadata gate test: {passes_metadata_gate(test_ad)}")  # Should be True

    test_ad_exclude = {
        "ad_creative_bodies": ["Best protein powder and pre-workout supplement"],
        "ad_creative_link_captions": [""],
        "ad_creative_link_titles": [""],
    }
    print(f"Exclude test: {passes_metadata_gate(test_ad_exclude)}")  # Should be False
