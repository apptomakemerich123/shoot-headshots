"use client";

import { SiteShell } from "@/components/SiteShell";
import { Button, Panel } from "@/components/ui";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ResultPayload = { beforeUrl: string; afterUrl: string };

function downloadFromUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function ResultsClient() {
  const search = useSearchParams();
  const [paid, setPaid] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("shoot_result");
      if (!raw) {
        setResult(null);
        return;
      }
      setResult(JSON.parse(raw) as ResultPayload);
    } catch {
      setResult(null);
    }
  }, []);

  useEffect(() => {
    const paidFlag =
      search.get("paid") === "1" || localStorage.getItem("shoot_paid") === "1";
    setPaid(paidFlag);
    if (paidFlag) localStorage.setItem("shoot_paid", "1");
  }, [search]);

  async function onPay() {
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setCheckoutError(json.error ?? "Could not start checkout");
        return;
      }
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setCheckoutError("No checkout URL returned");
    } finally {
      setCheckingOut(false);
    }
  }

  if (!result) {
    return (
      <SiteShell ctaHref="/upload" ctaLabel="Upload">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            No result found
          </h1>
          <p className="mt-2 text-sm text-white/65">
            Please upload a photo to generate your headshot.
          </p>
          <div className="mt-8">
            <Button href="/upload">Go to upload</Button>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell ctaHref="/upload" ctaLabel="Generate another">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Your headshot
            </h1>
            <p className="mt-2 text-sm text-white/65">
              Compare before/after. Download unlocks after checkout.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {!paid ? (
              <Button disabled={checkingOut} onClick={onPay}>
                {checkingOut ? "Opening checkout…" : "Pay $19.99 to download"}
              </Button>
            ) : (
              <Button
                onClick={() => downloadFromUrl(result.afterUrl, "shoot-headshot")}
              >
                Download
              </Button>
            )}
          </div>
        </div>

        {checkoutError ? (
          <p className="mt-4 text-sm text-red-300">{checkoutError}</p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Panel className="overflow-hidden">
            <div className="border-b border-[var(--border)] p-5">
              <p className="text-xs font-medium tracking-[0.18em] text-white/55">
                BEFORE
              </p>
            </div>
            <div className="aspect-square bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.beforeUrl}
                alt="Before"
                className="h-full w-full object-cover"
              />
            </div>
          </Panel>
          <Panel className="overflow-hidden">
            <div className="border-b border-[var(--border)] p-5">
              <p className="text-xs font-medium tracking-[0.18em] text-white/55">
                AFTER
              </p>
            </div>
            <div className="relative aspect-square bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.afterUrl}
                alt="After"
                className="h-full w-full object-cover"
              />
              {!paid ? (
                <div className="pointer-events-none absolute inset-0 hidden items-end justify-center bg-gradient-to-t from-black/85 via-black/35 to-transparent p-6 sm:flex">
                  <p className="text-sm text-white/85">
                    Checkout required to download
                  </p>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <Panel className="mt-6 p-5">
          <p className="text-sm text-white/70">
            {paid ? (
              <>Unlocked. You can download the final headshot above.</>
            ) : (
              <>Locked until payment. Complete checkout ($19.99) to unlock.</>
            )}
          </p>
        </Panel>
      </div>
    </SiteShell>
  );
}

