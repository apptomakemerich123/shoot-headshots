import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Persistence order:
 * 1. Vercel KV when KV_* env vars are set
 * 2. Otherwise JSON file `.data/portr-store.json` (survives dev HMR / multi-worker)
 *    Opt out with PORT_MEMORY_STORE_ONLY=1 if you truly want in-memory only.
 * 3. Fallback in-memory if disk write fails (e.g. read-only FS)
 */

type StoredValue = Record<string, unknown>;

const memory = new Map<string, string>();

let warnedFileFallback = false;

function isKvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** Use durable local file whenever KV is not configured (fixes "Upload not found" in dev). */
function isFilePersistenceEnabled(): boolean {
  if (process.env.PORT_MEMORY_STORE_ONLY === "1") return false;
  return !isKvConfigured();
}

const FILE_PATH = path.join(process.cwd(), ".data", "portr-store.json");

async function fileLoad(): Promise<StoredValue> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as StoredValue;
  } catch {
    return {};
  }
}

async function fileSave(data: StoredValue): Promise<void> {
  await mkdir(path.dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function storeGet<T>(key: string): Promise<T | null> {
  if (isKvConfigured()) {
    try {
      const { kv } = await import("@vercel/kv");
      const v = await kv.get<T>(key);
      return v ?? null;
    } catch {
      /* fall through */
    }
  }
  if (isFilePersistenceEnabled()) {
    try {
      const db = await fileLoad();
      const raw = db[key];
      return (raw ?? null) as T | null;
    } catch {
      /* fall through */
    }
  }
  const s = memory.get(key);
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export async function storeSet(key: string, value: unknown): Promise<void> {
  if (isKvConfigured()) {
    try {
      const { kv } = await import("@vercel/kv");
      await kv.set(key, value);
      return;
    } catch {
      /* fall through */
    }
  }
  if (isFilePersistenceEnabled()) {
    try {
      const db = await fileLoad();
      db[key] = value as StoredValue[string];
      await fileSave(db);
      return;
    } catch (e) {
      if (!warnedFileFallback) {
        warnedFileFallback = true;
        console.warn(
          "[portr/store] File persist failed, using memory:",
          e instanceof Error ? e.message : e,
        );
      }
    }
  }
  memory.set(key, JSON.stringify(value));
}

export async function storeDel(key: string): Promise<void> {
  if (isKvConfigured()) {
    try {
      const { kv } = await import("@vercel/kv");
      await kv.del(key);
      return;
    } catch {
      /* fall through */
    }
  }
  if (isFilePersistenceEnabled()) {
    try {
      const db = await fileLoad();
      delete db[key];
      await fileSave(db);
      return;
    } catch {
      /* fall through */
    }
  }
  memory.delete(key);
}

export const storeKeys = {
  upload: (token: string) => `upload:${token}`,
  order: (stripeSessionId: string) => `order:${stripeSessionId}`,
};
