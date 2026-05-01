import { Suspense } from "react";

import ProcessingClient from "./ProcessingClient";

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-white/55">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.05]">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/90" />
          </div>
          <span className="text-sm">Loading…</span>
        </div>
      }
    >
      <ProcessingClient />
    </Suspense>
  );
}
