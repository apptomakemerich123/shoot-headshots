export async function sendHeadshotDeliveryEmail(opts: {
  to: string;
  imageUrls: string[];
  labels?: string[];
  productLabel: string;
}): Promise<{ sent: boolean; reason?: string }> {
  void opts;
  return { sent: false, reason: "email_disabled" };
}
