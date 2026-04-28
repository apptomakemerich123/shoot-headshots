import { Suspense } from "react";

import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-14 text-white/70">
          Loading checkout…
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
