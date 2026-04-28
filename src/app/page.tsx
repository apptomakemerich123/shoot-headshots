import { SiteShell } from "@/components/SiteShell";
import { Button, Panel } from "@/components/ui";

export default function Home() {
  return (
    <SiteShell ctaHref="/upload" ctaLabel="Generate headshot">
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-x-0 top-[-160px] mx-auto h-[340px] w-[680px] rounded-full bg-white/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.24em] text-white/60">
              AI PROFESSIONAL HEADSHOTS
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              A premium headshot from a single photo.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/70 sm:text-lg">
              Upload a selfie. Get a clean, studio-style headshot that looks
              like you—just better lit, sharper, and more professional.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/upload">Upload a photo</Button>
              <a
                href="#how"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/80 transition hover:text-white"
              >
                How it works
              </a>
            </div>
            <p className="mt-4 text-xs text-white/45">
              Tip: use a front-facing photo, neutral expression, clean
              background.
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
              Simple flow. No accounts required for this demo.
            </p>
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
            <p className="mt-3 text-base font-medium">Pick one clear photo.</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              A well-lit selfie works best. Avoid sunglasses and heavy
              occlusion.
            </p>
          </Panel>
          <Panel className="p-6">
            <p className="text-xs font-medium tracking-[0.18em] text-white/55">
              02 GENERATE
            </p>
            <p className="mt-3 text-base font-medium">AI refines your look.</p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              We run a headshot model and return a studio-style result.
            </p>
          </Panel>
          <Panel className="p-6">
            <p className="text-xs font-medium tracking-[0.18em] text-white/55">
              03 DOWNLOAD
            </p>
            <p className="mt-3 text-base font-medium">
              Pay, then download.
            </p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Stripe Checkout unlocks the download button for your result.
            </p>
          </Panel>
        </div>
      </section>
    </SiteShell>
  );
}
