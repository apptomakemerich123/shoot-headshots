/** Fal headshot model — cycle backgrounds (“lighting” via style presets). */
export type BackgroundStyle = "professional" | "corporate" | "clean" | "gradient";
/** Matches fal-ai/image-apps-v2/headshot-photo AspectRatio enum */
export type Ratio = "1:1" | "3:4" | "9:16" | "4:3" | "16:9";

export type VariationSpec = {
  label: string;
  background_style: BackgroundStyle;
  aspect_ratio: { ratio: Ratio };
};

/** 10 distinct looks: backgrounds + framing (headshot / square / wide / tall). */
const BASE_PRESETS: VariationSpec[] = [
  {
    label: "Bright studio · soft key",
    background_style: "professional",
    aspect_ratio: { ratio: "3:4" },
  },
  {
    label: "Neutral grey · balanced",
    background_style: "corporate",
    aspect_ratio: { ratio: "3:4" },
  },
  {
    label: "High-key clean · crisp",
    background_style: "clean",
    aspect_ratio: { ratio: "3:4" },
  },
  {
    label: "Ambient gradient · depth",
    background_style: "gradient",
    aspect_ratio: { ratio: "3:4" },
  },
  {
    label: "Studio · square crop",
    background_style: "professional",
    aspect_ratio: { ratio: "1:1" },
  },
  {
    label: "Soft wrap light · portrait",
    background_style: "corporate",
    aspect_ratio: { ratio: "9:16" },
  },
  {
    label: "Even fill · environmental",
    background_style: "clean",
    aspect_ratio: { ratio: "4:3" },
  },
  {
    label: "Rim-lit feel · wide",
    background_style: "gradient",
    aspect_ratio: { ratio: "16:9" },
  },
  {
    label: "Corporate headshot · classic",
    background_style: "corporate",
    aspect_ratio: { ratio: "1:1" },
  },
  {
    label: "Minimal edge light · tall",
    background_style: "clean",
    aspect_ratio: { ratio: "9:16" },
  },
];

export function buildVariationList(count: number): VariationSpec[] {
  const out: VariationSpec[] = [];
  for (let i = 0; i < count; i++) {
    const base = BASE_PRESETS[i % BASE_PRESETS.length];
    out.push({
      background_style: base.background_style,
      aspect_ratio: base.aspect_ratio,
      label: `${base.label} (#${i + 1})`,
    });
  }
  return out;
}
