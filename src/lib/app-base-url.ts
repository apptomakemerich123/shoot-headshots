/**
 * Public HTTPS origin for Astria webhooks (callbacks must reach your deployed app).
 */

export type ResolvedWebhookBase =
  | { ok: true; url: string; source: string }
  | { ok: false; message: string };

/** Log env presence (never log secret values). */
export function logAstriaWebhookEnvDiagnostics(): void {
  console.error("[astria env] webhook URL resolution", {
    ASTRIA_WEBHOOK_BASE: process.env.ASTRIA_WEBHOOK_BASE?.trim()
      ? "(set)"
      : "(unset)",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim()
      ? "(set)"
      : "(unset)",
    VERCEL_URL: process.env.VERCEL_URL?.trim() ? "(set)" : "(unset)",
  });
}

/**
 * Resolve a public HTTPS base URL for Astria tune/prompt callbacks.
 * Prefer ASTRIA_WEBHOOK_BASE in production so previews/local match your real deploy URL.
 */
export function tryResolvePublicWebhookBase(): ResolvedWebhookBase {
  const explicit =
    process.env.ASTRIA_WEBHOOK_BASE?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    const url = explicit.replace(/\/$/, "");
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      return {
        ok: false,
        message:
          "ASTRIA_WEBHOOK_BASE or NEXT_PUBLIC_APP_URL must be a full URL (e.g. https://www.example.com).",
      };
    }
    return {
      ok: true,
      url,
      source: process.env.ASTRIA_WEBHOOK_BASE?.trim()
        ? "ASTRIA_WEBHOOK_BASE"
        : "NEXT_PUBLIC_APP_URL",
    };
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const url = (vercel.startsWith("http") ? vercel : `https://${vercel}`).replace(
      /\/$/,
      "",
    );
    return { ok: true, url, source: "VERCEL_URL" };
  }

  return {
    ok: false,
    message:
      "No public HTTPS URL for Astria webhooks. Set ASTRIA_WEBHOOK_BASE (or NEXT_PUBLIC_APP_URL) to your live site (e.g. https://your-domain.com). Without this, tunes may start but callbacks never reach the server. On Vercel, VERCEL_URL is usually set automatically.",
  };
}

export function getPublicAppBaseUrl(): string {
  const r = tryResolvePublicWebhookBase();
  if (!r.ok) throw new Error(r.message);
  return r.url;
}
