import { Suspense } from "react";
import ResultsClient from "./ResultsClient";

export const dynamic = "force-dynamic";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-14 text-white/70">
          Loading…
        </div>
      }
    >
      <ResultsClient />
    </Suspense>
  );
}

