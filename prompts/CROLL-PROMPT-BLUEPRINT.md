# C-Roll Prompt Blueprint — Concept / Science Visuals

## Purpose

C-Roll is the **"wow factor" visual** — anatomical scans, cellular energy visualizations, muscle system reveals, and science-forward imagery that establishes credibility and stops the scroll. No speech. Minimal or no product. The CONCEPT is the hero.

---

## C-Roll IMAGE — JSON Schema

```json
{
  "prompt_type": "croll_image",
  "concept": {
    "summary": "REQUIRED. 1-2 sentence high-level vision. What is the viewer seeing?",
    "visual_metaphor": "REQUIRED. The scientific/anatomical concept being visualized (e.g., 'anatomical transparency', 'creatine phosphate saturation', 'cellular energy glow')",
    "hero_element": "REQUIRED. What dominates the frame (e.g., 'skull and facial muscle anatomy', 'full muscular system in luminous green')"
  },
  "subject": {
    "ethnicity": "REQUIRED. Specific (e.g., 'Western male')",
    "age_range": "REQUIRED. (e.g., 'late 20s to early 30s')",
    "build": "REQUIRED. Body type with specifics (e.g., 'athletic mesomorph, 180-185 lbs, 3-4 years gym training')",
    "hair": "REQUIRED. Color, length, texture, style",
    "pose": "REQUIRED. Exact body position and facing direction",
    "expression": "REQUIRED. Exact facial state — what it IS and what it is NOT"
  },
  "anatomy_layers": {
    "coverage_percentage": "REQUIRED. How much of visible skin is replaced by anatomy (e.g., '85-90%')",
    "primary_layer": {
      "name": "REQUIRED. (e.g., 'skull', 'muscular_system')",
      "description": "REQUIRED. Dense anatomical detail — every visible structure named with location and appearance",
      "color_palette": "REQUIRED. Exact colors for this layer (e.g., 'bright white-cyan with slight ivory undertone')"
    },
    "secondary_layer": {
      "name": "REQUIRED. (e.g., 'facial_muscles', 'skeletal_system')",
      "description": "REQUIRED. Every muscle/bone named with fiber direction, attachment points, glow characteristics",
      "color_palette": "REQUIRED. (e.g., 'deep reddish-pink with cyan-green luminous edges')"
    },
    "tertiary_layers": [
      {
        "name": "OPTIONAL. Additional anatomical systems (e.g., 'eye_anatomy', 'neck_structures', 'vascular')",
        "description": "Detailed structure descriptions",
        "color_palette": "Colors for this layer"
      }
    ],
    "ghost_skin_layer": {
      "opacity_range": "REQUIRED. (e.g., '10-15% default, 20-25% at silhouette edges, 5-10% at face center')",
      "visible_features": "What skin features remain faintly visible (e.g., 'hair texture, ear cartilage outline')"
    }
  },
  "product_interaction": {
    "present": "REQUIRED. boolean",
    "product_description": "OPTIONAL. If present: exact gummy/sachet description with color, size, material, finish",
    "hand_description": "OPTIONAL. If present: which hand, grip type, skin treatment (real skin vs anatomy)",
    "placement": "OPTIONAL. Where product meets body (e.g., 'gummy touching lower teeth/lip area')"
  },
  "glow_and_color": {
    "dominant_tone": "REQUIRED. Overall color temperature (e.g., 'cool cyan-teal dominant')",
    "bone_glow": "REQUIRED. (e.g., 'bright white-cyan, self-luminous, brightest element')",
    "muscle_glow": "REQUIRED. (e.g., 'deep reddish-pink with cyan-green luminous edges at attachments')",
    "cartilage_tendon": "REQUIRED. (e.g., 'muted silver-blue')",
    "soft_organ": "REQUIRED. (e.g., 'muted warm pink-grey')",
    "outer_aura": "REQUIRED. Edge bloom effect description (e.g., 'faint cyan aura, 3-5mm bloom around silhouette')",
    "intensity_variation": "OPTIONAL. Where glow is brightest vs dimmest on the body"
  },
  "lighting": {
    "background": "REQUIRED. (e.g., 'dark studio, near black with subtle deep teal gradient')",
    "self_illumination_percentage": "REQUIRED. How much light comes from the anatomy itself (e.g., '80%')",
    "external_lights": "OPTIONAL. Key light, rim light, fill — position and purpose",
    "internal_glow_description": "REQUIRED. How the anatomy lights the figure from within"
  },
  "camera": {
    "format": "REQUIRED. (e.g., 'medium format equivalent')",
    "depth_of_field": "REQUIRED. (e.g., 'shallow, f/2.8')",
    "focus_point": "REQUIRED. Where sharpest focus lands",
    "softness_areas": "OPTIONAL. What goes slightly soft",
    "grain": "REQUIRED. (e.g., 'fine natural film grain')",
    "color_treatment": "REQUIRED. Shadow/midtone/highlight color description",
    "framing": "REQUIRED. What body parts are in frame, crop description",
    "aspect_ratio": "OPTIONAL. (e.g., '4:5', '9:16', '1:1')"
  },
  "what_to_avoid": [
    "REQUIRED. Array of specific exclusions. Minimum 10 items.",
    "Always include: no tattoos, no jewelry, no logos, no perfect symmetry",
    "Always include: no cartoonish anatomy, no sci-fi HUD, no text, no watermarks",
    "Always include medium-specific exclusions (e.g., 'no normal human eyes' for anatomy concept)"
  ]
}
```

### Key Principles — C-Roll Image

1. **Anatomy IS the image.** Real skin is the exception, not the rule. Default state of every pixel = anatomy.
2. **Name every structure.** Don't say "facial muscles visible" — say "temporalis fan-shaped on skull side above ear, masseter thick on jaw angle, fibers stretched due to open mouth."
3. **Specify fiber direction.** Muscles look fake without directional striations. Always describe fiber alignment.
4. **Color must vary by layer.** Bones, muscles, cartilage, organs each get distinct color assignments. Never uniform.
5. **Glow intensity varies.** Brightest at thickest muscle bellies, dimmest at tendons and fascial planes.
6. **Ghost skin creates the uncanny.** The 10-15% opacity skin wash is what makes anatomy look "alive" vs a medical textbook.
7. **If product is present, real-skin hand creates contrast.** The hand holding the gummy is the ONLY area where real skin dominates.

---

## C-Roll VIDEO — JSON Schema

**HARD LIMIT: 2,500 characters when serialized.**

```json
{
  "prompt_type": "croll_video",
  "camera_behavior": "REQUIRED. Always start with camera instruction (e.g., 'Static locked camera, no movement')",
  "background": "REQUIRED. 1 sentence. (e.g., 'Dark cinematic teal-black background')",
  "subject_anatomy": "REQUIRED. Compressed anatomy description — merge all layers into 2-3 dense sentences. Name the most visually important structures only. Skip granular fiber directions.",
  "eye_treatment": "REQUIRED if eyes visible. 1-2 sentences specifying anatomical eyeball rendering. Critical: state they 'remain unchanged throughout'",
  "action_sequence": "REQUIRED. Step-by-step what happens in temporal order. (e.g., '1. Hand places gummy in mouth. 2. Jaw closes. 3. Masseter muscles flex. 4. Chews slowly 2-3 times. 5. Hand lowers.')",
  "movement_constraints": "REQUIRED. What moves and what does NOT move. (e.g., 'Only the jaw moves. Eyeballs stay fully visible and glowing the entire time.')",
  "expression_lock": "REQUIRED. Triple reinforcement. (e.g., 'No expression change, no lip sync, no talking')",
  "technical": "REQUIRED. DOF + self-luminous note. 1 sentence.",
  "anti_ai_cue": "OPTIONAL. Camera/lens anchor if photorealistic style needed"
}
```

### Video Compression Rules

The image prompt for C-Roll anatomy can be 3,000+ words. The video prompt must be ≤ 2,500 characters. Here's how to compress:

| Image Section | Video Treatment |
|---------------|-----------------|
| Full anatomy layer descriptions (500+ words) | Merge into 2-3 sentences naming key structures only |
| Individual muscle names with fiber directions | Keep only the 5-6 most visually prominent muscles |
| Eye anatomy (300+ words) | Compress to 1-2 sentences: "anatomical eyeball spheres, translucent sclera, visible lens, optic nerves" |
| Ghost skin layer details | Skip entirely — the image reference carries this |
| Color palette per layer | 1 sentence: "Glowing cyan-white skull, reddish-pink muscles with cyan-green edges" |
| Camera/lighting (100+ words) | 1 sentence: "Shallow depth of field, self-luminous anatomy glow" |
| What to avoid (100+ words) | Embed as constraints in expression_lock and movement_constraints |

### Key Principles — C-Roll Video

1. **Camera is ALWAYS locked.** C-Roll video = static camera, subject anatomy moves. No pans, no zooms.
2. **One action only.** The video shows ONE thing happening (jaw chewing, arm flexing, breathing). Not a sequence of different actions.
3. **Movement is anatomical.** When the jaw chews, the masseter VISIBLY FLEXES. The movement demonstrates the anatomy, not just the action.
4. **Expression triple-lock.** Always specify three ways the face does NOT change: "No expression change, no lip sync, no talking."
5. **Temporal anchoring.** State what stays constant THROUGHOUT: "The anatomical eyeball spheres stay fully visible and glowing the entire time."
6. **Let the image do the heavy lifting.** If using img2vid, the image reference carries all the static anatomy detail. The video prompt only needs to describe WHAT MOVES and HOW.

---

## Example: Anatomy Head C-Roll (Compressed Video from Full Image)

### Full image prompt: ~2,800 words (Document 1 in reference set)

### Compressed video prompt (497 chars):

```json
{
  "prompt_type": "croll_video",
  "camera_behavior": "Static locked camera, no movement.",
  "background": "Dark cinematic teal-black background.",
  "subject_anatomy": "A Western male's head, face, neck, upper chest rendered as deep anatomical scan. Glowing cyan-white skull fully visible: frontal bone, orbital socket rims, nasal cavity, maxilla, mandible, all teeth. Reddish-pink muscles with cyan-green edges cover the skull: temporalis, masseter, buccinator, orbicularis oris. Cervical spine, tracheal rings, sternocleidomastoid muscles visible on neck.",
  "eye_treatment": "Inside both orbital sockets: two anatomical eyeball spheres, translucent white-blue sclera, blue-green iris muscle rings, visible lens, optic nerves exiting rear. The eyeballs are solid glowing anatomical objects like glass medical models, NOT human skin, they remain unchanged throughout.",
  "action_sequence": "His real-skin right hand places a small pale green gummy into his open mouth. Jaw closes. Masseter muscles flex as he chews slowly 2-3 times. Hand lowers.",
  "movement_constraints": "Only the jaw moves. The anatomical eyeball spheres in the orbital sockets stay fully visible and glowing the entire time.",
  "expression_lock": "No expression change, no lip sync, no talking.",
  "technical": "Shallow depth of field, self-luminous anatomy glow."
}
```
