"""
tools/test_excel_builder.py — Project Antigravity
Test script using the exact CREATE Wellness sample record provided by the user.
Generates test_output.xlsx to verify Excel formatting before any API integration.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from excel_builder import build_excel

# ── Sample Record: CREATE Wellness (US) ──────────────────────────────────────
# This is the exact sample from the user's specification.

SAMPLE_RECORDS = [
    {
        "brand": "Create Wellness",
        "market": "US",
        "foreplayUrl": "https://app.foreplay.co/share/ads/gKOjAxdxI3E7FfSAJm9k?user=laouBj6GAuTVnu0gyMNk54SIAh23",
        "landingPageUrl": "https://trycreate.co/pages/all-products-women-sub-only",
        "hook": (
            'Type: Curiosity Gap + Pattern-Interrupt Visual Hook (Compound Strategy) — '
            'She enters mid-sentence with both hands raised, wet hair, zero makeup, green hoodie. '
            'No product, no brand, no title. At ~5s a single small red gummy appears between two '
            'fingers — not the jar, just one gummy against a green hoodie (colour contrast = '
            'involuntary attention pull). '
            'Why it stops the scroll: The brain detects a story already in progress and feels '
            'compelled to catch up. The gummy without context is a micro-mystery. Combined with '
            'her wide-eyed urgency, the viewer\'s first question is "What IS that?" — and they '
            'have to stay to find out.'
        ),
        "concept": (
            'Big Idea: "The Trusted Friend\'s Discovery — Creatine Is Not Just for Gym Bros Anymore." '
            'The entire creative architecture is a feminisation and normalisation of creatine delivered '
            'through the highest-trust DTC channel: a peer recommendation from a relatable woman in a '
            'home setting. Secondary angles: Convenience Revolution (no powder/shaker), Multi-Benefit '
            '(4 benefits on label: Build Lean Muscle + Energy + Recovery + Cognition), Taste as Proof '
            '(Sour Cherry / Sour Peach names signal deliciousness before a word is spoken about flavour).'
        ),
        "scriptBreakdown": (
            'Framework: Hybrid Discovery Testimonial + PAS + Delayed Product Reveal Architecture. '
            'Narrative arc: (1) Discovery Opening (0–10s) — Urgent, personal, mid-thought entry. No intro. '
            '(2) Agitation / Stakes (10–25s) — Wide-eyed shock face signals a "you won\'t believe this" stat '
            '(likely the 46% of women who don\'t know about creatine, or underdosed gummies). '
            '(3) Education Bridge (25–40s) — Smiles, excited fists — transitioning from problem to promise. '
            '(4) Product Reveal (45–65s) — CREATE jar emerges. The 45-second delay is the key conversion '
            'architecture decision. By the time the product appears, the viewer is emotionally invested. '
            '(5) Features Parade (65–80s) — Both flavours shown, label benefits readable. '
            '(6) CTA (80–95s) — Opens jar on camera (authenticity peak), then points both hands directly at viewer.'
        ),
        "visual": (
            'A-Roll: Female presenter, late 20s, brunette, nose piercing, wedding band, dark green athletic '
            'zip-up hoodie. Home kitchen with dark green cabinetry. Handheld camera, slightly low angle. '
            'Hair appears wet — signals genuine, unplanned, post-life moment. Emotional arc: urgency → shock '
            '(wide eyes, 10s) → excitement (fists, 25s) → warm explanation → enthusiasm with product → CTA point. '
            'B-Roll: Single loose gummy at 5s (micro product tease). Full CREATE jar appears at ~45s '
            '(Sour Cherry, red/white). At ~60s she holds BOTH jars simultaneously — Sour Peach raised high. '
            'At ~85s she opens the jar on camera. Label clearly legible multiple times: "Build Lean Muscle / '
            'Increases Energy / Optimal Recovery / Boosts Cognition / 90 Gummies." '
            'C-Roll: NONE. Zero text overlays, zero lab certs, zero reviews on screen. This is a calculated '
            'bet — trust is 100% person-based.'
        ),
        "psychology": (
            'Primary audience: Women 25–38 who are creatine-curious but creatine-sceptical. '
            'Cognitive biases triggered: (1) Curiosity Gap — 45-second product delay creates open information '
            'loop that forces watch completion. (2) Permission Paradox — a petite, healthy, relatable woman '
            'saying "I take this" removes every objection women have to creatine in a single visual. '
            '(3) Para-Social Social Proof — UGC format means the viewer doesn\'t see an ad; they see a trusted '
            'contact sharing a discovery. (4) Effortless Result Bias — "just 3 gummies" = maximum reward for '
            'minimal behaviour change. (5) Loss Aversion (soft) — "I\'ve been taking this" framing implies '
            'you\'ve been missing out every day you haven\'t. (6) Novelty-Familiarity Fusion — gummies = '
            'familiar/safe, creatine = performance benefit, combined = low psychological barrier to trial. '
            'US Market resonance: The post-"Gummygate" (2024 NOW Foods testing scandal) environment means US '
            'buyers want trust. This ad delivers pure personal trust rather than technical trust — a different '
            'but effective path.'
        ),
        "cta": (
            'Verbal direct-to-viewer gesture CTA — no text overlay, no hard offer shown. At ~90s she puts down '
            'the product and points both hands directly at camera. Likely verbally delivers a personalised '
            'discount code + "link in my bio." No urgency timer, no BOGO, no countdown — consistent with the '
            'soft-sell emotional strategy. The absence of a hard offer is the CTA mechanism: purchasing feels '
            'like the viewer\'s own idea, not a response to pressure.'
        ),
        "keyTakeaways": (
            '✅ STEAL: The 45-second delayed product reveal — apply to FusiForce to maximise watch time and '
            'emotional buy-in before the pouch appears.\n\n'
            '✅ STEAL: Female presenter for female audience — FusiForce TA-B (Informed Fitness Woman) is '
            'underserved. Key script: "5g full dose — not the underdosed pink-label scam brands."\n\n'
            '✅ STEAL: Home setting (kitchen/desk) over gym — FusiForce pouches are lifestyle supplements, '
            'not just gym supplements.\n\n'
            '✅ STEAL: Dual flavour lineup shot (both products in frame simultaneously).\n\n'
            '🔨 KAIZEN: No C-Roll = the biggest vulnerability. FusiForce must add a 2–3s COA flash: '
            '"We test AFTER the gummies are made. Not just the raw powder."\n\n'
            '🔨 KAIZEN: No text overlays = audio-dependent. 85% of social video watched on mute. Add key supers: '
            '"5g Full Dose", "Tested AFTER Cooking", "ISO 17025 Certified."\n\n'
            '🔨 KAIZEN: No hard guarantee. FusiForce\'s 90-Day MBG (even if empty) is a nuclear conversion weapon. '
            'Add to CTA frame.\n\n'
            '🚀 UPGRADE: FusiForce wins on all 3 dimensions CREATE cannot match — Verified Purity, Clinical Dosing, '
            'AND Convenience. The FusiForce version of this ad is MORE trustworthy AND equally relatable.'
        ),
        "productionFormula": (
            '🎬 FUSIFORCE PRODUCTION FORMULA — CREATE Format Adaptation\n'
            'FORMAT: 9:16 vertical · 60–95s · Handheld UGC · Home setting (kitchen/living room) · No tripod · No makeup required\n\n'
            'PHASE 01 — HOOK (0–5s)\n'
            'Start mid-sentence, camera already rolling. Hold one FusiForce pouch between fingers at ~4s.\n'
            '📝 "Did you know 46% of creatine gummies were lab-tested and found to have zero creatine? I looked into it — and I found one that actually proves what\'s in it."\n'
            '🖥 TEXT SUPER: "46% of creatine gummies = 0 creatine — lab tested"\n\n'
            'PHASE 02 — AGITATE (5–25s)\n'
            'Wide eyes, pointing gesture at viewer, count problems on fingers. Pouch stays in hand.\n'
            '📝 "I used to take [COMPETITOR FORMAT]. When I found out what was actually in them — or NOT in them — I was genuinely angry. I\'d been spending money for months on basically nothing."\n'
            '🖥 TEXT SUPER: "NOW Labs 2024: 46% failed label claims"\n\n'
            'PHASE 03 — REVEAL (25–45s)\n'
            'Smile + energy shift at 25s. Raise individual FusiForce pouch slowly into frame at ~40s, both sides to camera.\n'
            '📝 "So I found FusiForce. What\'s different — they test AFTER the gummies are made, not just the raw powder. ISO 17025-certified lab."\n'
            '🖥 TEXT SUPER: "Tested AFTER Manufacturing · ISO 17025"\n\n'
            'PHASE 04 — TRUST (45–80s)\n'
            'Hold pouch label toward camera 3–4s. Optional: 2s phone screen of COA document. Hold 2 pouches simultaneously (variety shot).\n'
            '📝 "Full 5 gram dose — the clinical standard. Individual pouches so I actually take it every day, not a jar I forget at home. And they publish both lab reports on the product page so you can check yourself."\n'
            '🖥 TEXT SUPERS: "5g Full Dose · Clinical Standard" / "4.9 Stars · 137K+ Customers"\n\n'
            'PHASE 05 — CTA (80–95s)\n'
            'Open pouch on camera, pull out one gummy. Both hands point at viewer. Abrupt cut — no outro, no logo.\n'
            '📝 "90-day money-back guarantee — even if the pouch is empty. So there\'s literally no risk. Link below, use [CODE] for [X]% off."\n'
            '🖥 TEXT SUPERS (MANDATORY): "90-Day Guarantee — Even If Empty" / "[CODE] = [X]% Off"'
        ),
        "adScore": 8.2,
        "longevityDays": 95,
        "hookType": "Curiosity Gap + Pattern-Interrupt Visual Hook",
        "primaryAngle": "The Trusted Friend's Discovery",
        "frameworkName": "Hybrid Discovery Testimonial + PAS + Delayed Product Reveal",
        "adLibraryId": "sample-001",
        "adLibraryUrl": "https://www.facebook.com/ads/library/?id=sample001",
        "region": "US",
        "keyword": "creatine gummies",
        "status": "active",
        "crawledAt": "2026-03-10T00:00:00Z",
        "durationSeconds": 95,
        "videoFormat": "9:16",
    },
    # Second sample record (shorter) to show alternating row formatting
    {
        "brand": "Swoly Creatine",
        "market": "US",
        "foreplayUrl": "https://app.foreplay.co/share/ads/example2",
        "landingPageUrl": "https://swolycreatine.com/gummies",
        "hook": (
            "Type: Authority Shock — Opens with a lab coat figure holding a jar of competitor gummies, "
            "then SMASHES it on a table. Text overlay: '46% HAVE ZERO CREATINE.' "
            "Why it stops the scroll: Destruction + authority figure + stat = triple pattern interrupt."
        ),
        "concept": (
            'Big Idea: "Lab-Tested Superiority — We Published Our COA, They Didn\'t." '
            "The architecture is pure evidential advertising. Every second of the ad presents "
            "verifiable proof rather than emotional claims. Secondary angles: Science-First Branding, "
            "Transparent Dosing (5g visible on label), Third-Party Certification."
        ),
        "scriptBreakdown": (
            "Framework: Problem-Agitate-Solution (PAS) with Evidence Stacking. "
            "Beats: (1) Problem (0–8s) — Lab smash + stat. (2) Agitate (8–20s) — 'Your current brand "
            "won't show you their lab results.' (3) Solution (20–35s) — Swoly jar with COA document. "
            "(4) Proof (35–50s) — Close-up of lab report, 5g confirmed. (5) CTA (50–60s) — 'Scan QR for our full report.'"
        ),
        "visual": (
            "A-Roll: Male, 30s, lab coat, clean studio setting (white bg). Controlled movements. "
            "B-Roll: Competitor jar smash (practical FX), Swoly jar hero shot, lab report close-up, "
            "QR code frame. C-Roll: Text supers throughout — '5g CONFIRMED', 'ISO 17025', '3rd Party Tested'."
        ),
        "psychology": (
            "Primary audience: Men 28–45, evidence-driven buyers. Biases: (1) Authority Bias — lab coat = "
            "instant credibility. (2) Contrast Effect — destroyed competitor vs pristine Swoly jar. "
            "(3) Transparency Reciprocity — showing COA feels like a gift, triggers reciprocal purchase intent."
        ),
        "cta": (
            "QR code + verbal: 'Scan this to see our actual lab results. Use code SWOLY20 for 20% off.' "
            "Hard offer + transparency mechanism combined."
        ),
        "keyTakeaways": (
            "✅ STEAL: Lab report on camera — FusiForce should show COA in every ad. Build a reusable 3s COA B-Roll clip.\n\n"
            "✅ STEAL: QR code CTA — drives traffic AND signals confidence.\n\n"
            "🔨 KAIZEN: Too clinical — no emotional connection. FusiForce ads need warmth alongside evidence.\n\n"
            "🔨 KAIZEN: Male-only targeting — Swoly ignores 50% of the market. FusiForce should run parallel female-targeted cuts.\n\n"
            "🚀 UPGRADE: FusiForce combines the warmth of CREATE's UGC with the evidence of Swoly's lab approach. No competitor does both."
        ),
        "productionFormula": (
            "🎬 FUSIFORCE PRODUCTION FORMULA — Swoly Format Adaptation\n"
            "FORMAT: 9:16 vertical · 55–65s · Studio + UGC hybrid · Lab coat optional\n\n"
            "PHASE 01 — HOOK (0–5s)\n"
            "Open with FusiForce pouch next to a stack of competitor jars. Push competitors aside.\n"
            "📝 'You know what's in your creatine gummies? I checked — and it's probably not creatine.'\n"
            "🖥 TEXT SUPER: '46% of gummies tested = 0 creatine'\n\n"
            "PHASE 02 — AGITATE (5–20s)\n"
            "Hold phone showing competitor label claims vs actual lab results.\n"
            "📝 'Most brands test the raw powder before cooking. What's left after? Nobody checks. Except us.'\n"
            "🖥 TEXT SUPER: 'Tested BEFORE vs AFTER — big difference'\n\n"
            "PHASE 03 — REVEAL (20–35s)\n"
            "Transition from competitor critique to FusiForce reveal. Warm smile.\n"
            "📝 'FusiForce tests after manufacturing. Full 5g dose confirmed by ISO 17025 lab.'\n"
            "🖥 TEXT SUPER: '5g Confirmed · ISO 17025 Certified'\n\n"
            "PHASE 04 — TRUST (35–50s)\n"
            "Show COA document, then eat a gummy on camera. Show both flavour pouches.\n"
            "📝 'Both lab reports are on the product page. You can verify yourself. Also — these actually taste good.'\n"
            "🖥 TEXT SUPER: '4.9 Stars · 137K+ Happy Customers'\n\n"
            "PHASE 05 — CTA (50–60s)\n"
            "Point at camera, pouch in hand.\n"
            "📝 '90-day guarantee, even if the pouch is empty. Link below.'\n"
            "🖥 TEXT SUPER: '90-Day MBG — Even If Empty · [CODE] = [X]% Off'"
        ),
        "adScore": 6.5,
        "longevityDays": 52,
        "hookType": "Authority Shock",
        "primaryAngle": "Lab-Tested Superiority",
        "frameworkName": "Problem-Agitate-Solution (PAS) with Evidence Stacking",
        "adLibraryId": "sample-002",
        "adLibraryUrl": "https://www.facebook.com/ads/library/?id=sample002",
        "region": "US",
        "keyword": "creatine gummies",
        "status": "active",
        "crawledAt": "2026-03-10T00:00:00Z",
        "durationSeconds": 60,
        "videoFormat": "9:16",
    },
]


def main():
    output_path = os.path.join(os.path.dirname(__file__), "..", "test_output.xlsx")
    output_path = os.path.abspath(output_path)

    print(f"Building test Excel with {len(SAMPLE_RECORDS)} sample records...")
    build_excel(SAMPLE_RECORDS, output_path)
    print(f"\n📊 Open this file to verify formatting:")
    print(f"   {output_path}")
    print(f"\n🔍 Verify:")
    print(f"   ✓ 4 tabs: 📋 / 🎬 / ⚡ / 📖")
    print(f"   ✓ Dark navy title bars with white text")
    print(f"   ✓ Midnight blue column headers")
    print(f"   ✓ Alternating row fills (white / light grey)")
    print(f"   ✓ Hyperlinks in AD LINK and LANDING PAGE columns")
    print(f"   ✓ Freeze panes (scroll right, columns A-C stay visible)")
    print(f"   ✓ Grid lines hidden")
    print(f"   ✓ Tab 2: Hook Type + Big Idea extracted into separate columns")
    print(f"   ✓ Tab 3: STEAL / KAIZEN / UPGRADE parsed into separate columns")
    print(f"   ✓ Tab 4: Legend with section headers (light blue bg)")


if __name__ == "__main__":
    main()
