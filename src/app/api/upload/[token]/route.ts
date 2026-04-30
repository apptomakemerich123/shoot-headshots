import { storeGet, storeKeys } from "@/lib/store";
import type { UploadRecord } from "@/lib/types-order";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  const record = await storeGet<UploadRecord>(storeKeys.upload(token));
  if (!record) {
    return Response.json({ error: "Unknown or expired upload" }, { status: 404 });
  }

  return Response.json({
    previewUrl: record.previewUrl,
    createdAt: record.createdAt,
  });
}
