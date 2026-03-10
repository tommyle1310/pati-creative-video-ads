# SOP 06 — Claude Analysis

## Goal
Generate full 9-field AdRecord analysis using Claude Sonnet.

## Input
- Video transcript (from Whisper)
- First frame (base64 encoded)
- Ad metadata (brand, region, keyword, landing page)
- Your brand context (FusiForce / Wellness Nest)

## Prompt Structure
System: "You are a forensic ad analyst for FusiForce..."
User: Transcript + metadata + "Analyse this ad across 8 fields..."

## Required Output Fields (8)
1. **hook**: Named TYPE + execution + "Why it stops the scroll"
2. **concept**: Big Idea sentence + strategic architecture + secondary angles
3. **scriptBreakdown**: Named framework + numbered beats with timecodes
4. **visual**: A-Roll + B-Roll + C-Roll with timecodes
5. **psychology**: Named biases + execution + market resonance
6. **cta**: Mechanism + offer + landing page job
7. **keyTakeaways**: ≥2 ✅ STEAL + ≥2 🔨 KAIZEN + 1 🚀 UPGRADE
8. **productionFormula**: FORMAT + 5 phases, each with direction + 📝 voiceover + 🖥 TEXT SUPER

## Quality Gates
- Every field must be a rich paragraph, not a bullet list
- keyTakeaways must reference FusiForce specifically
- productionFormula must be a ready-to-shoot brief
- If any field is empty → status = "partial", exclude from Excel
