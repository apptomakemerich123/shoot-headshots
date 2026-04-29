import { Resend } from "resend";

import { PRODUCT } from "@/lib/types-order";

function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

function resultsUrl(sessionId: string): string {
  const base = appBaseUrl();
  const q = new URLSearchParams({ session_id: sessionId });
  return `${base}/results?${q.toString()}`;
}

/**
 * Sends the “headshots ready” email after generation completes (webhook or
 * order/complete job). Requires `RESEND_API_KEY`. Optional `RESEND_FROM_EMAIL`.
 */
export async function sendHeadshotDeliveryEmail(opts: {
  to: string;
  sessionId: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return { sent: false, reason: "no_api_key" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Portr <onboarding@resend.dev>";

  const link = resultsUrl(opts.sessionId);
  const body = `Hi, your ${PRODUCT.count} AI headshots are ready. View and download them here: ${link}. Your photos are saved for 30 days. — Portr team`;

  const hrefSafe = link.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const linkTextSafe = link.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<p>Hi, your ${PRODUCT.count} AI headshots are ready. View and download them here: <a href="${hrefSafe}">${linkTextSafe}</a>. Your photos are saved for 30 days. — Portr team</p>`;

  const resend = new Resend(key);

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: "Your Portr headshots are ready",
    text: body,
    html,
  });

  if (error) {
    console.error("[email] Resend error:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}
