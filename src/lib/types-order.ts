export type UploadRecord = {
  beforeUrl: string;
  createdAt: number;
};

export type OrderStatus = "processing" | "ready" | "failed";

export type OrderRecord = {
  status: OrderStatus;
  beforeUrl?: string;
  imageUrls?: string[];
  labels?: string[];
  /** Stripe Checkout customer email after payment */
  customerEmail?: string;
  emailSent?: boolean;
  error?: string;
  updatedAt: number;
};

/** Single product: $14.99 → 10 headshot variations after checkout */
export const PRODUCT = {
  label: "Portr — 10 AI headshots",
  cents: 1499,
  count: 10,
} as const;
