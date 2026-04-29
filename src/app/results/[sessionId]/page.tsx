import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ sessionId: string }> };

/** Pretty email links: /results/cs_… → same UI as ?session_id= */
export default async function ResultsSessionAlias({ params }: PageProps) {
  const { sessionId } = await params;
  redirect(`/results?session_id=${encodeURIComponent(sessionId)}`);
}
