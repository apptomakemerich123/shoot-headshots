import { SiteShell } from "@/components/SiteShell";
import { Button, Panel } from "@/components/ui";
import { PRODUCT } from "@/lib/types-order";
import Image from "next/image";

const SAMPLE_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=85&auto=format&fit=crop",
    alt: "Professional headshot sample 1",
  },
  {
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=85&auto=format&fit=crop",
    alt: "Professional headshot sample 2",
  },
  {
    src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=85&auto=format&fit=crop",
    alt: "Professional headshot sample 3",
  },
];

export default function Home() {
  return (
    <SiteShell ctaHref="/upload" ctaLabel="Get started">
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-x-0 top-[-160px] mx-auto h-[340px] w-[680px] rounded-full bg-white/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.24em] text-white/60">
              Portr · AI headshots
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              {PRODUCT.count} professional looks from your photos.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/70 sm:text-lg">
              Portr trains on your photo set, then generates a full suite of
              headshots — different backgrounds, lighting, and crops — so you can pick
              the perfect shot for LinkedIn, your site, or casting.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col gap-3">
                <Button href="/upload">Upload your photos</Button>
                <p className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-400/95 sm:text-left">
                  100% satisfaction guarantee or your money back
                </p>
              </div>
              <a
                href="#how"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/80 transition hover:text-white sm:mt-0"
              >
                How it works
              </a>
            </div>
            <p className="mt-4 text-xs text-white/45">
              Tip: use 10–20 recent front-facing photos with good lighting and neutral
              backgrounds for best results.
            </p>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-sm text-white/65">
              One simple package — ${(PRODUCT.cents / 100).toFixed(2)} for{" "}
              {PRODUCT.count} variations.
            </p>
            <p className="mt-2 text-sm text-white/55">Built for professionals.</p>
          </div>
          <div className="hidden sm:block">
            <Button href="/upload" className="bg-white">
              Start
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Panel className="p-6">
            <p className="text-xs font-medium tracking-[0.18em] text-white/55">
              01 UPLOAD
            </p>
            <p className="mt-3 text-base font-medium">10–20 photos.</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              We store it securely on our servers until your order completes.
            </p>
          </Panel>
          <Panel className="p-6">
            <p className="text-xs font-medium tracking-[0.18em] text-white/55">
              02 CHECKOUT
            </p>
            <p className="mt-3 text-base font-medium">Pay once via Stripe.</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              ${(PRODUCT.cents / 100).toFixed(2)} unlocks {PRODUCT.count}{" "}
              AI-generated headshots with varied backgrounds and lighting.
            </p>
          </Panel>
          <Panel className="p-6">
            <p className="text-xs font-medium tracking-[0.18em] text-white/55">
              03 DELIVERY
            </p>
            <p className="mt-3 text-base font-medium">Gallery.</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Your set is saved to your order (refresh-safe). Reopen your results
              link anytime.
            </p>
          </Panel>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Sample results
          </h2>
          <p className="mt-2 text-sm text-white/65">
            Real output — no filters added
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {SAMPLE_IMAGES.map((img) => (
              <Panel key={img.src} className="overflow-hidden p-0">
                <div className="relative aspect-[3/4] w-full bg-black">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
