/**
 * Resolve FAL API credentials the same way as @fal-ai/client (FAL_KEY or FAL_KEY_ID + FAL_KEY_SECRET).
 */
export function getFalKeyFromEnv(): string {
  const single = process.env.FAL_KEY?.trim();
  if (single) return single;
  const id = process.env.FAL_KEY_ID?.trim();
  const secret = process.env.FAL_KEY_SECRET?.trim();
  if (id && secret) return `${id}:${secret}`;
  throw new Error("FAL_KEY (or FAL_KEY_ID + FAL_KEY_SECRET) is not set");
}

/** HTTPS URLs on fal-controlled hosts (storage CDN). Mitigates open redirects / SSRF. */
export function isTrustedFalStorageUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "fal.media" ||
      h.endsWith(".fal.media") ||
      h === "fal.ai" ||
      h.endsWith(".fal.ai")
    );
  } catch {
    return false;
  }
}
