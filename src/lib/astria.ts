import JSZip from "jszip";

import { getPublicAppBaseUrl } from "@/lib/app-base-url";
import { isTrustedFalStorageUrl } from "@/lib/fal-env";
import { PRODUCT } from "@/lib/types-order";
import type { VariationSpec } from "@/lib/variations";

const ASTRIA_API = "https://api.astria.ai";

/** Flux1.dev baseline — user-specified gallery tune id */
export const ASTRIA_BASE_TUNE_ID = 690204;

function requireAstriaApiKey(): string {
  const key = process.env.ASTRIA_API_KEY?.trim();
  if (!key) throw new Error("ASTRIA_API_KEY is not set");
  return key;
}

function snap8(n: number): number {
  return Math.max(64, Math.round(n / 8) * 8);
}

export function dimensionsFromVariation(spec: VariationSpec): { w: number; h: number } {
  const s = spec.image_size;
  if (typeof s === "object" && s !== null && "width" in s && "height" in s) {
    return { w: snap8(s.width), h: snap8(s.height) };
  }
  return { w: 1024, h: 1360 };
}

export function astriaTuneWebhookUrl(sessionId: string): string {
  const base = getPublicAppBaseUrl();
  const q = new URLSearchParams({
    session_id: sessionId,
    kind: "tune",
  });
  return `${base}/api/webhook/astria?${q.toString()}`;
}

export function astriaPromptWebhookUrl(sessionId: string, idx: number): string {
  const base = getPublicAppBaseUrl();
  const q = new URLSearchParams({
    session_id: sessionId,
    kind: "prompt",
    idx: String(idx),
  });
  return `${base}/api/webhook/astria?${q.toString()}`;
}

async function fetchZipAsImageBlobs(zipUrl: string): Promise<Blob[]> {
  if (!isTrustedFalStorageUrl(zipUrl)) {
    throw new Error("Training zip URL is not on trusted FAL storage hosts");
  }
  const res = await fetch(zipUrl);
  if (!res.ok) throw new Error(`Could not download training zip (${res.status})`);
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const blobs: Blob[] = [];

  const entries = Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b));
  for (const [path, file] of entries) {
    if (file.dir) continue;
    if (!/\.(jpe?g|png|webp)$/i.test(path)) continue;
    const b = await file.async("blob");
    const type = b.type || "image/jpeg";
    const named = new File([b], path.split("/").pop() ?? "photo.jpg", { type });
    blobs.push(named);
  }

  if (blobs.length < 1) throw new Error("ZIP contained no JPEG/PNG/WebP images");
  return blobs;
}

export type AstriaTuneCreateResult = { id: number };

/**
 * POST multipart tune to Astria with training images extracted from the user zip on FAL CDN.
 */
export async function createAstriaTune(params: {
  sessionId: string;
  zipUrl: string;
}): Promise<number> {
  const { sessionId, zipUrl } = params;
  const blobs = await fetchZipAsImageBlobs(zipUrl);
  const fd = new FormData();
  fd.append("tune[title]", sessionId);
  fd.append("tune[name]", sessionId);
  fd.append("tune[base_tune_id]", String(ASTRIA_BASE_TUNE_ID));
  fd.append("tune[branch]", "fast");
  fd.append("tune[token]", "ohwx");
  fd.append("tune[model_type]", "lora");
  fd.append("tune[callback]", astriaTuneWebhookUrl(sessionId));

  for (let i = 0; i < blobs.length; i++) {
    const part = blobs[i]!;
    fd.append("tune[images][]", part, `train_${i}.jpg`);
  }

  const res = await fetch(`${ASTRIA_API}/tunes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireAstriaApiKey()}`,
    },
    body: fd,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Astria tune creation failed (${res.status}): ${errText.slice(0, 800)}`,
    );
  }

  const json = (await res.json()) as AstriaTuneCreateResult & { id?: number };
  const id = typeof json.id === "number" ? json.id : Number(json.id);
  if (!Number.isFinite(id)) throw new Error("Astria tune response missing numeric id");
  return id;
}

/**
 * POST one prompt job to Astria (one generated image per prompt).
 */
export async function createAstriaPrompt(params: {
  tuneId: number;
  text: string;
  callback: string;
  w: number;
  h: number;
}): Promise<void> {
  const { tuneId, text, callback, w, h } = params;
  const fd = new FormData();
  fd.append("prompt[text]", text);
  fd.append("prompt[callback]", callback);
  fd.append("prompt[num_images]", "1");
  fd.append("prompt[w]", String(w));
  fd.append("prompt[h]", String(h));
  fd.append("prompt[face_correct]", "true");
  fd.append("prompt[super_resolution]", "true");

  const res = await fetch(`${ASTRIA_API}/tunes/${tuneId}/prompts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireAstriaApiKey()}`,
    },
    body: fd,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Astria prompt failed (${res.status}): ${errText.slice(0, 800)}`,
    );
  }
}

/** Fire all variation prompts for one paid order (after tune training completes). */
export async function enqueueAstriaVariationPrompts(params: {
  sessionId: string;
  tuneId: number;
  specs: VariationSpec[];
}): Promise<void> {
  const { sessionId, tuneId, specs } = params;
  if (specs.length !== PRODUCT.count) {
    throw new Error(`Expected ${PRODUCT.count} variation specs`);
  }

  const concurrency = 4;
  for (let i = 0; i < specs.length; i += concurrency) {
    const slice = specs.slice(i, i + concurrency);
    await Promise.all(
      slice.map(async (spec, j) => {
        const idx = i + j;
        const { w, h } = dimensionsFromVariation(spec);
        await createAstriaPrompt({
          tuneId,
          text: spec.prompt,
          callback: astriaPromptWebhookUrl(sessionId, idx),
          w,
          h,
        });
      }),
    );
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** Collect HTTP image URLs from an Astria prompt callback payload (shape varies by backend). */
export function extractImageUrlsFromAstriaPromptPayload(payload: unknown): string[] {
  const out: string[] = [];
  const push = (u: unknown) => {
    if (typeof u === "string" && u.startsWith("http")) out.push(u);
  };

  const root = asRecord(payload);
  const obj =
    root && "prompt" in root && asRecord(root.prompt)
      ? asRecord(root.prompt)!
      : root;
  if (!obj) return [];

  for (const key of ["images", "generated_images", "attachments"]) {
    const v = obj[key];
    if (!Array.isArray(v)) continue;
    for (const item of v) {
      if (typeof item === "string") push(item);
      else if (asRecord(item)?.url) push(asRecord(item)!.url);
    }
  }

  for (const key of ["images_urls", "image_urls", "urls"]) {
    const v = obj[key];
    if (Array.isArray(v)) for (const u of v) push(u);
  }

  push(obj.image_url);
  push(obj.primary_image_url);

  return [...new Set(out)];
}

export function isTuneObjectLikelyComplete(tune: Record<string, unknown>): boolean {
  if (tune.trained_at != null) return true;
  if (tune.status === "completed" || tune.training_status === "completed")
    return true;
  if (typeof tune.ckpt_url === "string" && tune.ckpt_url.length > 0) return true;
  return false;
}

export function unwrapAstriaEntity(body: unknown): Record<string, unknown> | null {
  const r = asRecord(body);
  if (!r) return null;
  if ("tune" in r && asRecord(r.tune)) return asRecord(r.tune)!;
  if ("prompt" in r && asRecord(r.prompt)) return asRecord(r.prompt)!;
  return r;
}
