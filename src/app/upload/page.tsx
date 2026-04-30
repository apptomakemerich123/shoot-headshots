"use client";

import { SiteShell } from "@/components/SiteShell";
import { Button, Panel } from "@/components/ui";
import { PRODUCT } from "@/lib/types-order";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MIN_COUNT = 10;
const MAX_COUNT = 20;
const MIN_BYTES = 200 * 1024;

function validateImageFile(f: File, index: number): string | null {
  const okType = f.type === "image/jpeg" || f.type === "image/png";
  if (!okType) {
    return `Photo ${index + 1}: please use JPG or PNG.`;
  }
  if (f.size < MIN_BYTES) {
    return `Photo ${index + 1} is too small (under 200KB). Use a clearer file.`;
  }
  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Uploading…");

  const previewUrls = useMemo(() => {
    return files.map((f) => URL.createObjectURL(f));
  }, [files]);

  function onFilesSelected(list: FileList | null) {
    setError(null);
    if (!list?.length) {
      setFiles([]);
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
        return;
      }
      next.push(f);
    }
    if (next.length > MAX_COUNT) {
      setError(`Please choose at most ${MAX_COUNT} photos (you selected ${next.length}).`);
      setFiles([]);
      return;
    }
    setFiles(next);
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

      const json = (await res.json()) as
        | { uploadToken: string; previewUrl: string }
        | { error: string };

      if (!res.ok || !("uploadToken" in json)) {
        throw new Error("error" in json ? json.error : "Upload failed");
      }

      try {
        sessionStorage.setItem("portr_upload_token", json.uploadToken);
      } catch {
        /* private mode etc. */
      }

      router.push(`/checkout?t=${encodeURIComponent(json.uploadToken)}`);
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
        <p className="mt-2 text-sm text-white/65">
          Upload <strong className="text-white/90">10–20 clear photos of yourself</strong> for best
          results. Use{" "}
          <span className="text-white/85">
            different angles, good lighting, no sunglasses
          </span>
          . After checkout we train a custom model on your set, then generate{" "}
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
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
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
                  {files.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={f.name + i}
                      src={previewUrls[i]}
                      alt=""
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}
