/** 12 distinct looks: varied backgrounds + clothing for flux img2img prompts. */
export type BackgroundStyle =
  | "professional"
  | "corporate"
  | "clean"
  | "gradient";
/** Legacy fields kept for typing consistency */
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
  background_style: BackgroundStyle;
  aspect_ratio: { ratio: Ratio };
  image_size: ImageSize;
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
  "photo studio equipment visible",
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

export const DEFAULT_NEGATIVE_PROMPT = NEGATIVE_GUARDRAILS;

/** Exactly 12 presets — each differs by background + wardrobe + framing hints. */
const BASE_PRESETS: VariationSpec[] = [
  {
    label: "Gray studio · navy suit",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "MUST WEAR: tailored navy suit jacket with notch lapels, crisp white dress shirt, optional navy silk tie—clearly visible suit fabric and collar, not a t-shirt. Head-and-shoulders, looking at camera. Background: classic neutral gray seamless studio wall, smooth and even. Soft flattering portrait light. No logos.",
  },
  {
    label: "White seamless · dark blazer",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "MUST WEAR: charcoal or black structured blazer over a light blue or white dress shirt, top button open—blazer lapels and shirt collar clearly visible, not a tee. Head-and-shoulders, bright professional headshot. Background: pure white seamless, high-key. Even soft lighting, crisp eyes. No logos.",
  },
  {
    label: "Charcoal backdrop · business casual",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "MUST WEAR: tucked light oxford or chambray dress shirt, no tie, leather belt visible at waist if in frame—woven shirt texture, not knit tee. Upper chest and shoulders. Background: dark charcoal seamless, subtle rim on shoulders. Moody professional. No logos.",
  },
  {
    label: "Outdoor blur · blazer",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "MUST WEAR: navy blue blazer over white or pale blue dress shirt, blazer fully buttoned or one button—clear jacket weave, not a hoodie. Outdoor-inspired portrait; softly blurred trees or park bokeh, no other people. Natural daylight look. No logos.",
  },
  {
    label: "Office bokeh · charcoal suit",
    background_style: "corporate",
    aspect_ratio: { ratio: "4:3" },
    image_size: { width: 1365, height: 1024 },
    prompt:
      "MUST WEAR: charcoal two-piece suit, white spread-collar dress shirt, no tie—suit jacket lapels and shirt placket visible. Corporate headshot. Background: blurred modern office (glass, neutrals); no screens with faces. Executive look. No logos.",
  },
  {
    label: "Light gray · khakis smart casual",
    background_style: "corporate",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "MUST WEAR: tucked white or pale gray dress shirt, brown leather belt, optional thin v-neck sweater in heather gray—khaki chinos visible at lower crop if shown. Smart business casual. Background: soft light gray seamless. Friendly executive portrait. No logos.",
  },
  {
    label: "Navy gradient wall · tie look",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "MUST WEAR: navy or charcoal suit jacket, crisp white shirt, conservative silk tie in burgundy or navy—tie knot and jacket lapels clearly visible. Traditional corporate headshot. Background: subtle navy-to-midnight gradient wall. Confident neutral expression. No logos.",
  },
  {
    label: "High-key white · black sweater",
    background_style: "clean",
    aspect_ratio: { ratio: "1:1" },
    image_size: { width: 1024, height: 1024 },
    prompt:
      "MUST WEAR: fine-gauge black or charcoal crewneck sweater with white dress shirt collar and cuffs peeking out—knit texture obvious, layered look, not a plain tee. Square crop headshot. Background: bright white or very light gray. Soft wrap light. No logos.",
  },
  {
    label: "Warm beige studio · tan blazer",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "MUST WEAR: tan or camel hair blazer over cream or ivory dress shirt, no tie—blazer texture and shirt collar visible. Warm approachable executive portrait. Background: warm beige or taupe seamless. Soft golden-neutral light. No logos.",
  },
  {
    label: "Urban outdoor blur · gray suit",
    background_style: "gradient",
    aspect_ratio: { ratio: "16:9" },
    image_size: { width: 1820, height: 1024 },
    prompt:
      "MUST WEAR: medium gray suit, white dress shirt, optional pocket square—suit fabric and lapels clearly rendered. Wide head-and-shoulders composition. Background: softly blurred city bokeh, no signs or people. Modern professional. No logos.",
  },
  {
    label: "Corner office light · pinstripe",
    background_style: "corporate",
    aspect_ratio: { ratio: "9:16" },
    image_size: { width: 1024, height: 1820 },
    prompt:
      "MUST WEAR: navy pinstripe or chalk-stripe suit, white shirt, silk tie—stripe pattern subtle but visible on jacket. Tall portrait framing. Background: bright blurred executive office, window bokeh; no other faces. No logos.",
  },
  {
    label: "Skyline soft blur · dress shirt",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "MUST WEAR: no jacket—crisp white or light blue dress shirt only, sleeves neatly rolled once or twice showing cuff placket, top button may be open—woven shirt only, not a t-shirt. Relaxed professional. Background: very soft skyline glow blur, minimal. No logos.",
  },
];

export function buildVariationList(count: number): VariationSpec[] {
  const out: VariationSpec[] = [];
  for (let i = 0; i < count; i++) {
    const base = BASE_PRESETS[i % BASE_PRESETS.length];
    out.push({
      background_style: base.background_style,
      aspect_ratio: base.aspect_ratio,
      image_size: base.image_size,
      prompt: base.prompt,
      label: `${base.label} (#${i + 1})`,
    });
  }
  return out;
}
