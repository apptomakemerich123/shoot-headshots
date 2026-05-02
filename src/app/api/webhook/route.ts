import Stripe from "stripe";

import { submitTrainingForOrder } from "@/lib/order-pipeline";
import { storeGet, storeKeys, storeSet } from "@/lib/store";
import type { OrderGender, OrderRecord, UploadRecord } from "@/lib/types-order";

export const runtime = "nodejs";
export const maxDuration = 300;

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

function stripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeSecretKey());
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret(),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid webhook signature";
    return Response.json({ error: msg }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  if (!sessionId?.startsWith("cs_")) {
    return Response.json({ received: true });
  }

  const existing = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (existing?.status === "ready" || existing?.status === "processing") {
    return Response.json({ received: true, status: existing.status });
  }

  const uploadToken = session.metadata?.uploadToken;
  if (!uploadToken) {
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      error: "Checkout session missing upload metadata",
      updatedAt: Date.now(),
    } satisfies OrderRecord);
    return Response.json({ received: true });
  }

  const upload = await storeGet<UploadRecord>(storeKeys.upload(uploadToken));
  if (!upload?.imagesDataUrl) {
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      error: "Upload expired or missing",
      updatedAt: Date.now(),
    } satisfies OrderRecord);
    return Response.json({ received: true });
  }

  const gender: OrderGender =
    upload.gender ??
    (session.metadata?.gender === "woman" || session.metadata?.gender === "man"
      ? session.metadata.gender
      : "man");

  const email =
    session.customer_details?.email ?? session.customer_email ?? null;
  if (!email) {
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      imagesDataUrl: upload.imagesDataUrl,
      previewUrl: upload.previewUrl,
      error: "No customer email on this Checkout session",
      updatedAt: Date.now(),
    } satisfies OrderRecord);
    return Response.json({ received: true });
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

  return Response.json({ received: true, status: "processing" as const });
}
