import { fal } from "@fal-ai/client";

import { sendHeadshotDeliveryEmail } from "@/lib/email";
import type { FluxLoraFastTrainingOutput } from "@/lib/fal-flux-lora-types";
import {
  TRAINING_MODEL_ID,
  generateSingleFluxHeadshot,
  submitLoraTrainingQueue,
} from "@/lib/generate-headshots";
import { patchOrder } from "@/lib/patch-order";
import { storeDel, storeGet, storeKeys, storeSet, storeSetNx } from "@/lib/store";
import { PRODUCT, type OrderRecord } from "@/lib/types-order";
import { buildVariationList } from "@/lib/variations";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function pipelineLockKey(sessionId: string) {
  return `order-pipeline-lock:${sessionId}`;
}

function trainingEnqueueLockKey(sessionId: string) {
  return `order-train-enqueue:${sessionId}`;
}

/**
 * Idempotent: submits LoRA training to the FAL queue and stores `trainingRequestId`.
 */
export async function submitTrainingForOrder(sessionId: string): Promise<void> {
  const got = await storeSetNx(trainingEnqueueLockKey(sessionId), "1", 180);
  if (!got) return;

  try {
    const order = await storeGet<OrderRecord>(storeKeys.order(sessionId));
    if (!order?.imagesDataUrl || order.trainingRequestId) return;

    fal.config({ credentials: requireEnv("FAL_KEY") });
    const trainingRequestId = await submitLoraTrainingQueue(order.imagesDataUrl);
    await patchOrder(sessionId, {
      trainingRequestId,
      jobPhase: "training",
    });
  } finally {
    await storeDel(trainingEnqueueLockKey(sessionId));
  }
}

/**
 * Check FAL training / generate the next headshot. Call from GET /api/order/status on a poll.
 * Single-flighted per session to avoid duplicate work under parallel polls.
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

  if (order.imagesDataUrl && !order.trainingRequestId) {
    await submitTrainingForOrder(sessionId);
    order = await storeGet<OrderRecord>(storeKeys.order(sessionId));
    if (!order || order.status !== "processing") return order ?? null;
  }

  const got = await storeSetNx(pipelineLockKey(sessionId), "1", 240);
  if (!got) {
    return storeGet<OrderRecord>(storeKeys.order(sessionId));
  }

  try {
    let cur = await storeGet<OrderRecord>(storeKeys.order(sessionId));
    if (!cur || cur.status !== "processing") return cur;

    fal.config({ credentials: requireEnv("FAL_KEY") });

    if (cur.trainingRequestId && !cur.loraWeightsUrl) {
      const st = await fal.queue.status(TRAINING_MODEL_ID, {
        requestId: cur.trainingRequestId,
      });
      if (st.status === "IN_QUEUE" || st.status === "IN_PROGRESS") {
        return cur;
      }
      if (st.status === "COMPLETED") {
        const res = await fal.queue.result(TRAINING_MODEL_ID, {
          requestId: cur.trainingRequestId,
        });
        const data = res.data as FluxLoraFastTrainingOutput;
        const loraWeightsUrl = data.diffusers_lora_file?.url;
        if (!loraWeightsUrl) {
          throw new Error("LoRA training returned no diffusers_lora_file URL");
        }
        await patchOrder(sessionId, {
          loraWeightsUrl,
          jobPhase: "generating",
        });
        cur = {
          ...cur,
          loraWeightsUrl,
          jobPhase: "generating",
        };
      }
    }

    if (cur.loraWeightsUrl) {
      const specs = buildVariationList(PRODUCT.count);
      const urls = cur.imageUrls ?? [];
      const nextIndex = urls.length;
      if (nextIndex < specs.length) {
        const newUrl = await generateSingleFluxHeadshot(
          cur.loraWeightsUrl,
          specs[nextIndex]!,
        );
        const nextUrls = [...urls, newUrl];
        const labels = specs.slice(0, nextUrls.length).map((s) => s.label);
        await patchOrder(sessionId, {
          imageUrls: nextUrls,
          labels,
          jobPhase: "generating",
        });
        cur = { ...cur, imageUrls: nextUrls, labels, jobPhase: "generating" };

        if (nextUrls.length >= PRODUCT.count) {
          const ready: OrderRecord = {
            status: "ready",
            imagesDataUrl: cur.imagesDataUrl,
            previewUrl: cur.previewUrl,
            trainingRequestId: cur.trainingRequestId,
            loraWeightsUrl: cur.loraWeightsUrl,
            imageUrls: nextUrls,
            labels,
            customerEmail: cur.customerEmail,
            emailSent: false,
            jobPhase: "generating",
            updatedAt: Date.now(),
          };
          await storeSet(storeKeys.order(sessionId), ready);

          let emailSent = false;
          if (cur.customerEmail) {
            const sendResult = await sendHeadshotDeliveryEmail({
              to: cur.customerEmail,
              sessionId,
            });
            emailSent = sendResult.sent === true;
          }
          await storeSet(storeKeys.order(sessionId), {
            ...ready,
            emailSent,
            updatedAt: Date.now(),
          });
          return storeGet<OrderRecord>(storeKeys.order(sessionId));
        }
      }
    }

    return storeGet<OrderRecord>(storeKeys.order(sessionId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    const last = await storeGet<OrderRecord>(storeKeys.order(sessionId));
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      imagesDataUrl: last?.imagesDataUrl,
      previewUrl: last?.previewUrl,
      customerEmail: last?.customerEmail,
      trainingRequestId: last?.trainingRequestId,
      error: msg,
      updatedAt: Date.now(),
    } satisfies OrderRecord);
    return storeGet<OrderRecord>(storeKeys.order(sessionId));
  } finally {
    await storeDel(pipelineLockKey(sessionId));
  }
}
