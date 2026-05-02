import Stripe from "stripe";

import { submitTrainingForOrder } from "@/lib/order-pipeline";
import { storeGet, storeKeys, storeSet } from "@/lib/store";
import type { OrderGender, OrderRecord, UploadRecord } from "@/lib/types-order";

export const runtime = "nodejs";

/** Submit Astria fine-tune and return quickly (Hobby max 300s). */
export const maxDuration = 300;

function stripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

/**
 * Validates payment and marks processing, then starts Astria fine-tuning (webhook-driven generation).
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
    await submitTrainingForOrder(sessionId);
    const afterTrain = await storeGet<OrderRecord>(storeKeys.order(sessionId));
    if (afterTrain?.status === "failed") {
      return Response.json(
        {
          ok: false,
          status: "failed" as const,
          error:
            afterTrain.error ??
            "We could not start training. Check server logs and Astria configuration.",
        },
        { status: 502 },
      );
    }
    return Response.json({ ok: true, status: "processing" as const });
  }

  const uploadToken = session.metadata?.uploadToken;
  if (!uploadToken) {
    return Response.json(
      { error: "Checkout session missing upload metadata" },
      { status: 400 },
    );
  }

  const upload = await storeGet<UploadRecord>(storeKeys.upload(uploadToken));
  if (!upload?.imagesDataUrl) {
    return Response.json({ error: "Upload expired or missing" }, { status: 400 });
  }

  const gender: OrderGender = upload.gender ?? "man";

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
    gender,
    imagesDataUrl: upload.imagesDataUrl,
    previewUrl: upload.previewUrl,
    customerEmail: email,
    jobPhase: "training",
    updatedAt: Date.now(),
  } satisfies OrderRecord);

  await submitTrainingForOrder(sessionId);

  const afterTrain = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (afterTrain?.status === "failed") {
    return Response.json(
      {
        ok: false,
        status: "failed" as const,
        error:
          afterTrain.error ??
          "We could not start training. Check server logs and Astria configuration.",
      },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, status: "processing" as const });
}
