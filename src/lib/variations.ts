/** 12 distinct looks: varied backgrounds + clothing. Copy is gender-neutral ("person"); FAL flux-pulid has no gender API field. */
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
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a tailored navy suit jacket with notch lapels, crisp white dress shirt, optional navy silk tie. The person is dressed ONLY in this suit—wearing this outfit, not the reference shirt. Replace all clothing with: navy suit, white shirt, visible lapels and woven suit fabric. SECONDARY — pose: head-and-shoulders, looking at camera. BACKGROUND: classic neutral gray seamless studio wall, smooth and even; soft flattering portrait light. No logos.",
  },
  {
    label: "White seamless · dark blazer",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a charcoal or black structured blazer over a light blue or white dress shirt, top button open. The person is dressed ONLY in this blazer and shirt—wearing this outfit; replace all clothing with blazer layers, not a tee or hoodie. SECONDARY — pose: head-and-shoulders, bright professional headshot. BACKGROUND: pure white seamless, high-key; even soft lighting. No logos.",
  },
  {
    label: "Charcoal backdrop · business casual",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a tucked light oxford or chambray dress shirt, no tie, leather belt at waist if in frame. The person is dressed ONLY in this woven business shirt—replace all clothing with dress-shirt fabric, not a knit t-shirt. SECONDARY — framing: upper chest and shoulders. BACKGROUND: dark charcoal seamless, subtle rim on shoulders; moody professional. No logos.",
  },
  {
    label: "Outdoor blur · blazer",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a navy blue blazer over white or pale blue dress shirt, blazer buttoned or one button open. The person is wearing ONLY this blazer ensemble—replace all clothing with jacket weave and collar, not a hoodie or tee. SECONDARY — setting: outdoor-inspired portrait. BACKGROUND: softly blurred trees or park bokeh, no other people; natural daylight look. No logos.",
  },
  {
    label: "Office bokeh · charcoal suit",
    background_style: "corporate",
    aspect_ratio: { ratio: "4:3" },
    image_size: { width: 1365, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a charcoal two-piece suit and white spread-collar dress shirt, no tie. The person is dressed ONLY in this suit—wearing charcoal suit and shirt; replace all clothing with suit lapels and placket visible. SECONDARY — pose: corporate headshot. BACKGROUND: blurred modern office (glass, neutrals); no screens with faces. Executive look. No logos.",
  },
  {
    label: "Light gray · khakis smart casual",
    background_style: "corporate",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with tucked white or pale gray dress shirt, brown leather belt, optional thin heather gray v-neck sweater, khaki chinos if lower frame visible. The person is wearing ONLY this smart-casual outfit—replace all clothing with belt, shirt, and chinos, not the reference top. SECONDARY — tone: friendly executive portrait. BACKGROUND: soft light gray seamless. No logos.",
  },
  {
    label: "Navy gradient wall · tie look",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with navy or charcoal suit jacket, crisp white shirt, conservative silk tie in burgundy or navy. The person is dressed ONLY in suit, shirt, and tie—wearing this formal outfit; replace all clothing with tie knot and jacket lapels clearly visible. SECONDARY — expression: confident neutral. BACKGROUND: subtle navy-to-midnight gradient wall. Traditional corporate headshot. No logos.",
  },
  {
    label: "High-key white · black sweater",
    background_style: "clean",
    aspect_ratio: { ratio: "1:1" },
    image_size: { width: 1024, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a fine-gauge black or charcoal crewneck sweater layered over a white dress shirt with collar and cuffs peeking out. The person is wearing ONLY this sweater-and-shirt combo—replace all clothing with knit texture and layered collar, not a plain tee. SECONDARY — crop: square headshot. BACKGROUND: bright white or very light gray; soft wrap light. No logos.",
  },
  {
    label: "Warm beige studio · tan blazer",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a tan or camel hair blazer over cream or ivory dress shirt, no tie. The person is dressed ONLY in this blazer—wearing tan blazer and dress shirt; replace all clothing with blazer texture and collar visible. SECONDARY — mood: warm approachable executive. BACKGROUND: warm beige or taupe seamless; soft golden-neutral light. No logos.",
  },
  {
    label: "Urban outdoor blur · gray suit",
    background_style: "gradient",
    aspect_ratio: { ratio: "16:9" },
    image_size: { width: 1820, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a medium gray suit, white dress shirt, optional pocket square. The person is wearing ONLY this gray suit—replace all clothing with suit fabric and lapels fully rendered. SECONDARY — composition: wide head-and-shoulders. BACKGROUND: softly blurred city bokeh, no signs or people; modern professional. No logos.",
  },
  {
    label: "Corner office light · pinstripe",
    background_style: "corporate",
    aspect_ratio: { ratio: "9:16" },
    image_size: { width: 1024, height: 1820 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with navy pinstripe or chalk-stripe suit, white shirt, silk tie; stripe pattern subtle but visible on jacket. The person is dressed ONLY in pinstripe suit and tie—replace all clothing with tailored suit, not casual wear. SECONDARY — framing: tall portrait. BACKGROUND: bright blurred executive office, window bokeh; no other faces. No logos.",
  },
  {
    label: "Skyline soft blur · dress shirt",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with ONLY a crisp white or light blue dress shirt—no jacket—sleeves neatly rolled once or twice, cuff placket visible, top button may be open. The person is dressed ONLY in this woven dress shirt—replace all clothing with oxford fabric, absolutely not a t-shirt or knit tee. SECONDARY — mood: relaxed professional. BACKGROUND: very soft skyline glow blur, minimal. No logos.",
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
