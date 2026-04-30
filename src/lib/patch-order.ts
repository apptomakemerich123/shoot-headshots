import { storeGet, storeKeys, storeSet } from "@/lib/store";
import type { OrderRecord } from "@/lib/types-order";

/** Merge fields into an existing order row (no-op if missing). */
export async function patchOrder(
  sessionId: string,
  patch: Partial<OrderRecord>,
): Promise<void> {
  const cur = await storeGet<OrderRecord>(storeKeys.order(sessionId));
  if (!cur) return;
  await storeSet(storeKeys.order(sessionId), {
    ...cur,
    ...patch,
    updatedAt: Date.now(),
  });
}
