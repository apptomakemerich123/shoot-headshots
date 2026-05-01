import { fal } from "@fal-ai/client";
import JSZip from "jszip";
import { randomUUID } from "crypto";

import { storeKeys, storeSet } from "@/lib/store";
import type { UploadRecord } from "@/lib/types-order";

export const runtime = "nodejs";

/** Allow packaging 10–20 photos into a zip for FAL without hitting default body limits. */
export const maxDuration = 120;

const MIN_PHOTOS = 10;
const MAX_PHOTOS = 20;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function mimeBase(file: File): string {
  return (file.type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

function extMatchesPhonePhoto(name: string): boolean {
  return /\.(jpe?g|png|heic|heif|webp)$/i.test(name);
}

function isAllowedImage(file: File): boolean {
  const base = mimeBase(file);
  if (ALLOWED.has(base)) return true;
  if (base === "" || base === "application/octet-stream") {
    return extMatchesPhonePhoto(file.name);
  }
  return false;
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

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
          ...("body" in e ? { body: (e as { body: unknown }).body } : {}),
          ...("status" in e ? { status: (e as { status: unknown }).status } : {}),
        }
      : { raw: String(e) };
  console.error("[upload/register] FAILED at:", phase, detail, e);
}

function extForFile(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".heic")) return "heic";
  if (n.endsWith(".heif")) return "heif";
  const base = mimeBase(file);
  if (base === "image/png") return "png";
  if (base === "image/webp") return "webp";
  if (base === "image/heic" || base === "image/heif") return "heic";
  return "jpg";
}

/** Upload photos → zip on FAL + preview URL (first image). No generation yet. */
export async function POST(req: Request) {
  try {
    let falKey: string;
    try {
      falKey = requireEnv("FAL_KEY");
    } catch (e) {
      logUnknownError("env:FAL_KEY", e);
      return jsonErr(500, "Server configuration error.");
    }

    fal.config({ credentials: falKey });

    let form: FormData;
    try {
      form = await req.formData();
    } catch (e) {
      logUnknownError("parseFormData", e);
      return jsonErr(400, "Could not read upload body.", {
        hint: "request_too_large_or_corrupt",
      });
    }

    const raw = form.getAll("files");
    const files = raw.filter((x): x is File => x instanceof File);

    if (files.length < MIN_PHOTOS) {
      return jsonErr(
        400,
        `Please upload at least ${MIN_PHOTOS} photos (you sent ${files.length}).`,
      );
    }
    if (files.length > MAX_PHOTOS) {
      return jsonErr(
        400,
        `Please upload at most ${MAX_PHOTOS} photos (you sent ${files.length}).`,
      );
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isAllowedImage(file)) {
        return jsonErr(
          400,
          `Photo ${i + 1}: use JPG, PNG, HEIC, HEIF, or WebP.`,
        );
      }
    }

    let previewUrl: string;
    try {
      console.log("[upload/register] FAL storage: uploading preview (first file)", {
        name: files[0].name,
        size: files[0].size,
        type: files[0].type,
      });
      previewUrl = await fal.storage.upload(files[0]);
      console.log("[upload/register] FAL preview OK", {
        previewUrl: previewUrl.slice(0, 80),
      });
    } catch (e) {
      logUnknownError("fal.storage.upload(preview)", e);
      return jsonErr(
        500,
        "Could not store preview image. Please try again.",
      );
    }

    let imagesDataUrl: string;
    try {
      const zip = new JSZip();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buf = Buffer.from(await file.arrayBuffer());
        const ext = extForFile(file);
        zip.file(`portr_${String(i + 1).padStart(2, "0")}.${ext}`, buf);
      }

      const zipped = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      const zipBytes = new Uint8Array(zipped);
      const zipBlob = new Blob([zipBytes], { type: "application/zip" });
      const zipFile = new File([zipBlob], "portr-training.zip", {
        type: "application/zip",
      });
      console.log("[upload/register] FAL storage: uploading zip", {
        zipBytes: zipBytes.length,
      });
      imagesDataUrl = await fal.storage.upload(zipFile);
      console.log("[upload/register] FAL zip OK", {
        imagesDataUrl: imagesDataUrl.slice(0, 80),
      });
    } catch (e) {
      logUnknownError("fal.storage.upload(zip)", e);
      return jsonErr(
        500,
        "Could not package or store your photos. Please try again.",
      );
    }

    const uploadToken = randomUUID();

    const record: UploadRecord = {
      imagesDataUrl,
      previewUrl,
      createdAt: Date.now(),
    };

    try {
      await storeSet(storeKeys.upload(uploadToken), record);
    } catch (e) {
      logUnknownError("storeSet(upload)", e);
      return jsonErr(500, "Could not save upload session. Please try again.");
    }

    return Response.json({ uploadToken, previewUrl });
  } catch (e) {
    logUnknownError("POST(unhandled)", e);
    return jsonErr(
      500,
      e instanceof Error ? e.message : "Upload failed",
    );
  }
}
