/** Upload session after multi-photo registration (zip on FAL + preview image). */
export type UploadRecord = {
  /** Public URL to zip of training images (`images_data_url` for LoRA training). */
  imagesDataUrl: string;
  /** First photo URL for checkout preview. */
  previewUrl: string;
  createdAt: number;
};

export type OrderStatus = "processing" | "ready" | "failed";

export type JobPhase = "training" | "generating";

export type OrderRecord = {
  status: OrderStatus;
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

/** Single product: $29 → 12 headshot variations after checkout */
export const PRODUCT = {
  label: "Portr — 12 AI headshots",
  cents: 2900,
  count: 12,
} as const;
