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
      "Same person, exact likeness. Head-and-shoulders professional portrait, looking at camera. Wardrobe: tailored navy suit jacket, white dress shirt, subtle tie optional. Background: classic neutral gray seamless studio wall, smooth and even. Soft flattering portrait lighting on face, clean separation from background. Single person only, one face. No logos.",
  },
  {
    label: "White seamless · dark blazer",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Same person, exact likeness. Head-and-shoulders, bright professional headshot. Wardrobe: charcoal or black blazer over light shirt, open collar business professional. Background: pure white seamless, high-key clean edge around hair. Even soft lighting, crisp eyes. Single person only. No logos.",
  },
  {
    label: "Charcoal backdrop · business casual",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Same person, exact likeness. Upper chest and shoulders visible. Wardrobe: business casual — oxford shirt, no tie, relaxed but polished. Background: dark charcoal or deep graphite seamless backdrop, subtle rim separation on shoulders. Moody but professional. Single person only. No logos.",
  },
  {
    label: "Outdoor blur · blazer",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Same person, exact likeness. Outdoor-inspired professional portrait with softly blurred trees or park bokeh behind subject; no other people. Wardrobe: navy blazer, light shirt. Natural daylight feel, flattering skin tones. Single person only. No logos.",
  },
  {
    label: "Office bokeh · charcoal suit",
    background_style: "corporate",
    aspect_ratio: { ratio: "4:3" },
    image_size: { width: 1365, height: 1024 },
    prompt:
      "Same person, exact likeness. Corporate headshot with blurred modern office interior behind (glass, soft neutral tones); no screens with faces, no coworkers. Wardrobe: charcoal suit, white shirt. Professional executive look. Single person only. No logos.",
  },
  {
    label: "Light gray · khakis smart casual",
    background_style: "corporate",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Same person, exact likeness. Smart business casual: tucked shirt with belt, optional lightweight sweater or vest; khaki or neutral chinos implied at crop edge. Background: soft light gray seamless. Friendly approachable executive portrait. Single person only. No logos.",
  },
  {
    label: "Navy gradient wall · tie look",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Same person, exact likeness. Traditional corporate headshot. Wardrobe: white shirt with conservative tie, navy or gray suit jacket. Background: subtle navy-to-midnight gradient wall, still clean and minimal. Confident neutral expression. Single person only. No logos.",
  },
  {
    label: "High-key white · black sweater",
    background_style: "clean",
    aspect_ratio: { ratio: "1:1" },
    image_size: { width: 1024, height: 1024 },
    prompt:
      "Same person, exact likeness. Square crop headshot. Wardrobe: fine-gauge black or charcoal crewneck sweater over collared shirt hint — tech / creative professional. Background: bright white or very light gray, airy. Soft wrap lighting. Single person only. No logos.",
  },
  {
    label: "Warm beige studio · tan blazer",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Same person, exact likeness. Warm approachable executive portrait. Wardrobe: tan or camel blazer, cream shirt. Background: warm beige or taupe seamless. Soft golden-neutral light, realistic skin texture. Single person only. No logos.",
  },
  {
    label: "Urban outdoor blur · gray suit",
    background_style: "gradient",
    aspect_ratio: { ratio: "16:9" },
    image_size: { width: 1820, height: 1024 },
    prompt:
      "Same person, exact likeness. Wide composition, head-and-shoulders on thirds. Wardrobe: medium gray suit, white shirt. Background: softly blurred city street or buildings — abstract bokeh only, no readable signs or people. Modern professional. Single person only. No logos.",
  },
  {
    label: "Corner office light · pinstripe",
    background_style: "corporate",
    aspect_ratio: { ratio: "9:16" },
    image_size: { width: 1024, height: 1820 },
    prompt:
      "Same person, exact likeness. Tall portrait framing. Wardrobe: subtle pinstripe or chalk-stripe suit, power-but-classic. Background: bright blurred executive office with window light bokeh; no other faces. Single person only. No logos.",
  },
  {
    label: "Skyline soft blur · dress shirt",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "Same person, exact likeness. Relaxed professional without jacket: crisp white or light blue dress shirt sleeves neatly rolled or cuff visible at crop. Background: very soft out-of-focus skyline or horizon glow — still minimal and not cluttered. Approachable expert vibe. Single person only. No logos.",
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
