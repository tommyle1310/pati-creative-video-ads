# A-Roll Prompt Blueprint — Talking Head / Hero Shot / Lip-Sync

## Purpose

A-Roll is the **"trust anchor"** — a real-looking person holding the product, looking at camera, and speaking directly to the viewer. This is the primary persuasion layer. The CHARACTER is the hero. The product is visible proof. The voiceover is the conversion driver.

---

## A-Roll IMAGE — JSON Schema

```json
{
  "prompt_type": "aroll_image",
  "opening_tag": "REQUIRED. Realism anchor phrase. Always start with 'Hyperrealistic photography' or 'Photorealistic UGC-style photograph'. This primes the model away from illustration/CGI.",
  "subject": {
    "demographic": "REQUIRED. Age, gender, build in one phrase (e.g., 'young athletic male early 20s')",
    "face": {
      "structure": "REQUIRED. Bone structure specifics (e.g., 'sharp jawline')",
      "eyes": "REQUIRED. Exact color (e.g., 'light blue-grey eyes')",
      "skin_imperfections": "REQUIRED. Minimum 3 specific blemishes (e.g., 'real acne blemishes and freckles on cheeks and nose'). This is the single most important UGC realism marker.",
      "expression": "REQUIRED. Exact micro-expression with muscle-level detail (e.g., 'subtle smug smirk, left corner of mouth slightly raised, quiet confident expression')"
    },
    "hair": "REQUIRED. Color, length, texture, styling, any headwear (e.g., 'short dark brown hair spiked under black knit headband')",
    "outfit": {
      "top": "REQUIRED. Exact garment, color, fit (e.g., 'black fitted sleeveless tank top')",
      "accessories": "REQUIRED. Every accessory listed (e.g., 'silver cross chain necklace, dark blue fitness tracker left wrist'). Explicit 'no headphones' if relevant.",
      "bottom": "OPTIONAL. Only if visible"
    }
  },
  "pose": {
    "body_position": "REQUIRED. Exact posture with surface interaction (e.g., 'body leaning back casually against closed car trunk, shoulders and lower back resting on car surface')",
    "leg_position": "REQUIRED. (e.g., 'legs slightly extended forward')",
    "energy": "REQUIRED. 1 phrase capturing the vibe (e.g., 'relaxed post-gym energy')",
    "anti_pattern": "REQUIRED. What the pose is NOT (e.g., 'NOT standing straight. Slouched confident lean.')"
  },
  "hands_and_product": {
    "overall_action": "REQUIRED. What the hands are doing together (e.g., 'both hands at chest-to-waist height holding open neon green zip pouch')",
    "dominant_hand": {
      "action": "REQUIRED. Exact action (e.g., 'right hand reaching inside pouch pulling out small white single-serve sachet')",
      "product_state": "REQUIRED. (e.g., 'sachet partially out, fingertips gripping it')"
    },
    "support_hand": {
      "action": "REQUIRED. (e.g., 'left hand holding pouch open steady')"
    },
    "motion_descriptor": "REQUIRED. Natural comparison (e.g., 'natural casual motion, like grabbing a snack')"
  },
  "product_detail": {
    "primary_product": {
      "name": "REQUIRED.",
      "color_material": "REQUIRED. (e.g., 'bright lime green matte zip bag')",
      "branding_text": "REQUIRED. Exact text visible (e.g., 'Wellness Nest Creatine Monohydrate Gummies white text visible on front')",
      "orientation": "REQUIRED. (e.g., 'slightly angled')"
    },
    "secondary_product": {
      "name": "OPTIONAL. (e.g., 'small white single-serve sachet')",
      "branding_text": "OPTIONAL. Exact text (e.g., 'Wellness Nest dark logo, FusiForce Creatine Monohydrate Gummies 4 Gummies text, light green watermark graphic')",
      "readability": "OPTIONAL. (e.g., 'sachet crisp and readable')"
    }
  },
  "background": {
    "setting": "REQUIRED. Specific location (e.g., 'night parking lot, dark blue-black sky')",
    "key_elements": "REQUIRED. 3-5 specific background objects with placement (e.g., 'closed dark SUV sedan subject leaning on trunk, red LED taillights glowing on either side')",
    "background_blur": "REQUIRED. What's out of focus (e.g., 'gym storefront neon signs background left out of focus, wet asphalt, other parked cars background right')"
  },
  "lighting": {
    "primary_source": "REQUIRED. Named practical light with color cast (e.g., 'hard red taillight practicals, warm red-pink cast on both arms, chest and hands')",
    "secondary_source": "REQUIRED. (e.g., 'cool ambient parking lot light from above catching headband and shoulder tops')",
    "shadow_description": "REQUIRED. (e.g., 'deep natural shadows on torso center')",
    "skin_light_interaction": "REQUIRED. (e.g., 'real skin texture, acne visible. Zero smoothing.')"
  },
  "camera": {
    "lens": "REQUIRED. Focal length + aperture (e.g., '35mm f/1.8')",
    "angle": "REQUIRED. (e.g., 'eye-level slight low angle')",
    "aspect_ratio": "REQUIRED. (e.g., 'vertical 4:5')",
    "grain": "REQUIRED. (e.g., 'natural film grain, no preset')"
  },
  "negative_prompt": [
    "REQUIRED. Array of specific exclusions for this exact scene.",
    "Scene-specific: (e.g., 'no open trunk, no reaching into trunk, no standing away from car')",
    "Lighting: (e.g., 'no studio light, no daytime')",
    "Skin: (e.g., 'no smooth skin, no full smile')",
    "Product: (e.g., 'no white packaging only, no floating product')"
  ]
}
```

### Key Principles — A-Roll Image

1. **"Hyperrealistic photography" opens every prompt.** This is the single most effective anti-AI-look phrase. It primes all downstream rendering toward photorealism.
2. **Acne, freckles, blemishes are MANDATORY.** A-Roll characters must look like real people. Specify at least 3 skin imperfections by name and location.
3. **Expression is micro-level.** Don't say "smiling" — say "left corner of mouth slightly raised, quiet confident expression." Micro-expressions create believability.
4. **Background tells the story.** A-Roll backgrounds are specific locations that establish lifestyle context (gym parking lot = fitness lifestyle, kitchen = daily routine). Name 3-5 specific objects.
5. **Practical lighting only.** A-Roll lighting comes from objects IN the scene (taillights, street lamps, window). Never studio lighting. Name the practical and its color cast.
6. **Pose communicates attitude.** "Slouched confident lean" is a character trait, not just a body position. Always pair physical position with energy descriptor.
7. **Product branding must be readable.** The product IS the CTA. Specify exact text, orientation, and readability requirement.
8. **Negative prompt is scene-specific.** Generic negatives ("no tattoos") plus scene-specific negatives ("no open trunk, no daytime"). The scene-specific ones prevent the most common model misinterpretations.

---

## A-Roll VIDEO — JSON Schema

**HARD LIMIT: 2,500 characters when serialized.**

```json
{
  "prompt_type": "aroll_video",
  "format": "REQUIRED. (e.g., 'Photorealistic UGC smartphone video. 9:16. 8 seconds.')",
  "voice": "REQUIRED. Voice ID or reference (e.g., 'Use Mike's voice.')",
  "setting": "REQUIRED. 2-3 sentences. Match image reference setting, name key lighting practicals. (e.g., 'Night gym parking lot as reference. Black car boot behind subject, red tail lights glowing low, distant strip mall neon signs.')",
  "subject": "REQUIRED. 2-3 sentences. Outfit, accessories, skin consistency instruction. (e.g., 'Same person as reference. Black tank top, black headband, silver cross necklace, blue smartwatch. Freckles, acne texture, natural skin consistent every frame. No smoothing.')",
  "action": "REQUIRED. 3-5 sentences. Frame-by-frame choreography of what happens. Include product handling, body language, and the ONE gesture that punctuates the script. (e.g., 'Standing relaxed leaning against car. Holds pouch naturally toward camera throughout. Mid-clip gives pouch one small casual shake toward camera on link's below like showing a friend something.')",
  "expression": "REQUIRED. 2-3 sentences. Emotional quality + what it looks like physically + what it does NOT look like. (e.g., 'Genuine relaxed smile throughout. Real teeth, real creased eyes. Not a sales smile. Easy grin of someone sharing a tip with a friend.')",
  "camera": "REQUIRED. 1-2 sentences. Angle, stabilization, light interaction. (e.g., 'Handheld slight angle matching reference. Natural micro-wobble. Not stabilized. Red tail light catching skin unevenly.')",
  "lip_sync": "REQUIRED. 1-2 sentences. Jaw behavior, speech register, sync quality. (e.g., 'Restrained natural jaw. Small mouth opens only over the smile. Casual easy speech register. Tight sync every syllable throughout.')",
  "voiceover": "REQUIRED. The EXACT script enclosed in clear delimiters. This text is NEVER modified by the AI. (e.g., '137,000 people. 4.9 stars. Nearly 13,000 verified reviews...')",
  "technical": "REQUIRED. 1 sentence. ISO, color grade, filter status. (e.g., '1600 ISO grain. No color grade. Unfiltered. Mixed red tail light and distant street lamp only.')"
}
```

### A-Roll Video Structure Rules

1. **Voiceover is SACRED.** The `voiceover` field is enclosed in delimiters and marked DO NOT CHANGE. The AI generating the prompt must NEVER modify, rephrase, or paraphrase the voiceover script.

2. **One punctuating gesture per clip.** Each 8-second A-Roll clip gets exactly ONE physical gesture that aligns with a key script moment:
   - "link's below" → casual pouch shake toward camera
   - "the actual gummy" → holds up single gummy
   - "doesn't work, you don't pay" → shrug or palm-up gesture
   
3. **Expression sustains, not changes.** The expression is set at frame 1 and holds. Don't describe expression arcs ("starts neutral then smiles"). Describe the sustained state.

4. **Lip-sync gets its own field.** Jaw behavior and speech register are mechanical instructions for the lipsync model. Separate them from expression (emotion) to prevent conflicts.

5. **"Same person as reference" anchors consistency.** When generating img2vid, the first instruction is ALWAYS to match the reference image character. Follow with 3-4 outfit/accessory confirmations.

### Video Compression Rules (A-Roll Specific)

| Image Section | Video Treatment |
|---------------|-----------------|
| Face structure (jawline, eyes, etc.) | Skip entirely — reference image carries this |
| Skin imperfections list | "Freckles, acne texture, natural skin consistent every frame. No smoothing." |
| Pose + body position (100+ words) | 1 sentence: "Standing relaxed leaning against car" |
| Background objects (100+ words) | 2 sentences: name setting + 2-3 key practicals |
| Lighting (primary + secondary + shadows) | Merge into setting or technical: "mixed red tail light and distant street lamp only" |
| Product branding text | "Holds green Wellness Nest Creatine Gummies pouch, label facing forward and readable" |
| Negative prompt (100+ words) | Embed as expression constraints and action limits |

---

## Example: Parking Lot A-Roll (Video)

### Compressed video prompt (1,580 chars):

```json
{
  "prompt_type": "aroll_video",
  "format": "Photorealistic UGC smartphone video. 9:16. 8 seconds.",
  "voice": "Use Mike's voice.",
  "setting": "Night gym parking lot as reference. Black car boot behind subject, red tail lights glowing low, distant strip mall neon signs and parking lot street lamps in background. Real night mixed light only. No studio source.",
  "subject": "Same person as reference. Black tank top, black headband, silver cross necklace, blue smartwatch. Holding green Wellness Nest Creatine Monohydrate Gummies pouch in both hands at chest height, label facing forward and readable. White sachet tucked behind pouch, partially visible. Freckles, acne texture, natural skin consistent every frame. No smoothing.",
  "action": "Standing relaxed leaning slightly back against car. Holds pouch naturally toward camera throughout, not stiff, weight shifting easy between both feet. Mid-clip gives the pouch one small casual shake toward camera on 'link's below' like showing a friend something he's genuinely stoked about. No big gestures. Just a guy who found something that works.",
  "expression": "Genuine relaxed smile throughout. Real teeth, real creased eyes. Not a sales smile. Easy grin of someone sharing a tip with a friend. Eyes bright, occasionally glancing down at pouch then back to camera naturally.",
  "camera": "Handheld slight angle matching reference. Natural micro-wobble. Not stabilized. Red tail light and street lamp catching skin unevenly, authentic mixed night light.",
  "lip_sync": "Restrained natural jaw. Small mouth opens only over the smile. Casual easy speech register. Tight sync every syllable throughout.",
  "voiceover": "137,000 people. 4.9 stars. Nearly 13,000 verified reviews. Link's below. 90-day money back, even on an empty pouch. Doesn't work, you don't pay. Simple.",
  "technical": "1600 ISO grain. No color grade. Unfiltered. Mixed red tail light and distant street lamp only."
}
```

---

## A-Roll Variant: Trunk Pull A-Roll

Different opening action (pulling product from gym bag) but same structure:

```json
{
  "prompt_type": "aroll_video",
  "format": "Photorealistic UGC smartphone video. 9:16. 8 seconds.",
  "voice": "Use Mike's voice.",
  "setting": "Night gym parking lot as reference. Black SUV trunk open, red tail lights casting warm red glow on subject from below right. Distant strip mall signage and parking lot street lamps in background. Real night air, dark sky. No studio light.",
  "subject": "Same person as reference. Black tank top, black headband, silver cross necklace, blue smartwatch. Freckles, acne texture, natural skin consistent throughout. No smoothing. Same face same hair same skin every frame.",
  "action": "Clip opens with him leaning into trunk, right hand already reaching into gym bag. Pulls out green Wellness Nest Creatine Gummies pouch in first two seconds, label facing forward and readable. Left hand holds trunk lid. Once pouch is out he holds it up casually at chest height toward camera while continuing to talk. Not presenting it, just holding it the way someone naturally does when showing something they actually use. Relaxed. Unrehearsed.",
  "expression": "Casual confidence. Low-key satisfied. Not selling, just telling. Eyes on camera with easy directness.",
  "camera": "Handheld bystander angle, slightly side-on matching reference. Natural micro-wobble. Not stabilized. Red tail light glow catches skin and arm unevenly, authentic.",
  "lip_sync": "Restrained natural jaw. Small mouth opens only. Casual speech register. Tight sync every syllable throughout.",
  "voiceover": "That's why I use FusiForce. Only gummies I've found that test after manufacturing. Full five grams confirmed in the finished product. Not the powder like other brands out there. The actual gummy. For real.",
  "technical": "1600 ISO grain. No color grade. Unfiltered. Mixed red tail light and distant street lamp only."
}
```
