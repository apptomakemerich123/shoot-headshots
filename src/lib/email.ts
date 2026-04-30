import { Resend } from "resend";

import { PRODUCT } from "@/lib/types-order";

/** Public results links in customer email (override for staging). */
const RESULTS_ORIGIN =
  process.env.EMAIL_RESULTS_ORIGIN?.trim().replace(/\/$/, "") ||
  "https://www.getportr.com";

function resultsPageUrl(sessionId: string): string {
  return `${RESULTS_ORIGIN}/results/${encodeURIComponent(sessionId)}`;
}

/**
 * Sends the “headshots ready” email after generation completes (webhook or
 * order/complete job). Uses `process.env.RESEND_API_KEY`.
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

  const from = "Portr <onboarding@resend.dev>";
  const href = resultsPageUrl(opts.sessionId);
  const hrefAttr = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  const text = `Hi! Your ${PRODUCT.count} AI headshots are ready.\n\nView and download them here:\n${href}\n\nYour photos are saved for 30 days.\n\n— The Portr team`;

  const html = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:32px 20px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0a0a0a;color:#e8e8e8;line-height:1.55;">
    <p style="margin:0 0 12px;font-size:16px;">Hi! Your ${PRODUCT.count} AI headshots are ready.</p>
    <p style="margin:0 0 28px;font-size:15px;color:#b9b9b9;">Click below to view and download them.</p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${hrefAttr}" style="display:inline-block;padding:16px 36px;background:#ffffff;color:#0a0a0a;text-decoration:none;border-radius:9999px;font-weight:600;font-size:16px;">View and download headshots</a>
    </div>
    <p style="margin:0 0 8px;font-size:14px;color:#b9b9b9;">Your photos are saved for 30 days.</p>
    <p style="margin:0;font-size:14px;color:#9a9a9a;">— The Portr team</p>
  </body>
</html>`;

  const resend = new Resend(key);

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: "Your Portr headshots are ready!",
    text,
    html,
  });

  if (error) {
    console.error("[email] Resend error:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}
