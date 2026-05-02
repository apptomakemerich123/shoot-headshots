/** Subject gender for prompts + metadata (reduces identity drift in generation). */
export type OrderGender = "man" | "woman";

/** Upload session after multi-photo registration (zip on FAL + preview image). */
export type UploadRecord = {
  /** Public URL to zip of training images (`images_data_url` for LoRA training). */
  imagesDataUrl: string;
  /** First photo URL for checkout preview. */
  previewUrl: string;
  /** Who the training photos depict — copied into order + Stripe metadata. */
  gender?: OrderGender;
  createdAt: number;
};

export type OrderStatus = "processing" | "ready" | "failed";

export type JobPhase = "training" | "generating";

export type OrderRecord = {
  status: OrderStatus;
  /** Copied from upload at checkout — drives variation prompt leads. */
  gender?: OrderGender;
  /** Zip URL used for LoRA training (optional once finished / for debugging). */
  imagesDataUrl?: string;
  /** FAL queue request id after `fal.queue.submit` for LoRA training. */
  trainingRequestId?: string;
  /** Populated when training queue completes (before image generation). */
  loraWeightsUrl?: string;
  /** Single preview thumb from upload bundle. */
  previewUrl?: string;
  imageUrls?: string[];
  labels?: string[];
  /** Fine-grained progress while status is processing. */
  jobPhase?: JobPhase;
  /** Stripe Checkout customer email after payment */
  customerEmail?: string;
  emailSent?: boolean;
  error?: string;
  updatedAt: number;
};

/** Single product: $29 → 40 headshot variations after checkout */
export const PRODUCT = {
  label: "Portr — 40 AI headshots",
  cents: 2900,
  count: 40,
} as const;
