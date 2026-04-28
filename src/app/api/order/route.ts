import { storeGet, storeKeys } from "@/lib/store";
import type { OrderRecord } from "@/lib/types-order";

export const runtime = "nodejs";

/** Load completed/processing order by Stripe Checkout Session ID (survives refresh). */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) {
    return Response.json({ error: "Missing or invalid session_id" }, { status: 400 });
  }

  const order = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (!order) {
    return Response.json({ error: "Order not found yet" }, { status: 404 });
  }

  return Response.json(order);
}
