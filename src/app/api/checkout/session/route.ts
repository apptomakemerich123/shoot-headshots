import Stripe from "stripe";

import { storeGet, storeKeys } from "@/lib/store";
import type { UploadRecord } from "@/lib/types-order";
import { PRODUCT } from "@/lib/types-order";

export const runtime = "nodejs";

function getOrigin(req: Request) {
  return req.headers.get("origin") ?? "http://localhost:3000";
}

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json(
      { error: "Stripe is not configured (missing STRIPE_SECRET_KEY)" },
      { status: 503 },
    );
  }

  let body: { uploadToken?: string };
  try {
    body = (await req.json()) as { uploadToken?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const uploadToken = body.uploadToken;
  if (!uploadToken) {
    return Response.json({ error: "Missing uploadToken" }, { status: 400 });
  }

  const upload = await storeGet<UploadRecord>(storeKeys.upload(uploadToken));
  if (!upload) {
    return Response.json({ error: "Upload not found — start over" }, { status: 400 });
  }

  const stripe = new Stripe(key);
  const origin = getOrigin(req);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: PRODUCT.label,
            description:
              "10 AI headshot variations — multiple backgrounds and lighting",
          },
          unit_amount: PRODUCT.cents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      uploadToken,
    },
    success_url: `${origin}/results?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/upload`,
  });

  if (!session.url) {
    return Response.json(
      { error: "Could not create checkout session" },
      { status: 500 },
    );
  }

  return Response.json({ url: session.url });
}
