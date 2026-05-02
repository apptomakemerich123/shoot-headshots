"use client";

import { SiteShell } from "@/components/SiteShell";
import { Button, cn, Panel } from "@/components/ui";
import { PRODUCT, type JobPhase, type OrderRecord } from "@/lib/types-order";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const UPLOAD_TOKEN_STORAGE_KEY = "portr_upload_token";

function favoritesStorageKey(sessionId: string) {
  return `portr_result_favorites_${sessionId}`;
}

function loadFavoriteUrls(sessionId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(favoritesStorageKey(sessionId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveFavoriteUrls(sessionId: string, urls: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      favoritesStorageKey(sessionId),
      JSON.stringify([...urls]),
    );
  } catch {
    /* quota / private mode */
  }
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5 w-5 text-rose-400"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.292 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.218l-.022.012-.007.003-.002.001h-.002z"
        />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5 text-white/90"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}

/** Advances pipeline + returns latest order (use while processing). */
async function fetchOrderProgress(sessionId: string): Promise<OrderRecord | null> {
  const res = await fetch(
    `/api/order/status?session_id=${encodeURIComponent(sessionId)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load order");
  return (await res.json()) as OrderRecord;
}

export default function ResultsClient() {
  const router = useRouter();
  const search = useSearchParams();
  const sessionId = search.get("session_id");
  const tFromUrl = search.get("t");
  const startedAt = useState(() => Date.now())[0];

  /** Resolved from `?t=` or sessionStorage so checkout always has the token after navigation. */
  const [uploadToken, setUploadToken] = useState<string | null>(null);
  const [resolvedTokenFromClient, setResolvedTokenFromClient] =
    useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "hydrating" | "finalizing" | "polling" | "done"
  >("idle");

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  const [zipLoading, setZipLoading] = useState(false);
  const [zipErr, setZipErr] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [elapsedClock, setElapsedClock] = useState(() => Date.now());

  const [favoriteUrls, setFavoriteUrls] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    setFavoriteUrls([...loadFavoriteUrls(sessionId)]);
  }, [sessionId]);

  const favoriteSet = useMemo(() => new Set(favoriteUrls), [favoriteUrls]);

  function toggleFavorite(url: string) {
    setFavoriteUrls((prev) => {
      const next = prev.includes(url)
        ? prev.filter((u) => u !== url)
        : [...prev, url];
      if (sessionId && typeof window !== "undefined") {
        queueMicrotask(() => saveFavoriteUrls(sessionId, new Set(next)));
      }
      return next;
    });
  }

  // Merge URL query + sessionStorage (fixes lost ?t= and matches server-side file/KV store).
  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      if (tFromUrl) {
        sessionStorage.setItem(UPLOAD_TOKEN_STORAGE_KEY, tFromUrl);
        setUploadToken(tFromUrl);
      } else {
        setUploadToken(sessionStorage.getItem(UPLOAD_TOKEN_STORAGE_KEY));
      }
      setResolvedTokenFromClient(true);
    });
  }, [tFromUrl]);

  // If we only have the token in sessionStorage, sync the URL so refresh/share keeps working.
  useEffect(() => {
    if (sessionId || !uploadToken || tFromUrl) return;
    router.replace(`/results?t=${encodeURIComponent(uploadToken)}`, {
      scroll: false,
    });
  }, [sessionId, uploadToken, tFromUrl, router]);

  useEffect(() => {
    if (!uploadToken || sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/upload/${uploadToken}`);
        const json = (await res.json()) as { previewUrl?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load upload");
        if (cancelled) return;
        setPreviewUrl(json.previewUrl ?? null);
      } catch (e) {
        if (!cancelled) {
          setUploadErr(e instanceof Error ? e.message : "Load failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uploadToken, sessionId]);

  useEffect(() => {
    if (order?.status === "ready") {
      queueMicrotask(() => setGenProgress(100));
    }
  }, [order?.status]);

  useEffect(() => {
    if (!sessionId) return;
    const waiting =
      order?.status !== "ready" &&
      order?.status !== "failed" &&
      (phase === "hydrating" || phase === "finalizing" || phase === "polling");
    if (!waiting) return;
    const id = setInterval(() => setElapsedClock(Date.now()), 15000);
    return () => clearInterval(id);
  }, [sessionId, phase, order?.status]);

  useEffect(() => {
    if (!sessionId) return;
    const busy =
      order?.status === "processing" &&
      (phase === "finalizing" || phase === "polling");
    if (!busy) {
      return;
    }

    const jp: JobPhase | undefined = order?.jobPhase;
    const training = jp !== "generating";

    queueMicrotask(() => setGenProgress(training ? 6 : 52));
    const id = setInterval(() => {
      setGenProgress((p) => {
        const isTraining = jp !== "generating";
        if (isTraining) {
          return p >= 48 ? p : p + 0.25;
        }
        return p >= 93 ? p : p + 1.1;
      });
    }, training ? 3500 : 750);
    return () => clearInterval(id);
  }, [sessionId, phase, order?.status, order?.jobPhase]);

  /** Stripe return: load order from server first so refresh always shows images when ready. */
  useEffect(() => {
    if (!sessionId) return;
    const sid = sessionId;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    function startPolling() {
      timer = setInterval(async () => {
        try {
          const o = await fetchOrderProgress(sid);
          if (cancelled || !o) return;
          setOrder(o);
          if (o.status === "ready" || o.status === "failed") {
            if (timer) clearInterval(timer);
            setPhase("done");
          }
        } catch {
          /* keep polling */
        }
      }, 10_000);
    }

    async function run() {
      setPhase("hydrating");
      setOrderErr(null);

      try {
        const initial = await fetchOrderProgress(sid);
        if (cancelled) return;

        if (initial) {
          setOrder(initial);
          if (initial.status === "ready") {
            setPhase("done");
            return;
          }
          if (initial.status === "failed") {
            setPhase("done");
            return;
          }
          if (initial.status === "processing") {
            setPhase("polling");
            startPolling();
            return;
          }
        }

        setPhase("finalizing");
        const fin = await fetch("/api/order/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        });
        const finJson = (await fin.json()) as {
          ok?: boolean;
          status?: string;
          error?: string;
        };

        if (!fin.ok && finJson.status !== "processing") {
          throw new Error(finJson.error ?? "Could not complete order");
        }

        setPhase("polling");

        const after = await fetchOrderProgress(sid);
        if (cancelled) return;
        if (after) {
          setOrder(after);
          if (after.status === "ready" || after.status === "failed") {
            setPhase("done");
            return;
          }
        }

        startPolling();
      } catch (e) {
        if (!cancelled) {
          setOrderErr(e instanceof Error ? e.message : "Finalize failed");
          setPhase("done");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [sessionId]);

  async function startCheckout() {
    const token =
      uploadToken ??
      (typeof window !== "undefined"
        ? sessionStorage.getItem(UPLOAD_TOKEN_STORAGE_KEY)
        : null);
    if (!token) {
      setCheckoutErr("Missing upload session. Go back and upload your photos again.");
      return;
    }
    setCheckoutErr(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadToken: token }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Checkout failed");
      }
      window.location.href = json.url;
    } catch (e) {
      setCheckoutErr(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function downloadAllAsZip(sid: string) {
    setZipErr(null);
    setZipLoading(true);
    try {
      const res = await fetch(
        `/api/order/zip?session_id=${encodeURIComponent(sid)}`,
      );
      const ct = res.headers.get("Content-Type") ?? "";
      if (!res.ok) {
        if (ct.includes("application/json")) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? "Download failed");
        }
        throw new Error("Download failed");
      }
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = "portr-headshots.zip";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    } catch (e) {
      setZipErr(e instanceof Error ? e.message : "Could not create zip");
    } finally {
      setZipLoading(false);
    }
  }

  if (sessionId) {
    const showSpinner =
      (phase === "hydrating" ||
        phase === "finalizing" ||
        phase === "polling") &&
      order?.status !== "ready" &&
      order?.status !== "failed";

    const tookTooLong =
      (phase === "hydrating" || phase === "finalizing" || phase === "polling") &&
      elapsedClock - startedAt > 26 * 60 * 1000 &&
      order?.status !== "ready";

    return (
      <SiteShell ctaHref="/upload" ctaLabel="New upload">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Your Portr set
          </h1>
          <p className="mt-2 text-sm text-white/65">
            Saved to your order — refresh anytime. Images load from the server
            using your Stripe session.
          </p>

          {orderErr ? (
            <Panel className="mt-6 p-6">
              <p className="text-sm text-white/80">
                Something went wrong. Email getportr@gmail.com and we&apos;ll fix
                it or give you a full refund.
              </p>
            </Panel>
          ) : null}

          {showSpinner ? (
            <Panel className="mt-8 p-6">
              <div className="flex items-start gap-4">
                <div className="relative mt-0.5 h-10 w-10 shrink-0">
                  <div className="absolute inset-0 animate-spin rounded-full border border-white/15 border-t-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">
                    {phase === "hydrating"
                      ? "Loading your order…"
                      : phase === "finalizing"
                        ? "Confirming payment…"
                        : order?.jobPhase === "generating"
                          ? "Generating your headshots…"
                          : "Training your model… (this takes ~15–20 minutes)"}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    {phase === "polling"
                      ? order?.jobPhase === "generating"
                        ? `Creating ${PRODUCT.count} variations — different backgrounds and wardrobe.`
                        : "Fine-tuning on your photos — please keep this tab open."
                      : "Almost there."}
                  </p>
                  {phase === "polling" || phase === "finalizing" ? (
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white/80 transition-[width] duration-300 ease-out"
                        style={{
                          width: `${Math.min(100, Math.round(genProgress))}%`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </Panel>
          ) : null}

          {tookTooLong ? (
            <Panel className="mt-6 p-6">
              <p className="text-sm text-white/80">
                Something went wrong. Email getportr@gmail.com and we&apos;ll fix
                it or give you a full refund.
              </p>
            </Panel>
          ) : null}

          {order?.status === "failed" ? (
            <Panel className="mt-8 p-6">
              <p className="text-sm text-white/80">
                Something went wrong. Email getportr@gmail.com and we&apos;ll fix
                it or give you a full refund.
              </p>
              <div className="mt-4">
                <Button href="/upload">Try a new upload</Button>
              </div>
            </Panel>
          ) : null}

          {order?.status === "ready" &&
          order.imageUrls &&
          order.imageUrls.length > 0 ? (
            <>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setFavoritesOnly((v) => !v)}
                  className={cn(
                    "inline-flex min-h-[44px] items-center justify-center rounded-full border px-5 py-2.5 text-sm font-medium transition",
                    favoritesOnly
                      ? "border-rose-400/50 bg-rose-500/15 text-rose-100"
                      : "border-white/15 bg-white/[0.05] text-white/85 hover:border-white/25 hover:bg-white/[0.08]",
                  )}
                >
                  {favoritesOnly ? "Show all photos" : "Show favorites only"}
                </button>
                <Button
                  type="button"
                  disabled={zipLoading}
                  onClick={() => downloadAllAsZip(sessionId)}
                >
                  {zipLoading ? "Preparing zip…" : "Download All"}
                </Button>
              </div>

              {zipErr ? (
                <p className="mt-2 text-sm text-red-300">{zipErr}</p>
              ) : null}

              {order.previewUrl ? (
                <>
                  <p className="mt-6 text-xs text-white/45">Training preview</p>
                  <div className="mt-2 max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.previewUrl}
                      alt="Training set preview"
                      className="rounded-lg border border-[var(--border)] object-cover"
                    />
                  </div>
                </>
              ) : null}

              <p className="mt-8 text-xs font-medium tracking-[0.18em] text-white/55">
                ALL {PRODUCT.count} VARIATIONS
              </p>
              {(() => {
                const items = order.imageUrls.map((url, i) => ({
                  url,
                  i,
                  label: order.labels?.[i] ?? `Variation ${i + 1}`,
                }));
                const visible = favoritesOnly
                  ? items.filter((x) => favoriteSet.has(x.url))
                  : items;
                return (
                  <>
                    {favoritesOnly && visible.length === 0 ? (
                      <p className="mt-4 text-sm text-white/55">
                        No favorites yet — tap the heart on any shot you love.
                      </p>
                    ) : null}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {visible.map(({ url, i, label }) => {
                        const isFav = favoriteSet.has(url);
                        return (
                          <Panel
                            key={`${sessionId}-${i}-${url}`}
                            className="overflow-hidden p-0"
                          >
                            <div className="border-b border-[var(--border)] px-2 py-1.5 text-[10px] leading-tight text-white/55 sm:text-xs">
                              {label}
                            </div>
                            <div className="relative aspect-[3/4] bg-black">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={label}
                                className="h-full w-full object-cover"
                              />
                              {isFav ? (
                                <span
                                  className="pointer-events-none absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-rose-400 shadow-md backdrop-blur-[2px]"
                                  aria-hidden
                                >
                                  <HeartIcon filled />
                                </span>
                              ) : null}
                              <button
                                type="button"
                                aria-label={
                                  isFav
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                                }
                                aria-pressed={isFav}
                                className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 shadow-md backdrop-blur-[2px] transition hover:bg-black/75"
                                onClick={() => toggleFavorite(url)}
                              >
                                <HeartIcon filled={isFav} />
                              </button>
                            </div>
                            <div className="p-1.5">
                              <a
                                className="text-[10px] text-white/80 underline sm:text-xs"
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open
                              </a>
                            </div>
                          </Panel>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          ) : null}
        </div>
      </SiteShell>
    );
  }

  if (uploadToken) {
    if (uploadErr) {
      return (
        <SiteShell ctaHref="/upload" ctaLabel="Try again">
          <div className="mx-auto max-w-3xl px-4 py-14">
            <p className="text-red-300">{uploadErr}</p>
          </div>
        </SiteShell>
      );
    }

    if (!previewUrl) {
      return (
        <SiteShell ctaHref="/upload" ctaLabel="Back">
          <div className="mx-auto max-w-3xl px-4 py-14 text-white/70">
            Loading…
          </div>
        </SiteShell>
      );
    }

    return (
      <SiteShell ctaHref="/upload" ctaLabel="Back">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Complete your order
          </h1>
          <p className="mt-2 text-sm text-white/65">
            After payment we train on your photos (~15–20 minutes), then generate{" "}
            {PRODUCT.count} headshots with varied backgrounds and wardrobe. Your gallery
            is tied to your Stripe receipt — refresh anytime.
          </p>

          <Panel className="mt-8 p-8">
            <p className="text-xs font-medium tracking-[0.18em] text-white/55">
              PORTR SET
            </p>
            <p className="mt-3 text-4xl font-semibold">
              ${(PRODUCT.cents / 100).toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-white/70">
              {PRODUCT.count} AI headshot variations
            </p>
            <div className="mt-8">
              <Button disabled={checkoutLoading} onClick={startCheckout}>
                {checkoutLoading ? "Redirecting to Stripe…" : "Continue to checkout"}
              </Button>
            </div>
          </Panel>

          {checkoutErr ? (
            <p className="mt-4 text-sm text-red-300">{checkoutErr}</p>
          ) : null}

          <p className="mt-10 text-xs text-white/45">Preview (first of your set)</p>
          <div className="mt-2 max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Your uploads preview"
              className="rounded-xl border border-[var(--border)] object-cover"
            />
          </div>
        </div>
      </SiteShell>
    );
  }

  if (!resolvedTokenFromClient && !sessionId) {
    return (
      <SiteShell ctaHref="/upload" ctaLabel="Upload">
        <div className="mx-auto max-w-3xl px-4 py-14 text-white/70">
          Loading…
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell ctaHref="/upload" ctaLabel="Upload">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Nothing to show
        </h1>
        <p className="mt-2 text-sm text-white/65">
          Upload photos first, or open your results link from Stripe.
        </p>
        <div className="mt-8">
          <Button href="/upload">Go to upload</Button>
        </div>
      </div>
    </SiteShell>
  );
}
