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
    label: "Gray studio · navy tailored jacket",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a tailored navy jacket with notch lapels, crisp white or pale tailored button-up or professional blouse, elegant open collar. The person is dressed ONLY in this outfit—wearing tailored separates and woven fabric, not the reference top. Replace all clothing with visible lapels and structured jacket; no necktie. SECONDARY — pose: head-and-shoulders, looking at camera. BACKGROUND: classic neutral gray seamless studio wall, smooth and even; soft flattering portrait light. No logos.",
  },
  {
    label: "White seamless · dark blazer",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a charcoal or black structured blazer over a light blue or white tailored shirt or professional blouse, open collar. The person is dressed ONLY in this blazer and top—replace all clothing with blazer layers, not a tee or hoodie. SECONDARY — pose: head-and-shoulders, bright professional headshot. BACKGROUND: pure white seamless, high-key; even soft lighting. No logos.",
  },
  {
    label: "Charcoal backdrop · business casual",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a tucked light oxford or chambray woven button-up or smart casual blouse, leather belt at waist if in frame. The person is dressed ONLY in this business-casual top—replace all clothing with woven fabric, not a knit t-shirt. SECONDARY — framing: upper chest and shoulders. BACKGROUND: dark charcoal seamless, subtle rim on shoulders; moody professional. No logos.",
  },
  {
    label: "Outdoor blur · blazer",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a navy blue blazer over white or pale blue tailored shirt or professional blouse, blazer buttoned or one button open. The person is wearing ONLY this blazer ensemble—replace all clothing with jacket weave and collar, not a hoodie or tee. SECONDARY — setting: outdoor-inspired portrait. BACKGROUND: softly blurred trees or park bokeh, no other people; natural daylight look. No logos.",
  },
  {
    label: "Office bokeh · charcoal tailored jacket",
    background_style: "corporate",
    aspect_ratio: { ratio: "4:3" },
    image_size: { width: 1365, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a charcoal tailored jacket and matching tailored trousers or skirt visible only if in frame, plus white spread-collar tailored shirt or professional blouse, open collar, no necktie. The person is dressed ONLY in this polished outfit—replace all clothing with lapels and placket visible. SECONDARY — pose: corporate headshot. BACKGROUND: blurred modern office (glass, neutrals); no screens with faces. Executive look. No logos.",
  },
  {
    label: "Light gray · smart casual separates",
    background_style: "corporate",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with tucked white or pale gray tailored shirt or professional blouse, brown leather belt, optional thin heather gray v-neck pullover, tailored neutral chinos or trousers if lower frame visible. The person is wearing ONLY this smart-casual outfit—replace all clothing with belt, top, and bottoms, not the reference garment. SECONDARY — tone: friendly executive portrait. BACKGROUND: soft light gray seamless. No logos.",
  },
  {
    label: "Navy gradient · formal open collar",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with navy or charcoal structured jacket, crisp white or pale tailored shirt or elegant professional blouse, refined open collar and structured lapels, no necktie. The person is dressed ONLY in this formal jacket look—replace all clothing with jacket and top clearly visible. SECONDARY — expression: confident neutral. BACKGROUND: subtle navy-to-midnight gradient wall. Polished corporate headshot. No logos.",
  },
  {
    label: "High-key white · layered sweater",
    background_style: "clean",
    aspect_ratio: { ratio: "1:1" },
    image_size: { width: 1024, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a fine-gauge black or charcoal crewneck sweater layered over a white collared tailored shirt or blouse with collar and cuffs peeking out. The person is wearing ONLY this layered knit look—replace all clothing with knit texture and layered collar, not a plain tee. SECONDARY — crop: square headshot. BACKGROUND: bright white or very light gray; soft wrap light. No logos.",
  },
  {
    label: "Warm beige studio · tan blazer",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a tan or camel hair blazer over cream or ivory tailored shirt or professional blouse, open collar. The person is dressed ONLY in this blazer ensemble—replace all clothing with blazer texture and collar visible. SECONDARY — mood: warm approachable executive. BACKGROUND: warm beige or taupe seamless; soft golden-neutral light. No logos.",
  },
  {
    label: "Urban outdoor blur · gray tailored jacket",
    background_style: "gradient",
    aspect_ratio: { ratio: "16:9" },
    image_size: { width: 1820, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a medium gray tailored jacket, white or pale tailored shirt or professional blouse, elegant open collar. The person is wearing ONLY this gray tailored look—replace all clothing with jacket fabric and lapels fully rendered. SECONDARY — composition: wide head-and-shoulders. BACKGROUND: softly blurred city bokeh, no signs or people; modern professional. No logos.",
  },
  {
    label: "Corner office · fine-stripe jacket",
    background_style: "corporate",
    aspect_ratio: { ratio: "9:16" },
    image_size: { width: 1024, height: 1820 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with navy or charcoal fine-stripe or chalk-stripe tailored jacket, white or pale tailored shirt or professional blouse, open collar; stripe pattern subtle on jacket, no necktie. The person is dressed ONLY in this structured jacket outfit—replace all clothing with tailored separates, not casual wear. SECONDARY — framing: tall portrait. BACKGROUND: bright blurred executive office, window bokeh; no other faces. No logos.",
  },
  {
    label: "Skyline soft blur · relaxed shirt",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with ONLY a crisp white or light blue tailored button-up or professional blouse—no jacket—sleeves neatly rolled once or twice, cuff placket visible, top button may be open. The person is dressed ONLY in this woven top—replace all clothing with tailored woven fabric, absolutely not a t-shirt or knit tee. SECONDARY — mood: relaxed professional. BACKGROUND: very soft skyline glow blur, minimal. No logos.",
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
