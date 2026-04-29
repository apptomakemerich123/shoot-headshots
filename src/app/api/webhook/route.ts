import { after } from "next/server";
import Stripe from "stripe";

import { sendHeadshotDeliveryEmail } from "@/lib/email";
import { generateHeadshotBatch } from "@/lib/generate-headshots";
import { storeGet, storeKeys, storeSet } from "@/lib/store";
import { PRODUCT, type OrderRecord, type UploadRecord } from "@/lib/types-order";
import { buildVariationList } from "@/lib/variations";

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

async function runGenerationJob(params: {
  sessionId: string;
  beforeUrl: string;
  customerEmail: string;
}) {
  const { sessionId, beforeUrl, customerEmail } = params;

  try {
    const specs = buildVariationList(PRODUCT.count);
    const { urls, labels } = await generateHeadshotBatch(beforeUrl, specs);

    const ready: OrderRecord = {
      status: "ready",
      beforeUrl,
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
      beforeUrl,
      customerEmail,
      error: msg,
      updatedAt: Date.now(),
    } satisfies OrderRecord);
  }
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
  if (!upload?.beforeUrl) {
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      error: "Upload expired or missing",
      updatedAt: Date.now(),
    } satisfies OrderRecord);
    return Response.json({ received: true });
  }

  const email =
    session.customer_details?.email ?? session.customer_email ?? null;
  if (!email) {
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      beforeUrl: upload.beforeUrl,
      error: "No customer email on this Checkout session",
      updatedAt: Date.now(),
    } satisfies OrderRecord);
    return Response.json({ received: true });
  }

  await storeSet(storeKeys.order(sessionId), {
    status: "processing",
    beforeUrl: upload.beforeUrl,
    customerEmail: email,
    updatedAt: Date.now(),
  } satisfies OrderRecord);

  after(async () => {
    await runGenerationJob({
      sessionId,
      beforeUrl: upload.beforeUrl,
      customerEmail: email,
    });
  });

  return Response.json({ received: true, status: "processing" as const });
}
