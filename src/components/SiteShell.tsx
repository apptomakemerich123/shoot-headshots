import Link from "next/link";

export function SiteShell({
  children,
  ctaHref,
  ctaLabel,
}: {
  children: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="group flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white/5">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-sm font-semibold tracking-wide">
              Portr
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/upload"
              className="hidden text-sm text-white/70 hover:text-white sm:inline"
            >
              Upload
            </Link>
            {ctaHref && ctaLabel ? (
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
              >
                {ctaLabel}
              </Link>
            ) : null}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Portr. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/45">
            <Link href="/privacy" className="hover:text-white/80">
              Privacy Policy
            </Link>
            <Link href="/refund" className="hover:text-white/80">
              Refund Policy
            </Link>
            <span className="hidden text-white/30 sm:inline">·</span>
            <span className="text-white/40">AI headshots from your photo set.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
