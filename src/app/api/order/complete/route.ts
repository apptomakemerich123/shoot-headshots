import { after } from "next/server";
import Stripe from "stripe";

import { sendHeadshotDeliveryEmail } from "@/lib/email";
import { trainAndGenerateHeadshotBatch } from "@/lib/generate-headshots";
import { patchOrder } from "@/lib/patch-order";
import { storeGet, storeKeys, storeSet } from "@/lib/store";
import { PRODUCT, type OrderRecord } from "@/lib/types-order";
import { buildVariationList } from "@/lib/variations";

export const runtime = "nodejs";

/** Train LoRA (~15–20 min) + generate 12 images — needs a generous host timeout. */
export const maxDuration = 900;

function stripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

async function runGenerationJob(params: {
  sessionId: string;
  imagesDataUrl: string;
  previewUrl: string;
  customerEmail: string;
}) {
  const { sessionId, imagesDataUrl, previewUrl, customerEmail } = params;

  try {
    const specs = buildVariationList(PRODUCT.count);

    const { urls, labels } = await trainAndGenerateHeadshotBatch(
      imagesDataUrl,
      specs,
      async (phase) => {
        await patchOrder(sessionId, { jobPhase: phase });
      },
    );

    const ready: OrderRecord = {
      status: "ready",
      imagesDataUrl,
      previewUrl,
      imageUrls: urls,
      labels,
      customerEmail,
      emailSent: false,
      updatedAt: Date.now(),
    };

    await storeSet(storeKeys.order(sessionId), ready);

    const sendResult = await sendHeadshotDeliveryEmail({
      to: customerEmail,
      sessionId,
    });

    await storeSet(storeKeys.order(sessionId), {
      ...ready,
      emailSent: sendResult.sent === true,
      updatedAt: Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      imagesDataUrl,
      previewUrl,
      customerEmail,
      error: msg,
      updatedAt: Date.now(),
    } satisfies OrderRecord);
  }
}

/**
 * Validates payment and marks processing, then kicks off train + generate in `after()`
 * so the redirect page gets an immediate JSON response.
 */
export async function POST(req: Request) {
  let body: { sessionId?: string };
  try {
    body = (await req.json()) as { sessionId?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId;
  if (!sessionId?.startsWith("cs_")) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret());

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return Response.json({ error: "Invalid Stripe session" }, { status: 400 });
  }

  if (session.payment_status !== "paid") {
    return Response.json({ error: "Payment not completed" }, { status: 402 });
  }

  const existing = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (existing?.status === "ready") {
    return Response.json({ ok: true, status: "ready" as const });
  }
  if (existing?.status === "processing") {
    return Response.json({ ok: true, status: "processing" as const });
  }

  const uploadToken = session.metadata?.uploadToken;
  if (!uploadToken) {
    return Response.json(
      { error: "Checkout session missing upload metadata" },
      { status: 400 },
    );
  }

  const upload = await storeGet<{
    imagesDataUrl: string;
    previewUrl: string;
  }>(storeKeys.upload(uploadToken));
  if (!upload?.imagesDataUrl) {
    return Response.json({ error: "Upload expired or missing" }, { status: 400 });
  }

  const email =
    session.customer_details?.email ?? session.customer_email ?? null;

  if (!email) {
    return Response.json(
      {
        error:
          "No customer email on this Checkout session. Enter your email in Stripe Checkout before paying.",
      },
      { status: 400 },
    );
  }

  await storeSet(storeKeys.order(sessionId), {
    status: "processing",
    imagesDataUrl: upload.imagesDataUrl,
    previewUrl: upload.previewUrl,
    customerEmail: email,
    jobPhase: "training",
    updatedAt: Date.now(),
  } satisfies OrderRecord);

  after(async () => {
    await runGenerationJob({
      sessionId,
      imagesDataUrl: upload.imagesDataUrl,
      previewUrl: upload.previewUrl,
      customerEmail: email,
    });
  });

  return Response.json({ ok: true, status: "processing" as const });
}
