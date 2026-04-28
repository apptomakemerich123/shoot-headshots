import { fal } from "@fal-ai/client";
import { DEFAULT_NEGATIVE_PROMPT, type VariationSpec } from "./variations";

const MODEL_ID = "fal-ai/firered-image-edit";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function generateOne(
  beforeUrl: string,
  spec: VariationSpec,
): Promise<string> {
  const result = await fal.subscribe(MODEL_ID, {
    input: {
      image_urls: [beforeUrl],
      prompt: spec.prompt,
      negative_prompt: DEFAULT_NEGATIVE_PROMPT,
      image_size: spec.image_size,
      num_images: 1,
      guidance_scale: 4,
      num_inference_steps: 30,
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
