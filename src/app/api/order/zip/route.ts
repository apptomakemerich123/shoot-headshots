import JSZip from "jszip";

import { storeGet, storeKeys } from "@/lib/store";
import type { OrderRecord } from "@/lib/types-order";

export const runtime = "nodejs";

export const maxDuration = 120;

/**
 * Streams a zip of all generated headshots for an order (server-side fetch avoids CORS).
 */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) {
    return Response.json({ error: "Invalid session_id" }, { status: 400 });
  }

  const order = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (!order || order.status !== "ready" || !order.imageUrls?.length) {
    return Response.json({ error: "Order not ready or not found" }, { status: 404 });
  }

  const zip = new JSZip();

  for (let i = 0; i < order.imageUrls.length; i++) {
    const url = order.imageUrls[i];
    const entryName = `portr-headshot-${String(i + 1).padStart(2, "0")}.png`;

    try {
      const imgRes = await fetch(url);
      if (!imgRes.ok) {
        throw new Error(`HTTP ${imgRes.status}`);
      }
      const buf = Buffer.from(await imgRes.arrayBuffer());
      zip.file(entryName, buf);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "fetch failed";
      return Response.json(
        { error: `Could not fetch image ${i + 1}: ${msg}` },
        { status: 502 },
      );
    }
  }

  const zipped = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return new Response(new Uint8Array(zipped), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="portr-headshots.zip"',
      "Cache-Control": "no-store",
    },
  });
}
