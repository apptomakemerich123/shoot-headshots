import { fal } from "@fal-ai/client";
import type { VariationSpec } from "./variations";

/**
 * Identity-preserving generation: Flux + PuLID (`fal-ai/flux-pulid`).
 * Commercial endpoint on FAL; keeps likeness from `reference_image_url` while the prompt
 * drives wardrobe, background, and lighting. Prefer over plain img2img (flux/dev) for
 * consistent faces across 12 looks. Alternatives on FAL: `fal-ai/pulid` (non-Flux),
 * `fal-ai/ip-adapter-face-id` (research), `fal-ai/instantid` (often private / limited).
 */
const MODEL_ID = "fal-ai/flux-pulid";

/** Strong ID adherence — PuLID identity loss weight (default on API is 1). */
const ID_WEIGHT = 1;

const PHOTO_PREFIX =
  "Professional corporate headshot photograph, same identity as reference face, shot by an expert portrait photographer, editorial quality, natural flattering light on face and shoulders, realistic studio or environmental lighting, sharp facial features, high detail face, photorealistic skin, catchlights in eyes, 85mm portrait lens look, authentic professional headshot, not a selfie. ";

/** Scene/outfit come from text; reference is for identity only. */
const WARDROBE_PREFIX =
  "Styling for this shot only — ignore any clothing in the reference image; dress the subject in the wardrobe described below. ";

const NEGATIVE_PROMPT = [
  "bad quality",
  "worst quality",
  "low resolution",
  "blurry face",
  "distorted face",
  "extra limbs",
  "multiple people",
  "two faces",
  "duplicate",
  "watermark",
  "text overlay",
  "logo",
  "cartoon",
  "anime",
  "plastic skin",
  "studio light stand",
  "camera visible",
  "tripod",
  "ring light visible",
].join(", ");

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function generateOne(
  beforeUrl: string,
  spec: VariationSpec,
): Promise<string> {
  const prompt = `${PHOTO_PREFIX}${WARDROBE_PREFIX}${spec.prompt}`;

  const result = await fal.subscribe(MODEL_ID, {
    input: {
      prompt,
      reference_image_url: beforeUrl,
      image_size: spec.image_size,
      num_inference_steps: 32,
      guidance_scale: 4.5,
      negative_prompt: NEGATIVE_PROMPT,
      id_weight: ID_WEIGHT,
      max_sequence_length: "512",
      enable_safety_checker: true,
    },
    pollInterval: 2000,
  });

  const images = (
    result as unknown as { data?: { images?: Array<{ url: string }> } }
  ).data?.images;
  const url = images?.[0]?.url;
  if (!url) throw new Error("No image returned from model");
  return url;
}

/** Run in small parallel batches to reduce rate-limit issues. */
export async function generateHeadshotBatch(
  beforeUrl: string,
  specs: VariationSpec[],
  concurrency = 2,
): Promise<{ urls: string[]; labels: string[] }> {
  fal.config({ credentials: requireEnv("FAL_KEY") });

  const urls: string[] = [];
  const labels: string[] = [];

  for (let i = 0; i < specs.length; i += concurrency) {
    const slice = specs.slice(i, i + concurrency);
    const chunk = await Promise.all(
      slice.map((spec) => generateOne(beforeUrl, spec)),
    );
    urls.push(...chunk);
    labels.push(...slice.map((s) => s.label));
  }

  return { urls, labels };
}
