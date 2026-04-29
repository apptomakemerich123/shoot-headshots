import { SiteShell } from "@/components/SiteShell";

export default function RefundPage() {
  return (
    <SiteShell ctaHref="/" ctaLabel="Home">
      <div className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Refund Policy
        </h1>
        <p className="mt-6 text-sm leading-7 text-white/75">
          Not happy with your headshots? Email getportr@gmail.com within 7 days
          and we&apos;ll give you a full refund. No questions asked.
        </p>
      </div>
    </SiteShell>
  );
}
