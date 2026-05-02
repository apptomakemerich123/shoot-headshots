import type { OrderGender } from "@/lib/types-order";

/** Leading clause for every preset — `{token} person, man|woman,` (Astria requires the tune token in prompt text). */
export function variationPromptLead(tuneToken: string, gender: OrderGender): string {
  const word = gender === "woman" ? "woman" : "man";
  const t = tuneToken.trim() || "ohwx";
  return `${t} person, ${word}, `;
}

/** 40 distinct looks: varied backgrounds + clothing. Gender-neutral scene copy; gender is prefixed in `buildVariationList`. */
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

/** Exactly 40 presets — each differs by background + wardrobe + framing hints. */
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
  {
    label: "Slate seamless · burgundy blazer",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a deep burgundy or wine tailored blazer over ivory or pale tailored shirt or professional blouse, open collar. The person is dressed ONLY in this blazer ensemble—replace all clothing with structured lapels, not casual knits. SECONDARY — pose: head-and-shoulders, confident gaze. BACKGROUND: cool slate gray seamless, even soft light. No logos.",
  },
  {
    label: "Teal gradient · forest green jacket",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a forest or deep pine tailored jacket, cream or pale tailored shirt or blouse beneath, open collar, no necktie. The person is wearing ONLY this jacket look—replace all clothing with woven suiting fabric. SECONDARY — tone: modern creative professional. BACKGROUND: subtle teal-to-charcoal gradient wall. No logos.",
  },
  {
    label: "Marble lobby blur · black turtleneck",
    background_style: "corporate",
    aspect_ratio: { ratio: "4:3" },
    image_size: { width: 1365, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a fine-gauge black merino turtleneck or mock-neck knit in executive style, smooth drape. The person is dressed ONLY in this knit—replace all clothing with dark neutral knit texture, not a hoodie. SECONDARY — framing: head-and-upper-chest. BACKGROUND: softly blurred marble lobby with warm recessed lights; no people. No logos.",
  },
  {
    label: "Warm sand seamless · chocolate blazer",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a chocolate brown tailored blazer over pale blush or sand tailored shirt or professional blouse, open collar. The person is dressed ONLY in this warm-neutral outfit—replace all clothing with blazer and placket visible. SECONDARY — mood: approachable leader. BACKGROUND: warm sand or biscuit seamless. No logos.",
  },
  {
    label: "Library wood blur · tweed jacket",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a subtle herringbone or tweed tailored jacket in brown-gray, white or pale tailored shirt or blouse, open collar. The person is wearing ONLY this textured jacket look—replace all clothing with jacket weave and collar. SECONDARY — setting: scholarly professional. BACKGROUND: softly blurred warm wood shelves and books, no readable titles or faces. No logos.",
  },
  {
    label: "Ice blue seamless · steel blue shirt",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a steel or dusty blue tailored button-up or professional blouse—no jacket—crisp placket, open collar. The person is dressed ONLY in this woven shirt—replace all clothing with tailored fabric, not a tee. SECONDARY — look: crisp tech executive. BACKGROUND: very pale ice-blue seamless, high-key soft light. No logos.",
  },
  {
    label: "Midnight gradient · silver-gray suit jacket",
    background_style: "gradient",
    aspect_ratio: { ratio: "1:1" },
    image_size: { width: 1024, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a silver-gray or light charcoal tailored suit jacket, white or pale tailored shirt or blouse, refined open collar, no necktie. The person is dressed ONLY in this polished jacket—replace all clothing with lapels visible. SECONDARY — crop: square executive portrait. BACKGROUND: deep midnight-to-navy gradient. No logos.",
  },
  {
    label: "Brick courtyard blur · indigo denim shirt",
    background_style: "corporate",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a dark rinse indigo chambray or denim-look tailored shirt or structured blouse, pressed collar, top buttons neat. The person is wearing ONLY this smart-casual woven top—replace all clothing; not a graphic tee or hoodie. SECONDARY — vibe: creative director portrait. BACKGROUND: softly blurred red brick and greenery, no people. No logos.",
  },
  {
    label: "Pearl gray · eggplant cardigan over shirt",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a fine eggplant or deep plum cardigan over white collared tailored shirt or blouse with collar visible. The person is dressed ONLY in this layered knit-over-shirt look—replace all clothing with knit and collar layers. SECONDARY — expression: warm professional. BACKGROUND: pearl gray seamless, soft wrap light. No logos.",
  },
  {
    label: "Glass atrium bokeh · dove gray blazer",
    background_style: "corporate",
    aspect_ratio: { ratio: "16:9" },
    image_size: { width: 1820, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a dove gray tailored blazer, pale blue or white tailored shirt or professional blouse, open collar. The person is wearing ONLY this blazer ensemble—replace all clothing with structured separates. SECONDARY — composition: wide head-and-shoulders. BACKGROUND: bright blurred glass atrium bokeh, no faces on glass. No logos.",
  },
  {
    label: "Soft lavender studio · navy dress shirt",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a deep navy tailored dress shirt or elegant blouse with structured collar—no jacket—sleeves to wrist, cuff visible. The person is dressed ONLY in this dark woven top—replace all clothing with tailored fabric. SECONDARY — mood: understated luxury. BACKGROUND: very soft lavender-gray seamless. No logos.",
  },
  {
    label: "Cream high-key · camel crew under blazer",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a camel or tan tailored blazer over a fine cream crewneck sweater layered with white collar shirt or blouse peeking at neckline if visible. The person is wearing ONLY this layered professional look—replace all clothing with blazer and knit layers. SECONDARY — light: bright airy portrait. BACKGROUND: cream high-key seamless. No logos.",
  },
  {
    label: "Charcoal texture wall · pinstripe vest",
    background_style: "professional",
    aspect_ratio: { ratio: "4:3" },
    image_size: { width: 1365, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a subtle pinstripe tailored vest over white spread-collar shirt or blouse, sleeves and vest waist visible if in frame, no necktie. The person is dressed ONLY in this three-piece-inspired look—replace all clothing with vest and shirt. SECONDARY — pose: three-quarter torso corporate. BACKGROUND: dark charcoal lightly textured studio wall. No logos.",
  },
  {
    label: "Park path bokeh · olive field jacket",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a tailored olive or sage field-style jacket over ecru or white woven shirt or blouse, open collar. The person is wearing ONLY this refined casual jacket—replace all clothing with structured cotton weave, not athletic wear. SECONDARY — setting: outdoor professional. BACKGROUND: soft park path bokeh, no other people. No logos.",
  },
  {
    label: "Navy seamless · double-breasted cream jacket",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a cream or winter-white double-breasted tailored jacket, navy or crisp white tailored shirt or blouse beneath, elegant open collar. The person is dressed ONLY in this statement jacket—replace all clothing with DB lapels visible. SECONDARY — tone: boardroom-ready. BACKGROUND: rich navy seamless, soft rim light. No logos.",
  },
  {
    label: "Foggy city blur · graphite merino quarter-zip",
    background_style: "corporate",
    aspect_ratio: { ratio: "9:16" },
    image_size: { width: 1024, height: 1820 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a graphite or charcoal fine merino quarter-zip sweater over white collared shirt or blouse with collar at zipper. The person is wearing ONLY this business-casual knit—replace all clothing with refined knit texture. SECONDARY — framing: tall portrait. BACKGROUND: soft foggy urban blur, no signage legible. No logos.",
  },
  {
    label: "Terracotta studio · rust linen blazer",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a rust or terracotta linen-blend tailored blazer, off-white tailored shirt or blouse, open collar. The person is dressed ONLY in this warm tailored look—replace all clothing with breathable weave texture. SECONDARY — mood: creative executive. BACKGROUND: muted terracotta seamless wall. No logos.",
  },
  {
    label: "White corner office · midnight tie-less suit",
    background_style: "corporate",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a midnight navy tailored suit jacket and matching trousers or skirt only if lower frame visible, crisp white tailored shirt or blouse, open collar, absolutely no necktie. The person is wearing ONLY this full suit jacket look—replace all clothing with suit wool texture. SECONDARY — pose: formal headshot. BACKGROUND: bright blurred white office interior. No logos.",
  },
  {
    label: "Moss green gradient · tan chino and navy blazer",
    background_style: "gradient",
    aspect_ratio: { ratio: "1:1" },
    image_size: { width: 1024, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a navy tailored blazer, pale blue or white tailored shirt or blouse, optional tan tailored chinos visible only if waist down appears. The person is dressed ONLY in blazer and woven separates—replace all clothing with belt and chinos if shown, not jeans. SECONDARY — crop: square friendly executive. BACKGROUND: moss-to-charcoal subtle gradient. No logos.",
  },
  {
    label: "Black seamless · ivory silk-blend blouse",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with an ivory or champagne silk-blend tailored blouse or dress shirt with soft sheen, structured collar, no jacket. The person is wearing ONLY this elevated top—replace all clothing with refined woven drape, not a tank top. SECONDARY — lighting: dramatic soft key on black. BACKGROUND: deep black seamless with gentle falloff. No logos.",
  },
  {
    label: "Coastal light blur · striped deck shirt",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a subtle blue-and-white narrow stripe tailored Oxford or breton-inspired woven shirt or blouse, open collar, no logos on fabric. The person is dressed ONLY in this striped woven shirt—replace all clothing with crisp stripes, not a tee. SECONDARY — mood: relaxed coastal professional. BACKGROUND: bright soft coastal sky blur. No logos.",
  },
  {
    label: "Taupe geometric office · charcoal mock-neck under jacket",
    background_style: "corporate",
    aspect_ratio: { ratio: "4:3" },
    image_size: { width: 1365, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a charcoal tailored jacket open over charcoal mock-neck fine knit or dark blouse, layered executive look. The person is wearing ONLY this layered dark ensemble—replace all clothing with jacket and inner layer visible. SECONDARY — framing: horizontal corporate headshot. BACKGROUND: blurred taupe geometric office panels. No logos.",
  },
  {
    label: "Rose quartz seamless · mauve blazer",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a dusty mauve or rosewood tailored blazer, soft gray or white tailored shirt or blouse, open collar. The person is dressed ONLY in this contemporary color jacket—replace all clothing with structured blazer fabric. SECONDARY — expression: approachable expert. BACKGROUND: pale rose quartz seamless, even light. No logos.",
  },
  {
    label: "Copper accent studio · bronze metallic-thread jacket",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a deep bronze or copper-thread subtle shimmer tailored jacket, black or ivory tailored shirt or blouse, open collar; shimmer must stay tasteful and corporate. The person is wearing ONLY this jacket—replace all clothing with tailored evening-business look. SECONDARY — light: warm copper rim. BACKGROUND: dark brown-gray seamless with copper accent spill. No logos.",
  },
  {
    label: "Snow field blur · arctic white puffer under blazer",
    background_style: "gradient",
    aspect_ratio: { ratio: "16:9" },
    image_size: { width: 1820, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a slim dark navy tailored blazer worn over a thin white quilted vest or light inner layer barely visible at neckline—still reads as professional headshot, not outdoor gear heavy. The person is dressed ONLY in blazer-led layers—replace all clothing with structured outer blazer. SECONDARY — composition: wide shoulders focus. BACKGROUND: soft bright snow or ski-lodge window blur, abstract. No logos.",
  },
  {
    label: "Deep plum seamless · gold-tone accessories subtle",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a black or deep plum tailored jacket, ivory tailored shirt or blouse, open collar; optional subtle small gold-tone watch or bracelet if wrist visible—no flashy jewelry. The person is dressed ONLY in this refined outfit—replace all clothing with jacket and shirt. SECONDARY — tone: luxury minimal. BACKGROUND: deep plum seamless, soft key. No logos.",
  },
  {
    label: "Horizon dawn blur · soft yellow oxford",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
    image_size: { width: 1024, height: 1365 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with a pale yellow or buttercream tailored Oxford or professional blouse, tucked if waist visible, leather belt optional. The person is wearing ONLY this warm pastel woven top—replace all clothing with Oxford cloth texture, not neon. SECONDARY — mood: optimistic professional. BACKGROUND: very soft peach-to-blue horizon blur. No logos.",
  },
  {
    label: "Sage seamless · white jacket ecru shirt",
    background_style: "clean",
    aspect_ratio: { ratio: "1:1" },
    image_size: { width: 1024, height: 1024 },
    prompt:
      "PRIMARY — CLOTHING: Ignore original clothing completely; replace ALL garments with an off-white or ecru unstructured tailored jacket, white or pale sage tailored shirt or blouse, open collar. The person is dressed ONLY in this soft-tailoring look—replace all clothing with relaxed but professional jacket. SECONDARY — crop: square wellness-executive vibe. BACKGROUND: muted sage green seamless. No logos.",
  },
];

export function buildVariationList(
  count: number,
  gender: OrderGender,
  tuneToken: string,
): VariationSpec[] {
  const lead = variationPromptLead(tuneToken, gender);
  const out: VariationSpec[] = [];
  for (let i = 0; i < count; i++) {
    const base = BASE_PRESETS[i % BASE_PRESETS.length];
    out.push({
      background_style: base.background_style,
      aspect_ratio: base.aspect_ratio,
      image_size: base.image_size,
      prompt: `${lead}${base.prompt}`,
      label: `${base.label} (#${i + 1})`,
    });
  }
  return out;
}
