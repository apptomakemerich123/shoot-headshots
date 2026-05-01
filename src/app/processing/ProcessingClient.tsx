"use client";

import { SiteShell } from "@/components/SiteShell";
import { Panel } from "@/components/ui";
import { PRODUCT, type OrderRecord } from "@/lib/types-order";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const POLL_MS = 10_000;
/** Typical wall-clock range shown to users (training + generation). */
const ETA_MIN_MINUTES = 15;
const ETA_MAX_MINUTES = 25;

async function fetchOrderStatus(sessionId: string): Promise<OrderRecord | null> {
  const res = await fetch(
    `/api/order/status?session_id=${encodeURIComponent(sessionId)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load order status");
  return (await res.json()) as OrderRecord;
}

function formatElapsed(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (m <= 0) return `${s}s`;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

export default function ProcessingClient() {
  const router = useRouter();
  const search = useSearchParams();
  const sessionId = search.get("session_id");
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      if (startedAtRef.current)
        setElapsedMs(Date.now() - startedAtRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

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

  const phaseLabel =
    order?.jobPhase === "generating"
      ? "Generating your headshots"
      : "Training your personal model";

  const phaseDetail =
    order?.jobPhase === "generating"
      ? `${PRODUCT.count} variations — backgrounds, lighting, and framing.`
      : "Fine-tuning on your photos. Hang tight — quality takes a little time.";

  return (
    <SiteShell ctaHref="/upload" ctaLabel="New upload">
      <div className="relative min-h-[calc(100vh-8rem)] bg-grid">
        <div className="mx-auto flex max-w-lg flex-col items-center px-5 pb-16 pt-12 text-center sm:pt-16">
          {/* Centered brand */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.14] bg-white/[0.06] shadow-[0_0_40px_-8px_rgba(255,255,255,0.15)]"
              aria-hidden
            >
              <span className="h-3 w-3 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-white/45">
              Portr
            </div>
          </div>

          <h1 className="mt-10 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Creating your headshots
          </h1>

          <p className="mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-white/72">
            We&apos;ll email you at the address you used at checkout when your
            headshots are ready. You can safely close this tab.
          </p>

          {/* Animated progress */}
          <div className="mt-10 w-full max-w-sm">
            <div
              className="flex justify-center gap-2.5"
              aria-hidden
              role="presentation"
            >
              <span className="portr-processing-dot inline-block h-2 w-2 rounded-full bg-white/90" />
              <span className="portr-processing-dot inline-block h-2 w-2 rounded-full bg-white/90" />
              <span className="portr-processing-dot inline-block h-2 w-2 rounded-full bg-white/90" />
            </div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="portr-processing-bar-inner h-full rounded-full bg-gradient-to-r from-transparent via-white/85 to-transparent" />
            </div>
          </div>

          {/* Estimated time */}
          <div className="mt-10 w-full max-w-sm rounded-2xl border border-white/[0.1] bg-white/[0.04] px-5 py-4 text-left backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
              Estimated time
            </p>
            <p className="mt-2 font-medium tabular-nums text-white">
              Typically {ETA_MIN_MINUTES}–{ETA_MAX_MINUTES} minutes
            </p>
            <p className="mt-1.5 text-sm text-white/50">
              Elapsed: {formatElapsed(elapsedMs)}
            </p>
          </div>

          {err ? (
            <Panel className="mt-8 w-full max-w-sm p-5 text-left">
              <p className="text-sm text-white/85">{err}</p>
            </Panel>
          ) : null}

          <Panel className="mt-8 w-full max-w-sm p-6 text-left">
            <p className="font-medium text-white">{phaseLabel}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              {phaseDetail}
            </p>
          </Panel>

          <p className="mt-8 max-w-sm text-xs leading-relaxed text-white/40">
            This page refreshes status every {POLL_MS / 1000} seconds. You can
            also return anytime via your Stripe receipt link.
          </p>
        </div>
      </div>
    </SiteShell>
  );
}
