import Stripe from "stripe";

export const runtime = "nodejs";

function getOrigin(req: Request) {
  return req.headers.get("origin") ?? "http://localhost:3000";
}

/** One-time payment for headshot download — $19.99 USD */
const PRICE_CENTS = 1999;

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json(
      { error: "Stripe is not configured (missing STRIPE_SECRET_KEY)" },
      { status: 503 },
    );
  }

  const stripe = new Stripe(key);

  const origin = getOrigin(req);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Shoot — Professional Headshot download" },
          unit_amount: PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/results?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/results`,
  });

  if (!session.url) {
    return Response.json(
      { error: "Could not create checkout session" },
      { status: 500 },
    );
  }

  return Response.json({ url: session.url });
}

