import { Resend } from "resend";

export async function sendHeadshotDeliveryEmail(opts: {
  to: string;
  imageUrls: string[];
  labels?: string[];
  productLabel: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return { sent: false as const, reason: "no_api_key" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Portr <onboarding@resend.dev>";

  const resend = new Resend(key);

  const linksHtml = opts.imageUrls
    .map((url, i) => {
      const title = opts.labels?.[i] ?? `Photo ${i + 1}`;
      return `<li style="margin:8px 0"><a href="${url}">${title}</a></li>`;
    })
    .join("");

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `Your ${opts.productLabel} — download links`,
    html: `
      <p>Thanks for choosing Portr. Here are your headshot downloads (${opts.imageUrls.length} files):</p>
      <ol style="padding-left:20px">${linksHtml}</ol>
      <p style="color:#666;font-size:14px">Your gallery is saved with your order — reopen your results link anytime.</p>
    `,
  });

  if (error) {
    console.error("[email] Resend error:", error);
    return { sent: false as const, reason: error.message };
  }

  return { sent: true as const };
}
