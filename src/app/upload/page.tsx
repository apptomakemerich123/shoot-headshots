"use client";

import { SiteShell } from "@/components/SiteShell";
import { Button, cn, Panel } from "@/components/ui";
import {
  buildTrainingZipBlob,
  falInitiateUploadMeta,
  registerUploadSession,
  xhrPutWithProgress,
} from "@/lib/upload-client";
import { PRODUCT } from "@/lib/types-order";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MIN_COUNT = 10;
const MAX_COUNT = 20;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type SelectedPhoto = { id: string; file: File };

function mimeBase(f: File): string {
  return (f.type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

function extMatchesPhonePhoto(name: string): boolean {
  return /\.(jpe?g|png|heic|heif|webp)$/i.test(name);
}

function isHeicLikeName(name: string): boolean {
  return /\.(heic|heif)$/i.test(name);
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
  return null;
}

function shortFileName(name: string, max = 28): string {
  if (name.length <= max) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = ext ? name.slice(0, name.length - ext.length) : name;
  const keep = max - ext.length - 1;
  return `${base.slice(0, Math.max(4, keep))}…${ext}`;
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<SelectedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [brokenPreviewIds, setBrokenPreviewIds] = useState(
    () => new Set<string>(),
  );

  const count = items.length;

  const previewUrls = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        url: URL.createObjectURL(item.file),
        file: item.file,
      })),
    [items],
  );

  useEffect(() => {
    const urls = previewUrls.map((p) => p.url);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [previewUrls]);

  const mergeIncoming = useCallback((incoming: File[]) => {
    setItems((prev) => {
      const room = MAX_COUNT - prev.length;
      if (room <= 0) {
        queueMicrotask(() =>
          setError(
            `Maximum ${MAX_COUNT} photos — remove some to add more.`,
          ),
        );
        return prev;
      }
      const toAdd = incoming.slice(0, room);
      if (incoming.length > room) {
        queueMicrotask(() =>
          setError(
            `Only ${room} slot${room === 1 ? "" : "s"} left — added ${toAdd.length} photo${toAdd.length === 1 ? "" : "s"}.`,
          ),
        );
      }
      const appended: SelectedPhoto[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
      }));
      return [...prev, ...appended];
    });
  }, []);

  const processFileList = useCallback(
    (list: FileList | null) => {
      setError(null);
      if (!list?.length) return;

      const incoming: File[] = [];
      for (let i = 0; i < list.length; i++) {
        const f = list.item(i);
        if (!f) continue;
        const msg = validateImageFile(f, incoming.length);
        if (msg) {
          setError(msg);
          return;
        }
        incoming.push(f);
      }
      mergeIncoming(incoming);
    },
    [mergeIncoming],
  );

  function onDropZoneDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function onDropZoneDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function onDropZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt?.files?.length) return;
    processFileList(dt.files);
  }

  async function onContinue() {
    setError(null);
    if (count < MIN_COUNT) {
      setError(
        `Please select at least ${MIN_COUNT} photos (you have ${count}).`,
      );
      return;
    }

    const files = items.map((x) => x.file);
    const photoCount = files.length;

    /** Progress weights: preview PUT → zip build → zip PUT → JSON register (tiny). */
    const W_PREVIEW = 0.14;
    const W_BUILD = 0.06;
    const W_ZIP = 0.72;
    const W_REG = 0.08;

    const bump = (t: number) =>
      setUploadPct(Math.min(100, Math.round(t * 100)));

    setLoading(true);
    setUploadPct(0);
    try {
      const first = files[0];
      const previewInit = await falInitiateUploadMeta(
        first.name || "preview.jpg",
        first.type || "application/octet-stream",
      );
      await xhrPutWithProgress(
        previewInit.uploadUrl,
        first,
        first.type || "application/octet-stream",
        (f) => bump(f * W_PREVIEW),
      );
      const previewUrl = previewInit.fileUrl;
      bump(W_PREVIEW);

      bump(W_PREVIEW + 0.01);
      const zipBlob = await buildTrainingZipBlob(files);
      bump(W_PREVIEW + W_BUILD);

      const zipInit = await falInitiateUploadMeta(
        "portr-training.zip",
        "application/zip",
      );
      await xhrPutWithProgress(
        zipInit.uploadUrl,
        zipBlob,
        "application/zip",
        (f) => bump(W_PREVIEW + W_BUILD + f * W_ZIP),
      );
      const imagesDataUrl = zipInit.fileUrl;

      bump(W_PREVIEW + W_BUILD + W_ZIP);
      const body = await registerUploadSession({
        previewUrl,
        imagesDataUrl,
        photoCount,
      });
      bump(W_PREVIEW + W_BUILD + W_ZIP + W_REG);

      try {
        sessionStorage.setItem("portr_upload_token", body.uploadToken);
      } catch {
        /* private mode etc. */
      }

      router.push(`/checkout?t=${encodeURIComponent(body.uploadToken)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
      setUploadPct(0);
    }
  }

  const needsMore = count < MIN_COUNT;
  const canContinue = count >= MIN_COUNT && count <= MAX_COUNT && !loading;

  return (
    <SiteShell ctaHref="/" ctaLabel="Back home">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Upload your photos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">
          Any selfies work — scroll through your camera roll and pick 10–20 recent
          photos. Different days, different lighting, indoors and outdoors. No need for
          perfect photos.
        </p>
        <p className="mt-3 text-sm text-white/55">
          After checkout we train a custom model on your set, then generate{" "}
          {PRODUCT.count} professional headshots.
        </p>

        <Panel className="mt-8 overflow-hidden">
          <div className="border-b border-[var(--border)] bg-black/30 px-5 py-5 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.18em] text-white/55">
                  YOUR SET
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white">
                  {count}/{MAX_COUNT}{" "}
                  <span className="text-base font-normal text-white/55">
                    photos selected
                  </span>
                </p>
              </div>
              {needsMore ? (
                <p className="max-w-sm text-right text-sm leading-snug text-amber-200/90">
                  Add at least {MIN_COUNT - count} more photo
                  {MIN_COUNT - count === 1 ? "" : "s"} to continue (
                  {count}/{MIN_COUNT} minimum).
                </p>
              ) : (
                <p className="text-sm text-emerald-200/85">
                  Minimum reached — you can continue to checkout.
                </p>
              )}
            </div>

            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".jpg,.jpeg,.png,.heic,.heif,.webp,image/*"
              multiple
              disabled={loading}
              onChange={(e) => {
                processFileList(e.target.files);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              disabled={loading || count >= MAX_COUNT}
              onDragOver={onDropZoneDragOver}
              onDragLeave={onDropZoneDragLeave}
              onDrop={onDropZoneDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "group mt-6 flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition sm:min-h-[280px]",
                dragOver
                  ? "border-white/50 bg-white/[0.08]"
                  : "border-white/20 bg-white/[0.03] hover:border-white/35 hover:bg-white/[0.06]",
                (loading || count >= MAX_COUNT) &&
                  "cursor-not-allowed opacity-50 hover:border-white/20 hover:bg-white/[0.03]",
              )}
            >
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/80">
                Tap or drop photos
              </span>
              <span className="mt-4 max-w-md text-center text-sm text-white/55">
                Drag files from your desktop, or choose from your phone — new picks add
                to your selection (up to {MAX_COUNT}).
              </span>
              <span className="mt-6 text-xs text-white/40">
                JPG, PNG, WebP, HEIC · HEIC previews show a label instead of a thumbnail
              </span>
            </button>

            {loading ? (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs text-white/55">
                  <span>Uploading…</span>
                  <span className="tabular-nums">{uploadPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-150 ease-out"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 text-sm text-white/85">{error}</p>
            ) : !loading ? (
              <p className="mt-4 text-xs text-white/45">
                Stored securely until your order completes.
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                disabled={!canContinue}
                onClick={onContinue}
                className="w-full sm:w-auto"
              >
                {loading ? "Uploading…" : "Continue"}
              </Button>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-white/55">
                  <div className="relative h-8 w-8 shrink-0">
                    <div className="absolute inset-0 animate-spin rounded-full border border-white/15 border-t-white/80" />
                  </div>
                  Processing your upload
                </div>
              ) : null}
            </div>

            {needsMore && !loading ? (
              <p className="mt-3 text-sm text-white/50">
                Continue is disabled until you have at least {MIN_COUNT} photos.
              </p>
            ) : null}
          </div>

          <div className="bg-black/35 px-3 py-4 sm:px-5">
            <p className="mb-3 px-1 text-xs font-medium tracking-[0.18em] text-white/45">
              PREVIEW GRID
            </p>
            {count === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-white/45">
                No photos yet — add some above
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {previewUrls.map(({ id, url, file }) => {
                  const heicNoBrowserPreview = isHeicLikeName(file.name);
                  const showPlaceholder =
                    heicNoBrowserPreview || brokenPreviewIds.has(id);
                  return (
                    <div
                      key={id}
                      className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]"
                    >
                      {showPlaceholder ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                            {heicNoBrowserPreview
                              ? "HEIC (no browser preview)"
                              : "Preview unavailable"}
                          </span>
                          <span
                            className="line-clamp-3 w-full break-all text-[11px] leading-tight text-white/70"
                            title={file.name}
                          >
                            {shortFileName(file.name, 36)}
                          </span>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={() => {
                            setBrokenPreviewIds((prev) =>
                              new Set(prev).add(id),
                            );
                          }}
                        />
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        disabled={loading}
                        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/75 text-sm text-white shadow-md backdrop-blur-sm transition hover:bg-red-950/95 disabled:pointer-events-none disabled:opacity-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setError(null);
                          setItems((prev) => prev.filter((x) => x.id !== id));
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
    </SiteShell>
  );
}
