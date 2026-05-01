import JSZip from "jszip";

function mimeBase(f: File): string {
  return (f.type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

function extForZipEntry(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".heic")) return "heic";
  if (n.endsWith(".heif")) return "heif";
  const base = mimeBase(file);
  if (base === "image/png") return "png";
  if (base === "image/webp") return "webp";
  if (base === "image/heic" || base === "image/heif") return "heic";
  return "jpg";
}

/** Training bundle — same naming as legacy server-side zip. */
export async function buildTrainingZipBlob(files: File[]): Promise<Blob> {
  const zip = new JSZip();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buf = await file.arrayBuffer();
    zip.file(
      `portr_${String(i + 1).padStart(2, "0")}.${extForZipEntry(file)}`,
      buf,
    );
  }
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
  });
}

export async function falInitiateUploadMeta(
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; fileUrl: string }> {
  const res = await fetch("/api/upload/fal-initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, contentType }),
  });
  const raw = await res.text();
  let json: unknown;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    console.error("[upload-client] fal-initiate non-JSON", {
      status: res.status,
      snippet: raw.slice(0, 400),
    });
    throw new Error("Upload setup failed (invalid server response).");
  }
  const body = json as
    | { error?: string; uploadUrl?: string; fileUrl?: string }
    | null;
  if (!res.ok) {
    throw new Error(
      body?.error ?? `Upload setup failed (${res.status}).`,
    );
  }
  if (!body?.uploadUrl || !body?.fileUrl) {
    throw new Error(body?.error ?? "Upload setup incomplete.");
  }
  return { uploadUrl: body.uploadUrl, fileUrl: body.fileUrl };
}

/** PUT bytes to FAL presigned URL (browser → FAL, bypasses Vercel body limit). */
export function xhrPutWithProgress(
  uploadUrl: string,
  blob: Blob,
  contentType: string,
  onProgress: (fraction01: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(1, e.loaded / e.total));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      console.error("[upload-client] PUT failed", {
        status: xhr.status,
        urlHost: (() => {
          try {
            return new URL(uploadUrl).hostname;
          } catch {
            return "?";
          }
        })(),
      });
      reject(new Error(`Direct upload failed (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => {
      console.error("[upload-client] PUT network error");
      reject(new Error("Network error during direct upload (check connection / CORS)."));
    };
    xhr.send(blob);
  });
}

export async function registerUploadSession(payload: {
  previewUrl: string;
  imagesDataUrl: string;
  photoCount: number;
}): Promise<{ uploadToken: string; previewUrl: string }> {
  const res = await fetch("/api/upload/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let json: unknown;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    console.error("[upload-client] register non-JSON", {
      status: res.status,
      snippet: raw.slice(0, 400),
    });
    throw new Error("Upload failed (invalid server response).");
  }
  const body = json as {
    error?: string;
    uploadToken?: string;
    previewUrl?: string;
  } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `Registration failed (${res.status}).`);
  }
  if (!body?.uploadToken || !body?.previewUrl) {
    throw new Error(body?.error ?? "Registration incomplete.");
  }
  return { uploadToken: body.uploadToken, previewUrl: body.previewUrl };
}
