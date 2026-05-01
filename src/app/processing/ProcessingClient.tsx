"use client";

import { SiteShell } from "@/components/SiteShell";
import { Panel } from "@/components/ui";
import { PRODUCT, type OrderRecord } from "@/lib/types-order";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const POLL_MS = 10_000;

async function fetchOrderStatus(sessionId: string): Promise<OrderRecord | null> {
  const res = await fetch(
    `/api/order/status?session_id=${encodeURIComponent(sessionId)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load order status");
  return (await res.json()) as OrderRecord;
}

export default function ProcessingClient() {
  const router = useRouter();
  const search = useSearchParams();
  const sessionId = search.get("session_id");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !sessionId.startsWith("cs_")) return;
    const checkoutSessionId: string = sessionId;

    let cancelled = false;

    const timer = setInterval(() => void tick(), POLL_MS);

    async function tick() {
      try {
        const o = await fetchOrderStatus(checkoutSessionId);
        if (cancelled || !o) return;
        setOrder(o);
        if (o.status === "ready") {
          clearInterval(timer);
          router.replace(
            `/results?session_id=${encodeURIComponent(checkoutSessionId)}`,
          );
        } else if (o.status === "failed") {
          clearInterval(timer);
          router.replace(
            `/results?session_id=${encodeURIComponent(checkoutSessionId)}`,
          );
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Status check failed");
        }
      }
    }

    void tick();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sessionId, router]);

  if (!sessionId?.startsWith("cs_")) {
    return (
      <SiteShell ctaHref="/upload" ctaLabel="Upload">
        <div className="mx-auto max-w-3xl px-4 py-14 text-white/70">
          <p>Missing checkout session. Start from your upload link.</p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell ctaHref="/upload" ctaLabel="New upload">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Creating your Portr set
        </h1>
        <p className="mt-2 text-sm leading-7 text-white/75">
          Your headshots are being created. This usually takes 15–25 minutes.
          We&apos;ll email you when they&apos;re ready — you can close this tab.
        </p>
        <p className="mt-3 text-xs text-white/50">
          This page checks every {POLL_MS / 1000} seconds; you can also reopen your
          results link from Stripe anytime.
        </p>

        {err ? (
          <Panel className="mt-6 p-6">
            <p className="text-sm text-white/80">{err}</p>
          </Panel>
        ) : null}

        <Panel className="mt-8 p-6">
          <div className="flex items-start gap-4">
            <div className="relative mt-0.5 h-10 w-10 shrink-0">
              <div className="absolute inset-0 animate-spin rounded-full border border-white/15 border-t-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">
                {order?.jobPhase === "generating"
                  ? "Generating your headshots…"
                  : "Training your model… (often ~15–20 minutes)"}
              </p>
              <p className="mt-1 text-sm text-white/55">
                {order?.jobPhase === "generating"
                  ? `Creating ${PRODUCT.count} variations — different backgrounds and wardrobe.`
                  : "Fine-tuning on your photos. You’ll be redirected when the gallery is ready."}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </SiteShell>
  );
}
