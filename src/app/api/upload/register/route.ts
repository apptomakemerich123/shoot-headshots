import { randomUUID } from "crypto";

import { isTrustedFalStorageUrl } from "@/lib/fal-env";
import { storeKeys, storeSet } from "@/lib/store";
import type { OrderGender, UploadRecord } from "@/lib/types-order";

export const runtime = "nodejs";

/** Session persistence only — large files go client → FAL directly (see /api/upload/fal-initiate). */
export const maxDuration = 60;

const MIN_PHOTOS = 10;
const MAX_PHOTOS = 20;

function jsonErr(status: number, message: string, logCtx?: Record<string, unknown>) {
  console.error("[upload/register]", message, logCtx ?? "");
  return Response.json({ error: message }, { status });
}

function logUnknownError(phase: string, e: unknown) {
  const detail =
    e && typeof e === "object"
      ? {
          ...("message" in e ? { message: (e as { message: unknown }).message } : {}),
          ...("stack" in e ? { stack: (e as { stack: unknown }).stack } : {}),
        }
      : { raw: String(e) };
  console.error("[upload/register] FAILED at:", phase, detail, e);
}

type RegisterJson = {
  previewUrl?: unknown;
  imagesDataUrl?: unknown;
  photoCount?: unknown;
  gender?: unknown;
};

/**
 * Persists FAL CDN URLs after the client uploaded bytes directly to FAL.
 * JSON body only — avoids Vercel's ~4.5MB serverless request limit on multipart training bundles.
 */
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  console.log("[upload/register] POST", {
    contentType: ct.slice(0, 120),
  });

  try {
    if (!ct.includes("application/json")) {
      console.error(
        "[upload/register] rejected non-JSON — large multipart uploads exceed Vercel body limits; client must use direct FAL upload + this JSON endpoint",
      );
      return jsonErr(
        415,
        "Use Content-Type: application/json with previewUrl, imagesDataUrl, photoCount, and gender (client uploads files to FAL first).",
      );
    }

    let parsed: RegisterJson;
    try {
      parsed = (await req.json()) as RegisterJson;
    } catch (e) {
      logUnknownError("req.json", e);
      return jsonErr(400, "Invalid JSON body.");
    }

    const previewUrl =
      typeof parsed.previewUrl === "string" ? parsed.previewUrl.trim() : "";
    const imagesDataUrl =
      typeof parsed.imagesDataUrl === "string"
        ? parsed.imagesDataUrl.trim()
        : "";
    const photoCount =
      typeof parsed.photoCount === "number" && Number.isFinite(parsed.photoCount)
        ? Math.floor(parsed.photoCount)
        : NaN;

    const genderRaw = parsed.gender;
    const gender: OrderGender | null =
      genderRaw === "man" || genderRaw === "woman" ? genderRaw : null;
    if (!gender) {
      return jsonErr(400, 'gender must be "man" or "woman".');
    }

    if (!previewUrl || !imagesDataUrl) {
      console.error("[upload/register] missing urls", {
        hasPreview: Boolean(previewUrl),
        hasZip: Boolean(imagesDataUrl),
      });
      return jsonErr(400, "Missing previewUrl or imagesDataUrl.");
    }

    if (!isTrustedFalStorageUrl(previewUrl) || !isTrustedFalStorageUrl(imagesDataUrl)) {
      console.error("[upload/register] untrusted URL hosts rejected");
      return jsonErr(400, "Invalid storage URLs.");
    }

    if (
      Number.isNaN(photoCount) ||
      photoCount < MIN_PHOTOS ||
      photoCount > MAX_PHOTOS
    ) {
      return jsonErr(
        400,
        `photoCount must be between ${MIN_PHOTOS} and ${MAX_PHOTOS} (got ${String(parsed.photoCount)}).`,
      );
    }

    const uploadToken = randomUUID();

    const record: UploadRecord = {
      imagesDataUrl,
      previewUrl,
      gender,
      createdAt: Date.now(),
    };

    try {
      await storeSet(storeKeys.upload(uploadToken), record);
    } catch (e) {
      logUnknownError("storeSet(upload)", e);
      return jsonErr(500, "Could not save upload session. Please try again.");
    }

    console.log("[upload/register] OK", { uploadToken, photoCount, gender });
    return Response.json({ uploadToken, previewUrl });
  } catch (e) {
    logUnknownError("POST(unhandled)", e);
    return jsonErr(
      500,
      e instanceof Error ? e.message : "Upload failed",
    );
  }
}
