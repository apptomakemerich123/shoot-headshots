/**
 * Input/output shapes for fal-ai/flux-lora-fast-training and fal-ai/flux-lora.
 * Defined locally so builds do not depend on `@fal-ai/client/endpoints` subpath
 * resolution (can fail in some CI / bundler setups). Kept aligned with FAL API docs.
 */

/** fal-ai/flux-lora-fast-training (FluxKreaTrainer-style trainer). */
export type FluxLoraFastTrainingInput = {
  images_data_url: string;
  trigger_word?: string;
  create_masks?: boolean;
  is_style?: boolean;
  steps?: number;
  data_archive_format?: string;
  is_input_format_already_preprocessed?: boolean;
};

export type FalFileRef = {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
};

export type FluxLoraFastTrainingOutput = {
  diffusers_lora_file: FalFileRef;
  config_file: FalFileRef;
  debug_preprocessed_output?: FalFileRef;
};

/** fal-ai/flux-lora text-to-image */
export type FluxLoraGenerationInput = {
  prompt: string;
  image_size?:
    | { width?: number; height?: number }
    | "square_hd"
    | "square"
    | "portrait_4_3"
    | "portrait_16_9"
    | "landscape_4_3"
    | "landscape_16_9";
  num_inference_steps?: number;
  guidance_scale?: number;
  loras?: Array<{ path: string; scale?: number; force?: boolean }>;
  enable_safety_checker?: boolean;
  output_format?: "jpeg" | "png";
  num_images?: number;
  seed?: number;
  acceleration?: "none" | "regular";
  sync_mode?: boolean;
};

export type FalGeneratedImage = {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
};

export type FluxLoraGenerationOutput = {
  images: FalGeneratedImage[];
  prompt: string;
  seed: number;
  has_nsfw_concepts: boolean[];
  timings?: unknown;
};
