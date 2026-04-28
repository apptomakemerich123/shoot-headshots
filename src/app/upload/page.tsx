"use client";

import { SiteShell } from "@/components/SiteShell";
import { Button, Panel } from "@/components/ui";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Uploading…");

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  async function onContinue() {
    setError(null);
    if (!file) {
      setError("Please choose a photo first.");
      return;
    }

    setLoading(true);
    setLoadingText("Uploading your photo…");
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload/register", {
        method: "POST",
        body: form,
      });

      const json = (await res.json()) as
        | { uploadToken: string; beforeUrl: string }
        | { error: string };

      if (!res.ok || !("uploadToken" in json)) {
        throw new Error("error" in json ? json.error : "Upload failed");
      }

      try {
        sessionStorage.setItem("portr_upload_token", json.uploadToken);
      } catch {
        /* private mode etc. */
      }

      router.push(`/results?t=${encodeURIComponent(json.uploadToken)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <SiteShell ctaHref="/" ctaLabel="Back home">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Upload your photo
        </h1>
        <p className="mt-2 text-sm text-white/65">
          Clear, front-facing photo works best. Next you’ll check out — then Portr
          generates your full set.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Panel className="p-6">
            <label className="text-xs font-medium tracking-[0.18em] text-white/55">
              PHOTO
            </label>
            <input
              className="mt-3 block w-full cursor-pointer rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:bg-white/8"
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => {
                setError(null);
                setFile(e.target.files?.[0] ?? null);
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

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <Button disabled={!file || loading} onClick={onContinue}>
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
                This is what you’re sending in.
              </p>
            </div>
            <div className="aspect-square w-full border-t border-[var(--border)] bg-black">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/45">
                  No photo selected
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}
