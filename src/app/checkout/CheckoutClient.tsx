"use client";

import { SiteShell } from "@/components/SiteShell";
import { Button, Panel } from "@/components/ui";
import { PRODUCT } from "@/lib/types-order";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const UPLOAD_TOKEN_STORAGE_KEY = "portr_upload_token";

export default function CheckoutClient() {
  const search = useSearchParams();
  const tFromUrl = search.get("t");

  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      if (tFromUrl) {
        sessionStorage.setItem(UPLOAD_TOKEN_STORAGE_KEY, tFromUrl);
        setToken(tFromUrl);
      } else {
        setToken(sessionStorage.getItem(UPLOAD_TOKEN_STORAGE_KEY));
      }
      setReady(true);
    });
  }, [tFromUrl]);

  async function pay() {
    const uploadToken =
      token ??
      (typeof window !== "undefined"
        ? sessionStorage.getItem(UPLOAD_TOKEN_STORAGE_KEY)
        : null);

    if (!uploadToken) {
      setError("Missing upload. Start from the upload page.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadToken }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Could not start checkout");
      }
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <SiteShell ctaHref="/upload" ctaLabel="Upload">
        <div className="mx-auto max-w-lg px-4 py-14 text-white/70">
          Loading…
        </div>
      </SiteShell>
    );
  }

  if (!token) {
    return (
      <SiteShell ctaHref="/upload" ctaLabel="Upload">
        <div className="mx-auto max-w-lg px-4 py-14">
          <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
          <p className="mt-2 text-sm text-white/65">
            No upload session. Upload your photo set first.
          </p>
          <div className="mt-6">
            <Button href="/upload">Go to upload</Button>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell ctaHref="/upload" ctaLabel="Back">
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <p className="text-xs font-medium tracking-[0.2em] text-white/55">
          CHECKOUT
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Order summary
        </h1>

        <Panel className="mt-8 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-4">
            <p className="font-medium text-white">
              {`${PRODUCT.count} AI headshots — $${(
                PRODUCT.cents / 100
              ).toFixed(2)}`}
            </p>
          </div>
          <p className="mt-4 text-sm text-white/55">
            We train a model on your uploads (~15–20 min), then generate your set —
            multiple backgrounds, wardrobe, and crops.
          </p>
          <p className="mt-4 text-xs text-white/45">
            You’ll be redirected to Stripe to complete payment. After paying,
            you’ll return to your results page to track training and generation.
          </p>
          <div className="mt-6">
            <Button disabled={loading} onClick={pay}>
              {loading ? "Redirecting…" : "Continue to payment"}
            </Button>
          </div>
        </Panel>

        {error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : null}

        <p className="mt-8 text-xs text-white/45">
          <Link className="underline hover:text-white" href="/upload">
            Upload a different set
          </Link>
        </p>
      </div>
    </SiteShell>
  );
}
