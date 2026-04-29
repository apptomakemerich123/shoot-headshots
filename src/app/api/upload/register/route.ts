import { fal } from "@fal-ai/client";
import { randomUUID } from "crypto";

import { storeKeys, storeSet } from "@/lib/store";
import type { UploadRecord } from "@/lib/types-order";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/** Upload photo to Fal storage and register a server-side upload token (no generation yet). */
export async function POST(req: Request) {
  try {
    fal.config({ credentials: requireEnv("FAL_KEY") });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }

    const allowed = new Set(["image/jpeg", "image/png"]);
    if (!allowed.has(file.type)) {
      return Response.json(
        { error: "Please upload a JPG or PNG image." },
        { status: 400 },
      );
    }

    const minBytes = 200 * 1024;
    if (file.size < minBytes) {
      return Response.json(
        {
          error:
            "This file is too small (under 200KB). Please choose a higher-quality photo.",
        },
        { status: 400 },
      );
    }

    const beforeUrl = await fal.storage.upload(file);
    const uploadToken = randomUUID();

    const record: UploadRecord = {
      beforeUrl,
      createdAt: Date.now(),
    };

    await storeSet(storeKeys.upload(uploadToken), record);

    return Response.json({ uploadToken, beforeUrl });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  }
}
