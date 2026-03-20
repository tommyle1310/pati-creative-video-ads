# B-Roll Prompt Blueprint — Character + Product Interaction

## Purpose

B-Roll is the **"product in real life" visual** — a real-looking person naturally interacting with the product in a believable setting. No speech. The PRODUCT INTERACTION is the hero moment. The character sells authenticity; the product sells the brand.

---

## B-Roll IMAGE — JSON Schema

```json
{
  "prompt_type": "broll_image",
  "concept": {
    "summary": "REQUIRED. 1-2 sentences describing the exact moment being captured. Include the emotional/tonal vibe.",
    "narrative_fit": "OPTIONAL. Which script line or story beat this image supports (e.g., 'the best part is how easy it is')",
    "format": "REQUIRED. Aspect ratio and context (e.g., '9:16 vertical, social media thumbnail / video still')"
  },
  "subject": {
    "ethnicity": "REQUIRED. Specific.",
    "age_range": "REQUIRED.",
    "gender": "REQUIRED.",
    "face_details": {
      "unique_features": "REQUIRED. 3-5 specific distinguishing traits (e.g., 'broader nose, fuller lips, strong brow ridge, high cheekbones'). Never generic.",
      "facial_hair": "REQUIRED. Exact state (e.g., 'clean-shaven or very light shadow on jaw')",
      "expression": "REQUIRED. What the face IS doing AND is NOT doing. (e.g., 'completely neutral, mouth closed, relaxed. NOT smiling, NOT flexing intentionally.')",
      "eye_direction": "REQUIRED. Where exactly the eyes are looking (e.g., 'looking DOWN at his right hand watching the gummies land')",
      "head_angle": "REQUIRED. Tilt, rotation in degrees (e.g., 'chin slightly tilted down, head turned 10-15 degrees right')"
    },
    "hair": {
      "style": "REQUIRED. Extremely specific — not just 'dreadlocks' but 'medium-length freeform dreadlocks, NOT neat loc extensions, NOT braids'",
      "texture": "REQUIRED. (e.g., 'slightly irregular thickness, some thicker than others, visible frizz and loose hairs at roots')",
      "color": "REQUIRED.",
      "length": "REQUIRED. Reference points (e.g., 'roughly to the ears or just past')",
      "anti_pattern": "REQUIRED. What the hair is NOT (e.g., 'NOT perfectly maintained salon locs. Real, lived-in freeform dreads with character.')"
    },
    "skin": {
      "tone": "REQUIRED. Specific shade (e.g., 'deep rich dark brown')",
      "texture_requirements": [
        "REQUIRED. Array of at least 5 specific realism markers.",
        "Examples: 'visible pores on nose/forehead/cheeks', 'natural oil sheen on forehead and nose bridge'",
        "'slight razor bumps on neck/jawline', 'faint hyperpigmentation spots'",
        "'visible stretch marks on inner biceps and anterior deltoid'",
        "'slight ashiness on knuckles and elbows'"
      ],
      "anti_smoothing": "REQUIRED. Explicit ban on AI skin. (e.g., 'NO smooth airbrush. NO beauty filter. NO even skin tone correction. NO AI perfection.')"
    },
    "physique": {
      "build_descriptor": "REQUIRED. Specific body type with weight/height equivalent (e.g., 'offseason powerlifter-bodybuilder hybrid: 240-260 lbs at 5'10-6'0')",
      "key_visual_traits": "REQUIRED. 3-5 physique details that sell the build (e.g., 'massive rounded deltoids, thick neck wider than jaw, traps visibly rising from collar, forearms thick with visible veins')"
    }
  },
  "clothing": {
    "top": "REQUIRED. Exact garment with color, fit, and how it interacts with the physique (e.g., 'fitted plain crew neck t-shirt in dark navy, sleeves riding up on massive upper arms, collar slightly stretched')",
    "bottom": "OPTIONAL. Only if visible in frame",
    "accessories": "REQUIRED. Explicitly state 'none' if no accessories. (e.g., 'No jewelry. No watch. No headphones. No hat. No sunglasses.')"
  },
  "hands_and_product": {
    "left_hand": {
      "position": "REQUIRED. Spatial description (e.g., 'upper position, at chest height')",
      "action": "REQUIRED. Exact grip and what it's doing",
      "grip_detail": "REQUIRED. Which specific fingers are touching, which are NOT. (e.g., 'pinched between ONLY index finger and thumb. Middle, ring, pinky relaxed and curled away, NOT touching the pack.')",
      "product_in_hand": "OPTIONAL. What the hand holds — see product section"
    },
    "right_hand": {
      "position": "REQUIRED. Spatial description",
      "action": "REQUIRED.",
      "grip_detail": "REQUIRED.",
      "product_in_hand": "OPTIONAL."
    },
    "hand_skin_detail": "REQUIRED. (e.g., 'veins visible on back of hand and wrist, natural skin creases in palm, large thick-fingered hand')"
  },
  "product": {
    "primary_item": {
      "name": "REQUIRED. (e.g., 'FusiForce sachet')",
      "size": "REQUIRED. Exact dimensions + size comparison (e.g., '5cm wide by 7cm tall, roughly the size of a ketchup packet')",
      "material_finish": "REQUIRED. (e.g., 'white matte sachet with green accent design')",
      "branding_visible": "REQUIRED. Exact text that should be readable",
      "condition": "REQUIRED. (e.g., 'slightly crinkled and bent from being torn open at the top, tear line visible')",
      "orientation": "REQUIRED. Angle, tilt, which direction opening faces"
    },
    "gummies": {
      "count": "REQUIRED. Exact number and where each one is",
      "per_gummy_description": "REQUIRED. Color, finish, shape, size (e.g., 'pale sage green, soft matte surface, slightly translucent, perfectly round ball, ~1.5cm diameter')",
      "positions": [
        {
          "label": "REQUIRED. (e.g., 'gummy_1_exiting_pack')",
          "location": "REQUIRED. Exact spatial position",
          "state": "REQUIRED. (e.g., 'barely exiting pack opening, still touching pack lip')",
          "motion_blur": "OPTIONAL. For mid-air gummies (e.g., '1-2px directional blur downward')"
        }
      ],
      "anti_pattern": "REQUIRED. (e.g., 'NOT glossy. NOT wet. Matte with subtle surface texture.')"
    }
  },
  "setting": {
    "location": "REQUIRED. Specific but generic (e.g., 'home kitchen counter or home gym area')",
    "focus_treatment": "REQUIRED. (e.g., 'slightly out of focus')",
    "props": "OPTIONAL. Background objects (e.g., 'blurred plant in corner, blurred countertop')",
    "anti_pattern": "REQUIRED. What it is NOT (e.g., 'NOT a commercial studio. NOT a gym. Real lived-in home space.')"
  },
  "lighting": {
    "source": "REQUIRED. Primary light source and direction (e.g., 'natural indoor lighting from window to the left')",
    "color_temperature": "REQUIRED. (e.g., 'warm daylight')",
    "quality": "REQUIRED. (e.g., 'soft, not harsh')",
    "shadows": "REQUIRED. Where shadows fall",
    "product_light": "REQUIRED. How light interacts with the product/gummies",
    "anti_pattern": "REQUIRED. (e.g., 'NOT studio lit. NOT ring-light flat. Real residential ambient light.')"
  },
  "camera": {
    "device": "REQUIRED. (e.g., 'iPhone 15 Pro or similar smartphone')",
    "lens_characteristics": "REQUIRED. Wide-angle distortion, bokeh quality",
    "depth_of_field": "REQUIRED. What's sharp, what's soft (e.g., 'face and hands sharp, background softly blurred, portrait mode f/1.8')",
    "grain_noise": "REQUIRED. (e.g., 'natural phone camera grain and noise in shadow areas')",
    "color_grading": "REQUIRED. (e.g., 'warm, slightly desaturated, natural. NOT color-corrected.')",
    "aspect_ratio": "REQUIRED. (e.g., '9:16 vertical')",
    "framing": "REQUIRED. What's in frame, composition flow (e.g., 'top of head to just below right hand at waist. Vertical composition creates top-to-bottom flow: tiny pack top-left to mid-air gummy center to catching hand bottom-right.')"
  },
  "what_to_avoid": [
    "REQUIRED. Minimum 15 specific exclusions.",
    "Character: no tattoos, no jewelry, no branded clothing except product, no sunglasses, no hat",
    "Expression: no flexing pose, no gym mirror selfie energy, no dramatic expression, no smile, no eye contact with camera",
    "Technical: no perfect studio lighting, no AI-smooth skin, no competition-ready shredded physique",
    "Product: no extra gummies beyond count specified, pack must be SMALL not large pouch, grip must match spec exactly"
  ]
}
```

### Key Principles — B-Roll Image

1. **The product interaction tells the story.** The moment is "this takes zero effort" or "this fits my routine." The action must be specific enough to communicate that message.
2. **Skin imperfections are NON-NEGOTIABLE.** Every B-Roll image must have 5+ specific skin realism markers. AI-smooth skin kills UGC believability instantly.
3. **Hands are the hardest part.** Specify EVERY finger's state — which fingers grip, which curl away, exact pinch point. AI models default to awkward hand poses without extreme specificity.
4. **Product size contrast.** When a massive hand holds a tiny sachet, the size contrast IS the visual story. Always specify product dimensions AND a comparison object.
5. **Each gummy gets its own description.** Don't say "gummies falling." Say "Gummy 1: barely exiting pack, touching lip. Gummy 2: mid-air, motion blur. Gummy 3-4: resting in palm, overlapping."
6. **Expression = anti-selling.** B-Roll characters look unbothered, casual, almost bored. The visual message: "this is so easy I barely notice I'm doing it."
7. **Hair specificity kills AI-default.** Don't say "dreadlocks" — say "medium-length freeform dreadlocks, NOT neat salon locs, irregular thickness, visible frizz at roots."

---

## B-Roll VIDEO — JSON Schema

**HARD LIMIT: 2,500 characters when serialized.**

```json
{
  "prompt_type": "broll_video",
  "subject_description": "REQUIRED. 1 sentence: build, hair, clothing. (e.g., 'Muscular Black man with long dreadlocks wearing navy blue t-shirt standing in bright warm kitchen.')",
  "action": "REQUIRED. 2-3 sentences describing the FULL action sequence in temporal order. Be specific about which hand does what, direction of movement, what falls/pours/lands where.",
  "physical_micro_detail": "REQUIRED. 1-2 sentences describing a subtle physical behavior that adds realism (e.g., 'hands have a visible strong tremor from muscular build, gummies in palm jiggle from hand vibration'). Frame physical traits as PHYSICAL, not emotional, to prevent model from adding reactions.",
  "expression_lock": "REQUIRED. Triple reinforcement with exact constraints. (e.g., 'neutral blank expression, no smile, no reaction, no mouth movement, completely stone-faced the entire time')",
  "secondary_motion": "REQUIRED. What else moves naturally besides the main action (e.g., 'dreadlocks hang naturally, swaying only from subtle body micro-movements')",
  "lighting_setting": "REQUIRED. 1-2 sentences. Light source, color temp, background blur.",
  "camera_feel": "REQUIRED. 1 sentence describing handheld quality, DOF, focus point.",
  "negative_behaviors": "REQUIRED. What the subject does NOT do. (e.g., 'does not speak, does not breathe heavily, does not change expression, does not look up')",
  "skin_realism": "REQUIRED. 1 sentence. (e.g., 'Natural skin texture, no smoothing, no glow, no filters.')",
  "anti_ai_cue": "REQUIRED. Camera + lens anchor. (e.g., 'Photorealistic, shot on Sony A7IV, 85mm lens, natural color grading.')"
}
```

### Video Compression Rules (B-Roll Specific)

| Image Section | Video Treatment |
|---------------|-----------------|
| Face details (unique features, 200+ words) | 1 sentence if face visible, or skip if face not hero |
| Skin realism (5+ markers, 100+ words) | "Natural skin texture, no smoothing, no glow, no filters." |
| Hair (style + texture + anti-pattern, 100+ words) | Merge into subject description: "with long dreadlocks" |
| Individual finger grip detail (100+ words) | Simplify to hand + object: "tilts packet, pouring gummies into open palm" |
| Per-gummy positions (150+ words) | "2-3 gummies fall from packet, tumbling through air, landing in cupped palm" |
| Setting details (100+ words) | 1 sentence with key props: "bright warm kitchen, wooden counter, green plants" |
| What to avoid (150+ words) | Embed as expression_lock + negative_behaviors |

### Key Principles — B-Roll Video

1. **Physical traits, not emotions.** If you want trembling hands, frame it as "strong tremor from muscular build" not "nervous shaking." Models interpret emotional cues and add facial reactions.
2. **Expression is triple-locked.** Repeat the expression constraint 3 ways: "neutral blank expression" + "no smile, no reaction" + "completely stone-faced the entire time."
3. **One primary action, one secondary motion.** Primary: pouring gummies. Secondary: hair swaying from micro-movements. No third action.
4. **Camera model at the end.** "Shot on Sony A7IV, 85mm lens" is the strongest anti-AI cue for Kling. It forces photorealistic rendering and suppresses the CGI look.
5. **Negative behavior list.** Always end with 4-5 things the subject does NOT do. This prevents model hallucination of unwanted actions.
6. **Keep setting to 1-2 sentences.** The image reference (if img2vid) carries the setting. Video prompt only needs to name the vibe.

---

## Example: Product Pour B-Roll (Compressed Video)

### Compressed video prompt (1,247 chars):

```json
{
  "prompt_type": "broll_video",
  "subject_description": "Muscular Black man with long dreadlocks wearing navy blue t-shirt standing in bright warm kitchen.",
  "action": "He tilts a white and green supplement packet downward with his right hand, pouring small pale green gummies into his open left palm below. 2-3 gummies fall from the packet opening, tumbling through the air and landing in his cupped palm where several gummies already sit.",
  "physical_micro_detail": "His hands have a visible strong tremor, shaking firmly because of his muscular build, the gummies in his palm jiggle and shift slightly from the hand vibration.",
  "expression_lock": "His face looks straight down at his hands with a neutral blank expression, no smile, no reaction, no mouth movement, completely stone-faced the entire time.",
  "secondary_motion": "His dreadlocks hang naturally, swaying only from subtle body micro-movements.",
  "lighting_setting": "Warm natural window light from the left, soft bokeh background of kitchen interior with wooden counter and green plants.",
  "camera_feel": "Shallow depth of field focused on the packet and hands. Realistic handheld camera feel with very subtle organic micro-shake.",
  "negative_behaviors": "The man does not speak, does not breathe heavily, does not change expression, does not look up. Only action is pouring and the natural hand tremor.",
  "skin_realism": "Natural skin texture, no smoothing, no glow, no filters.",
  "anti_ai_cue": "Photorealistic, shot on Sony A7IV, 85mm lens, natural color grading."
}
```
