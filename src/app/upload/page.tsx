"use client";

import { SiteShell } from "@/components/SiteShell";
import { Button, Panel } from "@/components/ui";
import { PRODUCT } from "@/lib/types-order";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MIN_COUNT = 10;
const MAX_COUNT = 20;
/** Reject only very tiny files (icons/thumbnails); screenshots often land under 200KB. */
const MIN_FILE_KB = 100;
const MIN_BYTES = MIN_FILE_KB * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function mimeBase(f: File): string {
  return (f.type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

function extMatchesPhonePhoto(name: string): boolean {
  return /\.(jpe?g|png|heic|heif|webp)$/i.test(name);
}

function validateImageFile(f: File, index: number): string | null {
  const base = mimeBase(f);
  const okMime = ALLOWED_MIME.has(base);
  const okHeicByName =
    (base === "" || base === "application/octet-stream") &&
    extMatchesPhonePhoto(f.name);
  if (!okMime && !okHeicByName) {
    return `Photo ${index + 1}: use JPG, PNG, HEIC, HEIF, or WebP.`;
  }
  if (f.size < MIN_BYTES) {
    return `Photo ${index + 1} is too small (under ${MIN_FILE_KB}KB). Try a less compressed export or full-resolution shot.`;
  }
  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Uploading…");
  const [brokenPreviews, setBrokenPreviews] = useState(() => new Set<string>());

  const previewUrls = useMemo(() => {
    return files.map((f) => URL.createObjectURL(f));
  }, [files]);

  useEffect(() => {
    return () => {
      for (const u of previewUrls) {
        URL.revokeObjectURL(u);
      }
    };
  }, [previewUrls]);

  function onFilesSelected(list: FileList | null) {
    setError(null);
    if (!list?.length) {
      setFiles([]);
      setBrokenPreviews(new Set());
      return;
    }
    const next: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (!f) continue;
      const msg = validateImageFile(f, next.length);
      if (msg) {
        setError(msg);
        setFiles([]);
        setBrokenPreviews(new Set());
        return;
      }
      next.push(f);
    }
    if (next.length > MAX_COUNT) {
      setError(`Please choose at most ${MAX_COUNT} photos (you selected ${next.length}).`);
      setFiles([]);
      setBrokenPreviews(new Set());
      return;
    }
    setFiles(next);
    setBrokenPreviews(new Set());
  }

  async function onContinue() {
    setError(null);
    if (files.length < MIN_COUNT) {
      setError(`Please select at least ${MIN_COUNT} photos (you have ${files.length}).`);
      return;
    }

    setLoading(true);
    setLoadingText("Uploading your photos…");
    try {
      const form = new FormData();
      for (const f of files) {
        form.append("files", f);
      }

      const res = await fetch("/api/upload/register", {
        method: "POST",
        body: form,
      });

      const raw = await res.text();
      let json: unknown;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error("Upload failed (invalid server response).");
      }
      const body = json as
        | { uploadToken: string; previewUrl: string }
        | { error: string }
        | null;

      if (!res.ok || !body || !("uploadToken" in body)) {
        throw new Error(
          body && typeof body === "object" && "error" in body && body.error
            ? String(body.error)
            : "Upload failed",
        );
      }

      try {
        sessionStorage.setItem("portr_upload_token", body.uploadToken);
      } catch {
        /* private mode etc. */
      }

      router.push(`/checkout?t=${encodeURIComponent(body.uploadToken)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <SiteShell ctaHref="/" ctaLabel="Back home">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Upload your photos
        </h1>
        <p className="mt-2 text-sm leading-7 text-white/65">
          Any selfies work — scroll through your camera roll and pick 10–20 recent
          photos. Different days, different lighting, indoors and outdoors. No need for
          perfect photos.
        </p>
        <p className="mt-3 text-sm text-white/55">
          After checkout we train a custom model on your set, then generate{" "}
          {PRODUCT.count} professional headshots.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Panel className="p-6">
            <label className="text-xs font-medium tracking-[0.18em] text-white/55">
              PHOTOS ({MIN_COUNT}–{MAX_COUNT})
            </label>
            <input
              className="mt-3 block w-full cursor-pointer rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:bg-white/8"
              type="file"
              accept=".jpg,.jpeg,.png,.heic,.heif,.webp"
              multiple
              disabled={loading}
              onChange={(e) => {
                onFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />

            {error ? (
              <p className="mt-3 text-sm text-white/80">{error}</p>
            ) : loading ? (
              <p className="mt-3 text-sm text-white/75">{loadingText}</p>
            ) : (
              <p className="mt-3 text-xs text-white/45">
                Stored securely until your order completes.
              </p>
            )}

            <p className="mt-4 text-xs text-white/50">
              Selected: {files.length} / {MAX_COUNT}{" "}
              {files.length >= MIN_COUNT ? "(ready)" : `(need at least ${MIN_COUNT})`}
            </p>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <Button
                  disabled={files.length < MIN_COUNT || loading}
                  onClick={onContinue}
                >
                  {loading ? "Working…" : "Continue"}
                </Button>
                {loading ? (
                  <div className="relative h-8 w-8">
                    <div className="absolute inset-0 animate-spin rounded-full border border-white/15 border-t-white/80" />
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="p-6">
              <p className="text-xs font-medium tracking-[0.18em] text-white/55">
                PREVIEW
              </p>
              <p className="mt-2 text-sm text-white/65">
                Thumbnails of your selection ({files.length} photos).
              </p>
            </div>
            <div className="max-h-[420px] overflow-y-auto border-t border-[var(--border)] bg-black/40 p-3">
              {files.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center text-sm text-white/45">
                  No photos selected
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {files.map((f, i) => {
                    const url = previewUrls[i];
                    const showPlaceholder = brokenPreviews.has(url);
                    return (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-md"
                    >
                      {showPlaceholder ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-white/10 px-1 text-center text-[10px] leading-tight text-white/55">
                          <span>Preview unavailable</span>
                          <span className="text-white/40">(e.g. HEIC)</span>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={() => {
                            setBrokenPreviews((prev) => new Set(prev).add(url));
                          }}
                        />
                      )}
                      <button
                        type="button"
                        aria-label={`Remove photo ${i + 1}`}
                        disabled={loading}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/70 text-xs text-white shadow-sm transition hover:bg-red-950/90 disabled:pointer-events-none disabled:opacity-40"
                        onClick={() => {
                          setError(null);
                          setFiles((prev) => prev.filter((_, j) => j !== i));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}
