# FusiForce AI Prompt Generation Framework v1.0

## Taxonomy

Every ad creative prompt falls into one of three **roll types**, each with an **image** and **video** variant.

| Roll | Purpose | Camera | Product | Talent Speech |
|------|---------|--------|---------|---------------|
| **C-Roll** | Concept / Science Visual | Locked, no movement | None or minimal | None |
| **B-Roll** | Character + Product Interaction | Handheld or locked | Hero element | None (silent) |
| **A-Roll** | Talking Head / Hero Shot | Handheld UGC feel | Visible, branded | Lip-sync voiceover |

---

## Output Format Rules

### Image Prompts → JSON

All image prompts MUST be output as a single JSON object. This produces more consistent results across generation models (Midjourney, Flux, Kling image mode, etc.) because structured keys eliminate ambiguity.

### Video Prompts → JSON

All video prompts MUST be output as a single JSON object with a **hard ceiling of 2,500 characters** for the final serialized string. Video models (Kling, Runway, Pika) have context limits — exceeding 2,500 chars causes truncation and detail loss in the tail end of the prompt.

**Compression strategy for video:**
1. Merge anatomy/detail sections into single dense sentences
2. Prioritize ACTION and MOVEMENT over static description
3. Lock expression/behavior with triple-reinforcement (3 synonymous constraints)
4. End with anti-AI rendering cue (camera model + lens)
5. Cut any detail the model can infer from the image reference

---

## Shared Principles (All Roll Types)

### Skin Realism Hierarchy
```
Level 1 (A-Roll): Pores, acne, blemishes, stretch marks, ashiness, razor bumps
Level 2 (B-Roll): Pores, oil sheen, hyperpigmentation, knuckle texture
Level 3 (C-Roll): Ghost-skin only (10-15% opacity over anatomy)
```

### Expression Control
- Always specify what the face IS doing AND what it is NOT doing
- Video: triple-lock expressions ("neutral, stone-faced, no mouth movement")
- Never leave expression unspecified — models default to slight smile

### Product Accuracy Checklist
- Exact color (pale sage green, not bright green)
- Exact size (1.5cm diameter gummy, 5x7cm sachet)
- Exact material finish (soft matte, slightly translucent)
- Exact branding text (Wellness Nest, FusiForce, Creatine Monohydrate Gummies)
- Grip method (which fingers, which hand)

### Anti-AI Rendering Cues
Append to end of video prompts to force photorealism:
- `"Shot on Sony A7IV, 85mm lens, natural color grading"`
- `"Shot on iPhone 15 Pro, portrait mode, f/1.8"`
- `"1600 ISO grain. No color grade. Unfiltered."`

### Universal Negative Constraints
Always include in WHAT_TO_AVOID:
- No tattoos, no jewelry (unless specified), no logos (unless branded product)
- No perfect symmetry, no cartoonish rendering
- No watermarks, no text overlays, no HUD elements
- No AI-smooth skin (specify per roll type)

---

## Blueprint Files

| File | Covers |
|------|--------|
| `CROLL-PROMPT-BLUEPRINT.md` | C-Roll image + video (concept/anatomy/science visuals) |
| `BROLL-PROMPT-BLUEPRINT.md` | B-Roll image + video (character + product interaction) |
| `AROLL-PROMPT-BLUEPRINT.md` | A-Roll image + video (talking head / hero / lip-sync) |

---

## How to Use These Blueprints

When generating a prompt:

1. **Identify the roll type** from the creative brief or script
2. **Open the matching blueprint** file
3. **Fill the JSON schema** — every REQUIRED field must be present
4. **For video**: serialize to string, verify ≤ 2,500 characters, compress if over
5. **Validate** against the WHAT_TO_AVOID checklist in the blueprint
6. **Append anti-AI cue** for video prompts
