"""
tools/prescreen.py — Project Antigravity
Stage 2: Claude Haiku binary relevance filter.
Cost: ~$0.0002 per call. Runs BEFORE Claude Sonnet ($0.03/call).
"""
import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


def passes_ai_prescreen(transcript: str, brand: str) -> bool:
    """
    Uses Claude Haiku for binary relevance check.
    "Is this ad specifically promoting CREATINE in GUMMY form?"

    Args:
        transcript: Whisper transcription of the ad
        brand: Brand name

    Returns:
        True if ad is relevant (creatine gummy ad)
    """
    if not ANTHROPIC_API_KEY:
        print("❌ ANTHROPIC_API_KEY not set. Skipping pre-screen (assuming relevant).")
        return True

    if not transcript or len(transcript.strip()) < 10:
        print(f"⚠️ Transcript too short for {brand}. Passing through to manual review.")
        return True  # Don't reject on empty transcript — might be visual-only ad

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=5,
            messages=[{
                "role": "user",
                "content": (
                    f'Video ad transcript from brand "{brand}":\n\n'
                    f'"{transcript[:800]}"\n\n'
                    "Is this ad specifically promoting CREATINE in GUMMY form "
                    "(not powder, not capsules, not other supplements)?\n"
                    "Answer ONLY: Yes or No"
                ),
            }],
        )

        answer = response.content[0].text.strip().lower()
        is_relevant = answer.startswith("yes")

        if not is_relevant:
            print(f"   ✗ Pre-screen rejected: {brand} — Haiku said '{answer}'")
        else:
            print(f"   ✓ Pre-screen passed: {brand}")

        return is_relevant

    except Exception as e:
        print(f"⚠️ Haiku pre-screen error: {e}. Assuming relevant.")
        return True  # Fail open — don't reject on API error


if __name__ == "__main__":
    # Test
    test_transcript = (
        "I've been taking these creatine gummies for the past three months and "
        "I can't believe the difference. Each gummy has a full dose of creatine "
        "monohydrate and they taste like sour cherry candy."
    )
    print(f"Test pre-screen (should pass): {passes_ai_prescreen(test_transcript, 'TestBrand')}")

    test_protein = (
        "This new protein powder has changed my morning routine. I mix one scoop "
        "with almond milk and it's the best tasting whey protein I've ever had."
    )
    print(f"Test pre-screen (should fail): {passes_ai_prescreen(test_protein, 'ProteinBrand')}")
