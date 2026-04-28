import { fal } from "@fal-ai/client";

export const runtime = "nodejs";

// NOTE: The `flux-kontext-apps/professional-headshot` identifier is commonly
// referenced on other providers; on fal.ai the headshot endpoint is:
// `fal-ai/image-apps-v2/headshot-photo`.
const MODEL_ID = "fal-ai/image-apps-v2/headshot-photo";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function POST(req: Request) {
  try {
    fal.config({ credentials: requireEnv("FAL_KEY") });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }

    const beforeUrl = await fal.storage.upload(file);

    const result = await fal.subscribe(MODEL_ID, {
      input: {
        image_url: beforeUrl,
        background_style: "professional",
        aspect_ratio: { ratio: "3:4" },
      },
      pollInterval: 2000,
    });

    const images = (
      result as unknown as { data?: { images?: Array<{ url: string }> } }
    ).data?.images;
    const afterUrl = images?.[0]?.url;

    if (!afterUrl) {
      return Response.json(
        { error: "No image returned from model", debug: { model: MODEL_ID } },
        { status: 502 },
      );
    }

    return Response.json({ beforeUrl, afterUrl });
  } catch (e) {
    const err = e as unknown as {
      status?: number;
      body?: unknown;
      message?: string;
    };

    // @fal-ai/client throws ApiError with { status, body }.
    if (typeof err?.status === "number") {
      return Response.json(
        {
          error:
            (typeof err?.message === "string" && err.message) || "FAL error",
          fal: err.body ?? null,
        },
        { status: err.status },
      );
    }

    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

