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
const MIN_BYTES = 200 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png"]);

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  return "jpg";
}

/** Upload photos → zip on FAL + preview URL (first image). No generation yet. */
export async function POST(req: Request) {
  try {
    fal.config({ credentials: requireEnv("FAL_KEY") });

    const form = await req.formData();
    const raw = form.getAll("files");
    const files = raw.filter((x): x is File => x instanceof File);

    if (files.length < MIN_PHOTOS) {
      return Response.json(
        {
          error: `Please upload at least ${MIN_PHOTOS} photos (you sent ${files.length}).`,
        },
        { status: 400 },
      );
    }
    if (files.length > MAX_PHOTOS) {
      return Response.json(
        {
          error: `Please upload at most ${MAX_PHOTOS} photos (you sent ${files.length}).`,
        },
        { status: 400 },
      );
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ALLOWED.has(file.type)) {
        return Response.json(
          { error: `Photo ${i + 1}: use JPG or PNG only.` },
          { status: 400 },
        );
      }
      if (file.size < MIN_BYTES) {
        return Response.json(
          {
            error: `Photo ${i + 1} is too small (under 200KB). Use a clearer, higher-quality file.`,
          },
          { status: 400 },
        );
      }
    }

    const previewUrl = await fal.storage.upload(files[0]);

    const zip = new JSZip();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = extForMime(file.type);
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
    const imagesDataUrl = await fal.storage.upload(zipFile);

    const uploadToken = randomUUID();

    const record: UploadRecord = {
      imagesDataUrl,
      previewUrl,
      createdAt: Date.now(),
    };

    await storeSet(storeKeys.upload(uploadToken), record);

    return Response.json({ uploadToken, previewUrl });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  }
}
