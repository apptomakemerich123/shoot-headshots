/** 10 distinct looks: prompt-controlled headshot variations. */
export type Ratio = "1:1" | "3:4" | "9:16" | "4:3" | "16:9";

export type ImageSize =
  | { width: number; height: number }
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9";

export type VariationSpec = {
  label: string;
  /** Controls output dimensions for the edit model. */
  image_size: ImageSize;
  /** Variation-specific scene + background + lighting direction. */
  prompt: string;
};

const NEGATIVE_GUARDRAILS = [
  "studio lights",
  "softbox",
  "light stand",
  "ring light",
  "reflector",
  "tripod",
  "camera",
  "lens",
  "boom mic",
  "c-stand",
  "rigging",
  "equipment in background",
  "photo studio",
  "backdrop stand",
  "multiple people",
  "two people",
  "group",
  "crowd",
  "extra face",
  "multiple faces",
  "duplicate head",
  "reflection",
  "mirror",
  "painting of a face",
  "poster of a face",
  "collage",
  "split face",
  "deformed face",
  "distorted features",
  "low quality",
  "blurry",
].join(", ");

/**
 * Shared guardrails used for all variations.
 *
 * We keep this in the spec so the API call can pass it as `negative_prompt`
 * without duplicating strings across the codebase.
 */
export const DEFAULT_NEGATIVE_PROMPT = NEGATIVE_GUARDRAILS;

/** 10 distinct looks: backgrounds + framing (headshot / square / wide / tall). */
const BASE_PRESETS: VariationSpec[] = [
  {
    label: "Bright studio · soft key",
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Edit this into a clean professional headshot of the SAME person. Preserve identity and facial features precisely (same face shape, eyes, eyebrows, nose, lips, skin tone, hairstyle, hairline). Single adult person only, one face only. Head-and-shoulders framing, looking at camera, natural skin texture, sharp eyes, realistic proportions. Background: solid warm white or very light beige seamless background, smooth and clean. Lighting: soft flattering key light look with gentle falloff; no visible studio gear. Clothing: keep the original outfit unless it is inappropriate; otherwise keep it simple and professional. No text, no logos.",
  },
  {
    label: "Neutral grey · balanced",
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Create a corporate-style headshot of the SAME person with high facial similarity. Single adult person only, one face only, centered, head-and-shoulders, looking at camera. Background: solid neutral medium grey (smooth, even). Lighting: balanced natural look, even exposure, subtle shadow under jawline, no harsh contrast. Keep hairstyle consistent and realistic. No text, no logos.",
  },
  {
    label: "High-key clean · crisp",
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Transform into a high-key, crisp professional headshot of the SAME person. Preserve facial features exactly; do not change age, gender, ethnicity, or distinctive marks. Single person only, one face only. Background: pure solid white (#FFFFFF) with clean separation around hair; no gradients, no props. Lighting: bright and clean, minimal shadows, natural skin detail (not plastic). No text, no logos.",
  },
  {
    label: "Ambient gradient · depth",
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Edit into a modern professional headshot of the SAME person with strong identity preservation. Single person only, one face only, head-and-shoulders, looking at camera. Background: subtle studio-style gradient wall (deep navy to charcoal, very soft blur), clean and uncluttered. Lighting: gentle dimensional lighting with soft shadow, natural catchlights, realistic skin texture. No text, no logos.",
  },
  {
    label: "Studio · square crop",
    image_size: { width: 1024, height: 1024 },
    prompt:
      "Create a square-crop professional headshot of the SAME person. Single adult person only, one face only, centered composition, head-and-shoulders. Background: solid muted blue-grey seamless, smooth and clean. Lighting: soft and even, natural color, no harsh shadows. Keep facial features and hairstyle closely matching the reference. No text, no logos.",
  },
  {
    label: "Soft wrap light · portrait",
    image_size: { width: 1024, height: 1820 },
    prompt:
      "Create a tall portrait professional photo of the SAME person with very high facial similarity. Single person only, one face only. Composition: upper torso visible, relaxed shoulders, looking at camera. Background: blurred modern office interior (bokeh), neutral colors, no people, no screens showing faces, no posters. Lighting: soft wrap-around natural window-light look. No text, no logos.",
  },
  {
    label: "Even fill · environmental",
    image_size: { width: 1365, height: 1024 },
    prompt:
      "Edit into an environmental professional headshot of the SAME person. Single person only, one face only. Composition: head-and-shoulders with slight environment context. Background: clean outdoor setting with soft blurred greenery (park) or urban background blur; no other people; no signs with faces. Lighting: evenly lit, natural daylight, flattering and realistic. Preserve facial features and hairstyle faithfully. No text, no logos.",
  },
  {
    label: "Rim-lit feel · wide",
    image_size: { width: 1820, height: 1024 },
    prompt:
      "Create a wide-format professional portrait of the SAME person. Single person only, one face only. Composition: subject on rule-of-thirds, head-and-shoulders, looking at camera. Background: clean blurred office or solid dark charcoal with subtle gradient; uncluttered. Lighting: subtle rim-light feel for separation (no visible equipment), natural skin texture, realistic shadows. Keep identity and facial features closely matched. No text, no logos.",
  },
  {
    label: "Corporate headshot · classic",
    image_size: { width: 1024, height: 1024 },
    prompt:
      "Make a classic corporate headshot of the SAME person with strict identity preservation. Single adult person only, one face only, centered, head-and-shoulders, looking at camera, neutral professional expression. Background: solid light grey-blue, smooth and clean. Lighting: classic soft portrait lighting, even exposure, no dramatic effects. No text, no logos.",
  },
  {
    label: "Minimal edge light · tall",
    image_size: { width: 1024, height: 1820 },
    prompt:
      "Create a tall minimal professional portrait of the SAME person. Single person only, one face only. Background: solid pale cool grey or blurred office wall, clean and uncluttered. Lighting: minimal edge light for separation, otherwise soft and natural. Preserve facial features closely; avoid beautification that changes face shape. No text, no logos.",
  },
];

export function buildVariationList(count: number): VariationSpec[] {
  const out: VariationSpec[] = [];
  for (let i = 0; i < count; i++) {
    const base = BASE_PRESETS[i % BASE_PRESETS.length];
    out.push({
      image_size: base.image_size,
      prompt: base.prompt,
      label: `${base.label} (#${i + 1})`,
    });
  }
  return out;
}
