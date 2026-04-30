import { advanceOrderFromQueue } from "@/lib/order-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Advance async LoRA + generation pipeline and return latest order state (poll from UI). */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) {
    return Response.json({ error: "Missing or invalid session_id" }, { status: 400 });
  }

  const order = await advanceOrderFromQueue(sessionId);
  if (!order) {
    return Response.json({ error: "Order not found yet" }, { status: 404 });
  }

  return Response.json(order);
}
