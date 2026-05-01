import { SiteShell } from "@/components/SiteShell";

export default function RefundPage() {
  return (
    <SiteShell ctaHref="/" ctaLabel="Home">
      <div className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Refund Policy
        </h1>
        <p className="mt-6 text-sm leading-7 text-white/75">
          We offer a full refund if you are unsatisfied with your results.
          Refund requests must be made within 7 days of delivery. We reserve the
          right to decline refunds where results have been downloaded and used.
        </p>
      </div>
    </SiteShell>
  );
}
