/** Subject gender for prompts + metadata (reduces identity drift in generation). */
export type OrderGender = "man" | "woman";

/** Upload session after multi-photo registration (zip on FAL + preview image). */
export type UploadRecord = {
  /** Public URL to zip of training images (uploaded to FAL CDN for direct browser PUT). */
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
  /** Zip URL on FAL CDN — downloaded server-side for Astria fine-tuning. */
  imagesDataUrl?: string;
  /** Astria fine-tune id after `POST /tunes`. */
  astriaTuneId?: number;
  /** Full trigger string returned by Astria on tune creation (verbatim, e.g. `ohwx cs_live_…`) — required in every prompt `text`. */
  astriaTuneToken?: string;
  /** Set after the tune webhook enqueues 40 `POST /tunes/:id/prompts` jobs. */
  astriaPromptsSubmitted?: boolean;
  /** Slots 0..39 filled as Astria prompt callbacks arrive (order matches `buildVariationList`). */
  astriaPromptSlots?: (string | null)[];
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
