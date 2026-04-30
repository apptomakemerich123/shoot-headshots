import { redirect } from "next/navigation";

/** Optional landing route; Stripe success currently goes to `/results`. */
export default async function ProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sp = await searchParams;
  const sid = sp.session_id;
  if (sid?.startsWith("cs_")) {
    redirect(`/results?session_id=${encodeURIComponent(sid)}`);
  }
  redirect("/upload");
}
