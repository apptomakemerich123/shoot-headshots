import {
  handleAstriaPromptWebhook,
  handleAstriaTuneWebhook,
} from "@/lib/astria-order-handlers";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Astria callbacks: tune training complete → enqueue 40 prompts; each prompt complete → slot URL.
 * Query: session_id, kind=tune|prompt, idx (prompt index 0–39).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const kind = url.searchParams.get("kind");

  if (!sessionId?.startsWith("cs_")) {
    return Response.json({ error: "invalid session_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (kind === "tune") {
    return handleAstriaTuneWebhook(sessionId, body);
  }

  if (kind === "prompt") {
    const idxRaw = url.searchParams.get("idx");
    if (idxRaw === null || idxRaw === "") {
      return Response.json({ error: "prompt_missing_idx" }, { status: 400 });
    }
    const idx = Number(idxRaw);
    if (!Number.isFinite(idx)) {
      return Response.json({ error: "prompt_bad_idx" }, { status: 400 });
    }
    return handleAstriaPromptWebhook(sessionId, idx, body);
  }

  return Response.json({ error: "missing_or_invalid kind" }, { status: 400 });
}
