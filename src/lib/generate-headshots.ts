import { fal } from "@fal-ai/client";

import type {
  FluxLoraFastTrainingInput,
  FluxLoraFastTrainingOutput,
  FluxLoraGenerationInput,
  FluxLoraGenerationOutput,
} from "./fal-flux-lora-types";

import type { VariationSpec } from "./variations";

/**
 * Premium flow: train a subject LoRA (`fal-ai/flux-lora-fast-training`), then generate
 * headshots with `fal-ai/flux-lora` + trained weights.
 */
const TRAINING_MODEL_ID = "fal-ai/flux-lora-fast-training";
const GENERATION_MODEL_ID = "fal-ai/flux-lora";

/** Must match training `trigger_word`; include in every generation prompt. */
export const LORA_TRIGGER_WORD = "portrperson";

const PHOTO_PREFIX =
  `Professional corporate headshot photograph of ${LORA_TRIGGER_WORD}, looking at the camera, natural flattering light on face and shoulders, sharp facial details, catchlights in eyes, authentic professional portrait, not a selfie. `;

const PHOTO_REALISM_BLOCK =
  "photorealistic, shot on Sony A7R, 85mm f/1.4 lens, natural skin texture, subsurface scattering, real photograph, not AI generated, DSLR quality, professional photographer, preserve exact hair color, hair length, and hair style from training photos. ";

const WARDROBE_PREFIX =
  `Dress ${LORA_TRIGGER_WORD} in the wardrobe described below — styling changes each shot; ignore casual clothing from training photos. `;

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export type GenerationPhase = "training" | "generating";

export async function trainFluxLora(imagesDataUrl: string): Promise<string> {
  const input: FluxLoraFastTrainingInput = {
    images_data_url: imagesDataUrl,
    trigger_word: LORA_TRIGGER_WORD,
    create_masks: true,
    is_style: false,
    steps: 750,
  };

  const result = await fal.subscribe(TRAINING_MODEL_ID, {
    input,
    pollInterval: 4000,
  });

  const data = result.data as FluxLoraFastTrainingOutput;
  const url = data.diffusers_lora_file?.url;
  if (!url) throw new Error("LoRA training returned no diffusers_lora_file URL");
  return url;
}

async function generateOne(
  loraWeightsUrl: string,
  spec: VariationSpec,
): Promise<string> {
  const prompt = `${LORA_TRIGGER_WORD}, ${PHOTO_PREFIX}${PHOTO_REALISM_BLOCK}${WARDROBE_PREFIX}${spec.prompt}`;

  const input: FluxLoraGenerationInput = {
    prompt,
    image_size: spec.image_size as FluxLoraGenerationInput["image_size"],
    num_inference_steps: 32,
    guidance_scale: 3.5,
    loras: [{ path: loraWeightsUrl, scale: 1 }],
    enable_safety_checker: true,
    output_format: "jpeg",
    num_images: 1,
  };

  const result = await fal.subscribe(GENERATION_MODEL_ID, {
    input,
    pollInterval: 2000,
  });

  const data = result.data as FluxLoraGenerationOutput;
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("No image returned from flux-lora");
  return url;
}

export async function generateHeadshotsWithLora(
  loraWeightsUrl: string,
  specs: VariationSpec[],
  concurrency = 2,
): Promise<{ urls: string[]; labels: string[] }> {
  fal.config({ credentials: requireEnv("FAL_KEY") });

  const urls: string[] = [];
  const labels: string[] = [];

  for (let i = 0; i < specs.length; i += concurrency) {
    const slice = specs.slice(i, i + concurrency);
    const chunk = await Promise.all(
      slice.map((spec) => generateOne(loraWeightsUrl, spec)),
    );
    urls.push(...chunk);
    labels.push(...slice.map((s) => s.label));
  }

  return { urls, labels };
}

/**
 * Train on zipped portraits, then generate all variations. Optional callback updates job phase for UI polling.
 */
export async function trainAndGenerateHeadshotBatch(
  imagesDataUrl: string,
  specs: VariationSpec[],
  onPhase?: (phase: GenerationPhase) => void | Promise<void>,
): Promise<{ urls: string[]; labels: string[] }> {
  fal.config({ credentials: requireEnv("FAL_KEY") });

  await onPhase?.("training");
  const loraWeightsUrl = await trainFluxLora(imagesDataUrl);

  await onPhase?.("generating");
  return generateHeadshotsWithLora(loraWeightsUrl, specs);
}
