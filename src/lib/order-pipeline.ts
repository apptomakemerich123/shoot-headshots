import { createAstriaTune } from "@/lib/astria";
import { patchOrder } from "@/lib/patch-order";
import { storeDel, storeGet, storeKeys, storeSet, storeSetNx } from "@/lib/store";
import type { OrderRecord } from "@/lib/types-order";

function trainingEnqueueLockKey(sessionId: string) {
  return `order-train-enqueue:${sessionId}`;
}

/**
 * Idempotent: creates an Astria fine-tune from the training zip and stores `astriaTuneId`.
 * Astria calls back when training completes; we then enqueue 40 prompts via webhook handler.
 */
export async function submitTrainingForOrder(sessionId: string): Promise<void> {
  const got = await storeSetNx(trainingEnqueueLockKey(sessionId), "1", 180);
  if (!got) return;

  try {
    const order = await storeGet<OrderRecord>(storeKeys.order(sessionId));
    if (!order?.imagesDataUrl || order.astriaTuneId != null) return;

    const tuneId = await createAstriaTune({
      sessionId,
      zipUrl: order.imagesDataUrl,
    });

    await patchOrder(sessionId, {
      astriaTuneId: tuneId,
      jobPhase: "training",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Astria tune creation failed";
    const last = await storeGet<OrderRecord>(storeKeys.order(sessionId));
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      gender: last?.gender,
      imagesDataUrl: last?.imagesDataUrl,
      previewUrl: last?.previewUrl,
      customerEmail: last?.customerEmail,
      error: msg,
      updatedAt: Date.now(),
    } satisfies OrderRecord);
  } finally {
    await storeDel(trainingEnqueueLockKey(sessionId));
  }
}

/**
 * Ensures training is submitted if missing; returns latest order (polling UI / status route).
 * Generation is driven by Astria webhooks after the tune finishes training.
 */
export async function advanceOrderFromQueue(
  sessionId: string,
): Promise<OrderRecord | null> {
  let order = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (!order) return null;
  if (order.status === "ready" || order.status === "failed") {
    return order;
  }
  if (order.status !== "processing") {
    return order;
  }

  if (order.imagesDataUrl && order.astriaTuneId == null) {
    await submitTrainingForOrder(sessionId);
    order = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  }

  return storeGet<OrderRecord>(storeKeys.order(sessionId));
}
