import JSZip from "jszip";

import {
  getPublicAppBaseUrl,
  logAstriaWebhookEnvDiagnostics,
  tryResolvePublicWebhookBase,
} from "@/lib/app-base-url";
import { isTrustedFalStorageUrl } from "@/lib/fal-env";
import { PRODUCT } from "@/lib/types-order";
import type { VariationSpec } from "@/lib/variations";

const ASTRIA_API = "https://api.astria.ai";

/** Flux1.dev baseline — user-specified gallery tune id */
export const ASTRIA_BASE_TUNE_ID = 690204;

/** Astria `tune[name]` allows only English letters, numbers, and spaces. */
export function sanitizeAstriaTuneName(sessionId: string): string {
  const out = sessionId.replace(/[^a-zA-Z0-9]/g, " ").trim();
  return out.length > 0 ? out : "portr order";
}

function requireAstriaApiKey(): string {
  const key = process.env.ASTRIA_API_KEY?.trim();
  if (!key) throw new Error("ASTRIA_API_KEY is not set");
  return key;
}

/**
 * Astria prompt max dimension is 768. Use 512×768 for portrait-oriented presets, else 768×768.
 */
export function astriaPromptDimensions(spec: VariationSpec): { w: number; h: number } {
  const ratio = spec.aspect_ratio?.ratio;
  if (ratio === "3:4" || ratio === "9:16") {
    return { w: 512, h: 768 };
  }
  const s = spec.image_size;
  if (typeof s === "object" && s !== null && "width" in s && "height" in s) {
    if (s.height > s.width) return { w: 512, h: 768 };
    return { w: 768, h: 768 };
  }
  if (typeof s === "string") {
    if (
      s === "portrait_4_3" ||
      s === "portrait_16_9" ||
      s.startsWith("portrait")
    ) {
      return { w: 512, h: 768 };
    }
  }
  return { w: 768, h: 768 };
}

export function astriaTuneWebhookUrl(sessionId: string, baseUrl: string): string {
  const q = new URLSearchParams({
    session_id: sessionId,
    kind: "tune",
  });
  return `${baseUrl.replace(/\/$/, "")}/api/webhook/astria?${q.toString()}`;
}

export function astriaPromptWebhookUrl(
  sessionId: string,
  idx: number,
  baseUrl: string,
): string {
  const q = new URLSearchParams({
    session_id: sessionId,
    kind: "prompt",
    idx: String(idx),
  });
  return `${baseUrl.replace(/\/$/, "")}/api/webhook/astria?${q.toString()}`;
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

export type AstriaTuneCreateResult = {
  id: number;
  token?: string;
};

export type CreatedAstriaTune = { tuneId: number; tuneToken: string };

/**
 * POST multipart tune to Astria with training images extracted from the user zip on FAL CDN.
 */
export async function createAstriaTune(params: {
  sessionId: string;
  zipUrl: string;
}): Promise<CreatedAstriaTune> {
  const { sessionId, zipUrl } = params;
  const tuneName = sanitizeAstriaTuneName(sessionId);

  console.error("[astria tune] step=start", {
    sessionId,
    tuneName,
    zipHostname: (() => {
      try {
        return new URL(zipUrl).hostname;
      } catch {
        return "(invalid zip URL)";
      }
    })(),
  });

  logAstriaWebhookEnvDiagnostics();
  const webhookBase = tryResolvePublicWebhookBase();
  if (!webhookBase.ok) {
    console.error("[astria tune] step=webhook_base FAILED", webhookBase.message);
    throw new Error(webhookBase.message);
  }
  console.error("[astria tune] step=webhook_base ok", {
    source: webhookBase.source,
    url: webhookBase.url,
  });

  console.error("[astria tune] step=api_key check");
  requireAstriaApiKey();

  const tuneCallback = astriaTuneWebhookUrl(sessionId, webhookBase.url);
  console.error("[astria tune] step=callback_url", { tuneCallback });

  console.error("[astria tune] step=download_zip");
  let blobs: Blob[];
  try {
    blobs = await fetchZipAsImageBlobs(zipUrl);
  } catch (e) {
    console.error("[astria tune] step=download_zip FAILED", e);
    throw e;
  }
  console.error("[astria tune] step=extract_images ok", { imageCount: blobs.length });

  console.error("[astria tune] step=build_multipart");
  const fd = new FormData();
  fd.append("tune[title]", tuneName);
  fd.append("tune[name]", tuneName);
  fd.append("tune[base_tune_id]", String(ASTRIA_BASE_TUNE_ID));
  fd.append("tune[branch]", "flux1");
  fd.append("tune[token]", "ohwx");
  fd.append("tune[model_type]", "lora");
  fd.append("tune[callback]", tuneCallback);

  for (let i = 0; i < blobs.length; i++) {
    const part = blobs[i]!;
    fd.append("tune[images][]", part, `train_${i}.jpg`);
  }

  console.error("[astria tune] step=POST /tunes", { endpoint: `${ASTRIA_API}/tunes` });
  let res: Response;
  try {
    res = await fetch(`${ASTRIA_API}/tunes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireAstriaApiKey()}`,
      },
      body: fd,
    });
  } catch (e) {
    console.error("[astria tune] step=POST /tunes network FAILED", e);
    throw new Error(
      e instanceof Error
        ? `Astria API unreachable: ${e.message}`
        : "Astria API request failed",
    );
  }

  console.error("[astria tune] step=response", { httpStatus: res.status });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[astria tune] step=response_body error", errText.slice(0, 1200));
    throw new Error(
      `Astria rejected the tune (${res.status}). ${errText.slice(0, 500)}`.trim(),
    );
  }

  let json: AstriaTuneCreateResult & { id?: number };
  try {
    json = (await res.json()) as AstriaTuneCreateResult & { id?: number };
  } catch (e) {
    console.error("[astria tune] step=parse_json FAILED", e);
    throw new Error("Astria returned a non-JSON response for tune creation");
  }

  const id = typeof json.id === "number" ? json.id : Number(json.id);
  if (!Number.isFinite(id)) {
    console.error("[astria tune] step=parse_id FAILED raw=", json);
    throw new Error("Astria tune response missing tune id");
  }

  if (typeof json.token !== "string" || json.token.length === 0) {
    console.error("[astria tune] step=token FAILED raw=", json);
    throw new Error(
      "Astria tune response missing non-empty `token` (full trigger string required for prompts)",
    );
  }
  const tuneToken = json.token;

  console.error("[astria tune] step=done ok", { tuneId: id, tuneToken });
  return { tuneId: id, tuneToken };
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
  /** Exact Astria trigger string (same as stored on the order). */
  tuneToken: string;
}): Promise<void> {
  const { sessionId, tuneId, specs, tuneToken } = params;
  if (specs.length !== PRODUCT.count) {
    throw new Error(`Expected ${PRODUCT.count} variation specs`);
  }

  const concurrency = 4;
  for (let i = 0; i < specs.length; i += concurrency) {
    const slice = specs.slice(i, i + concurrency);
    await Promise.all(
      slice.map(async (spec, j) => {
        const idx = i + j;
        const { w, h } = astriaPromptDimensions(spec);
        console.log(
          `[astria prompt] submitting idx=${idx} tuneTokenUsed=${tuneToken} promptLength=${spec.prompt.length}`,
        );
        await createAstriaPrompt({
          tuneId,
          text: spec.prompt,
          callback: astriaPromptWebhookUrl(
            sessionId,
            idx,
            getPublicAppBaseUrl(),
          ),
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
