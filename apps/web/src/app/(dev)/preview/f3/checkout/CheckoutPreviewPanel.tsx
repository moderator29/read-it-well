"use client";

import { PayPanel } from "@/app/(app)/checkout/[bookingId]/PayPanel";
import { fail } from "@/lib/actions/envelope";
import { CHECKOUT, SAVED_CARDS } from "../fixtures";

/** The pay panel with a saved card offered and a charge that refuses. */
export function CheckoutPreviewPanel() {
  return (
    <div className="mt-block">
      <PayPanel
        view={CHECKOUT}
        savedCards={SAVED_CARDS}
        chargeSavedCard={async () => fail("Nothing is charged from the preview harness.")}
      />
    </div>
  );
}
