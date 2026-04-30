import { Suspense } from "react";

import ProcessingClient from "./ProcessingClient";

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-14 text-white/70">Loading…</div>
      }
    >
      <ProcessingClient />
    </Suspense>
  );
}
