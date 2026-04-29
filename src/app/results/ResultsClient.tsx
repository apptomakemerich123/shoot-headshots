"use client";

import { SiteShell } from "@/components/SiteShell";
import { Button, Panel } from "@/components/ui";
import { PRODUCT, type OrderRecord } from "@/lib/types-order";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const UPLOAD_TOKEN_STORAGE_KEY = "portr_upload_token";

async function fetchOrder(sessionId: string): Promise<OrderRecord | null> {
  const res = await fetch(
    `/api/order?session_id=${encodeURIComponent(sessionId)}`,
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

  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
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

  // Merge URL query + sessionStorage (fixes lost ?t= and matches server-side file/KV store).
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (tFromUrl) {
      sessionStorage.setItem(UPLOAD_TOKEN_STORAGE_KEY, tFromUrl);
      setUploadToken(tFromUrl);
      setResolvedTokenFromClient(true);
      return;
    }

    const stored = sessionStorage.getItem(UPLOAD_TOKEN_STORAGE_KEY);
    setUploadToken(stored);
    setResolvedTokenFromClient(true);
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
        const json = (await res.json()) as { beforeUrl?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load upload");
        if (cancelled) return;
        setBeforeUrl(json.beforeUrl ?? null);
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
    if (!sessionId) return;
    const generating =
      (phase === "finalizing" || phase === "polling") &&
      order?.status !== "ready" &&
      order?.status !== "failed";
    if (!generating) {
      if (order?.status === "ready") setGenProgress(100);
      return;
    }
    setGenProgress(6);
    const id = setInterval(() => {
      setGenProgress((p) => (p >= 94 ? p : p + 1.25));
    }, 800);
    return () => clearInterval(id);
  }, [sessionId, phase, order?.status]);

  /** Stripe return: load order from server first so refresh always shows images when ready. */
  useEffect(() => {
    if (!sessionId) return;
    const sid = sessionId;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    function startPolling() {
      timer = setInterval(async () => {
        try {
          const o = await fetchOrder(sid);
          if (cancelled || !o) return;
          setOrder(o);
          if (o.status === "ready" || o.status === "failed") {
            if (timer) clearInterval(timer);
            setPhase("done");
          }
        } catch {
          /* keep polling */
        }
      }, 2500);
    }

    async function run() {
      setPhase("hydrating");
      setOrderErr(null);

      try {
        const initial = await fetchOrder(sid);
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

        const after = await fetchOrder(sid);
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
      setCheckoutErr("Missing upload session. Go back and upload your photo again.");
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
      Date.now() - startedAt > 4 * 60 * 1000 &&
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
                        : "Generating your headshots… this takes 2-3 minutes"}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    {phase === "polling"
                      ? `Creating ${PRODUCT.count} variations — different backgrounds and lighting.`
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
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-white/70">
                  {/* no email delivery messaging */}
                </p>
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

              {order.beforeUrl ? (
                <>
                  <p className="mt-6 text-xs text-white/45">Original upload</p>
                  <div className="mt-2 max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.beforeUrl}
                      alt="Original"
                      className="rounded-lg border border-[var(--border)] object-cover"
                    />
                  </div>
                </>
              ) : null}

              <p className="mt-8 text-xs font-medium tracking-[0.18em] text-white/55">
                ALL {PRODUCT.count} VARIATIONS
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {order.imageUrls.map((url, i) => (
                  <Panel key={url + i} className="overflow-hidden p-0">
                    <div className="border-b border-[var(--border)] px-2 py-1.5 text-[10px] leading-tight text-white/55 sm:text-xs">
                      {order.labels?.[i] ?? `Variation ${i + 1}`}
                    </div>
                    <div className="aspect-[3/4] bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={order.labels?.[i] ?? `Headshot ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
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
                ))}
              </div>
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

    if (!beforeUrl) {
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
            After payment we automatically generate {PRODUCT.count} headshots with
            varied backgrounds and lighting. Your gallery is tied to your Stripe
            receipt — refresh anytime.
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

          <p className="mt-10 text-xs text-white/45">Your original photo</p>
          <div className="mt-2 max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={beforeUrl}
              alt="Your upload"
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
          Upload a photo first, or open your results link from Stripe.
        </p>
        <div className="mt-8">
          <Button href="/upload">Go to upload</Button>
        </div>
      </div>
    </SiteShell>
  );
}
