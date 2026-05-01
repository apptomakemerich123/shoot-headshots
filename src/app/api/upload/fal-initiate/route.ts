import { getFalKeyFromEnv } from "@/lib/fal-env";

export const runtime = "nodejs";

const FAL_REST = "https://rest.fal.ai";
const INITIATE_PATH = "/storage/upload/initiate?storage_type=fal-cdn-v3";

function jsonErr(status: number, message: string, extra?: Record<string, unknown>) {
  console.error("[upload/fal-initiate]", message, extra ?? "");
  return Response.json({ error: message }, { status });
}

function logErr(phase: string, e: unknown) {
  console.error("[upload/fal-initiate] FAILED at:", phase, e);
}

type InitiateBody = {
  fileName?: string;
  contentType?: string;
};

/**
 * Small JSON payload only — returns presigned-style URLs so the browser can PUT file bytes
 * directly to FAL (bypasses Vercel's ~4.5MB serverless body limit on /api/upload/register).
 */
export async function POST(req: Request) {
  try {
    let key: string;
    try {
      key = getFalKeyFromEnv();
    } catch (e) {
      logErr("env", e);
      return jsonErr(500, "Server configuration error (FAL credentials).");
    }

    let json: InitiateBody;
    try {
      json = (await req.json()) as InitiateBody;
    } catch (e) {
      logErr("parse json", e);
      return jsonErr(400, "Expected JSON body with fileName and contentType.");
    }

    const fileName =
      typeof json.fileName === "string" && json.fileName.trim()
        ? json.fileName.trim().slice(0, 512)
        : `upload_${Date.now()}.bin`;
    const contentType =
      typeof json.contentType === "string" && json.contentType.trim()
        ? json.contentType.trim().slice(0, 200)
        : "application/octet-stream";

    const targetUrl = `${FAL_REST}${INITIATE_PATH}`;
    console.log("[upload/fal-initiate] calling FAL REST initiate", {
      fileName,
      contentType,
    });

    let upstream: Response;
    try {
      upstream = await fetch(targetUrl, {
        method: "POST",
        headers: {
          Authorization: `Key ${key}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content_type: contentType,
          file_name: fileName,
        }),
      });
    } catch (e) {
      logErr("fetch rest.fal.ai", e);
      return jsonErr(502, "Could not reach FAL storage API.");
    }

    const rawText = await upstream.text();
    if (!upstream.ok) {
      console.error("[upload/fal-initiate] FAL initiate HTTP error", {
        status: upstream.status,
        body: rawText.slice(0, 2000),
      });
      return jsonErr(
        502,
        "FAL storage refused this upload. Check logs and API key.",
      );
    }

    let data: Record<string, unknown>;
    try {
      data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch (e) {
      console.error("[upload/fal-initiate] non-JSON FAL response", {
        snippet: rawText.slice(0, 500),
      });
      logErr("parse FAL JSON", e);
      return jsonErr(502, "Invalid response from FAL storage.");
    }

    const uploadUrl =
      (typeof data.upload_url === "string" && data.upload_url) ||
      (typeof data.uploadUrl === "string" && data.uploadUrl) ||
      "";
    const fileUrl =
      (typeof data.file_url === "string" && data.file_url) ||
      (typeof data.fileUrl === "string" && data.fileUrl) ||
      "";

    if (!uploadUrl || !fileUrl) {
      console.error("[upload/fal-initiate] missing urls in FAL body", {
        keys: Object.keys(data),
      });
      return jsonErr(502, "FAL storage response missing upload URLs.");
    }

    return Response.json({ uploadUrl, fileUrl });
  } catch (e) {
    logErr("POST unhandled", e);
    return jsonErr(
      500,
      e instanceof Error ? e.message : "Initiate failed",
    );
  }
}
