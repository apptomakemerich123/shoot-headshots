import { sendHeadshotDeliveryEmail } from "@/lib/email";
import {
  enqueueAstriaVariationPrompts,
  extractImageUrlsFromAstriaPromptPayload,
  isTuneObjectLikelyComplete,
  unwrapAstriaEntity,
} from "@/lib/astria";
import { patchOrder } from "@/lib/patch-order";
import { storeDel, storeGet, storeKeys, storeSet, storeSetNx } from "@/lib/store";
import { PRODUCT, type OrderRecord } from "@/lib/types-order";
import { buildVariationList, variationDisplayLabels } from "@/lib/variations";

function astriaPromptsLockKey(sessionId: string) {
  return `astria-prompts-lock:${sessionId}`;
}

export async function handleAstriaTuneWebhook(
  sessionId: string,
  body: unknown,
): Promise<Response> {
  const entity = unwrapAstriaEntity(body);
  const rawId = entity?.id;
  const tuneId =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string"
        ? Number(rawId)
        : NaN;

  if (!entity || !Number.isFinite(tuneId)) {
    return Response.json({ ok: false, error: "bad_tune_payload" }, { status: 400 });
  }

  if (!isTuneObjectLikelyComplete(entity)) {
    return Response.json({ ok: true, ignored: "not_ready" });
  }

  const order = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (!order || order.status !== "processing") {
    return Response.json({ ok: true, ignored: "no_active_order" });
  }

  if (order.astriaTuneId !== tuneId) {
    return Response.json({ ok: false, error: "tune_id_mismatch" }, { status: 400 });
  }

  if (order.astriaPromptsSubmitted) {
    return Response.json({ ok: true, idempotent: true });
  }

  const got = await storeSetNx(astriaPromptsLockKey(sessionId), "1", 300);
  if (!got) {
    return Response.json({ ok: true, deduped: true });
  }

  try {
    let tuneToken = order.astriaTuneToken;
    if (
      (!tuneToken || tuneToken.length === 0) &&
      typeof entity.token === "string" &&
      entity.token.length > 0
    ) {
      tuneToken = entity.token;
      await patchOrder(sessionId, { astriaTuneToken: tuneToken });
    }
    if (!tuneToken || tuneToken.length === 0) {
      throw new Error(
        "Missing Astria tune token on order (full trigger string required for prompts)",
      );
    }

    const specs = buildVariationList(PRODUCT.count, tuneToken);

    await patchOrder(sessionId, {
      jobPhase: "generating",
      astriaPromptSlots: Array.from({ length: PRODUCT.count }, () => null),
    });

    await enqueueAstriaVariationPrompts({
      sessionId,
      tuneId,
      specs,
      tuneToken,
    });

    await patchOrder(sessionId, { astriaPromptsSubmitted: true });

    return Response.json({ ok: true, enqueued: PRODUCT.count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Astria prompt enqueue failed";
    const last = await storeGet<OrderRecord>(storeKeys.order(sessionId));
    await storeSet(storeKeys.order(sessionId), {
      status: "failed",
      gender: last?.gender,
      imagesDataUrl: last?.imagesDataUrl,
      previewUrl: last?.previewUrl,
      customerEmail: last?.customerEmail,
      astriaTuneId: last?.astriaTuneId,
      astriaTuneToken: last?.astriaTuneToken,
      error: msg,
      updatedAt: Date.now(),
    } satisfies OrderRecord);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    await storeDel(astriaPromptsLockKey(sessionId));
  }
}

export async function handleAstriaPromptWebhook(
  sessionId: string,
  index: number,
  body: unknown,
): Promise<Response> {
  if (!Number.isFinite(index) || index < 0 || index >= PRODUCT.count) {
    return Response.json({ ok: false, error: "bad_index" }, { status: 400 });
  }

  const urls = extractImageUrlsFromAstriaPromptPayload(body);
  const imageUrl = urls[0];
  if (!imageUrl) {
    console.error("[astria webhook] prompt callback missing image URLs", {
      sessionId,
      index,
      keys:
        body && typeof body === "object"
          ? Object.keys(body as object)
          : typeof body,
    });
    return Response.json({ ok: false, error: "no_image_in_callback" });
  }

  await mergeAstriaPromptSlot(sessionId, index, imageUrl);
  return Response.json({ ok: true });
}

async function mergeAstriaPromptSlot(
  sessionId: string,
  index: number,
  imageUrl: string,
): Promise<void> {
  const cur = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (!cur || cur.status !== "processing") return;

  const slots = Array.from({ length: PRODUCT.count }, (_, i) =>
    cur.astriaPromptSlots?.[i] ?? null,
  );

  if (slots[index]) return;

  const next = [...slots];
  next[index] = imageUrl;

  const labels = variationDisplayLabels(PRODUCT.count);

  const filled = next.every((u) => typeof u === "string" && u.length > 0);
  if (!filled) {
    await storeSet(storeKeys.order(sessionId), {
      ...cur,
      astriaPromptSlots: next,
      jobPhase: "generating",
      updatedAt: Date.now(),
    });
    return;
  }

  const ready: OrderRecord = {
    status: "ready",
    gender: cur.gender,
    imagesDataUrl: cur.imagesDataUrl,
    previewUrl: cur.previewUrl,
    astriaTuneId: cur.astriaTuneId,
    astriaTuneToken: cur.astriaTuneToken,
    astriaPromptsSubmitted: true,
    astriaPromptSlots: next,
    imageUrls: next as string[],
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
}
