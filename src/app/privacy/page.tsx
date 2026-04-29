import { SiteShell } from "@/components/SiteShell";

export default function PrivacyPage() {
  return (
    <SiteShell ctaHref="/" ctaLabel="Home">
      <div className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Privacy Policy
        </h1>
        <p className="mt-6 text-sm leading-7 text-white/75">
          We store your uploaded photo securely to generate your headshots. Your
          photo is deleted after 30 days. We never sell your data. Questions:{" "}
          getportr@gmail.com
        </p>
      </div>
    </SiteShell>
  );
}
