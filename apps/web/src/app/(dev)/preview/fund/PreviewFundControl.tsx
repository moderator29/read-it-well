"use client";

import { useState } from "react";
import { DragToConfirm } from "@/components/ui/DragToConfirm";
import { FUND_ARMED_LABEL, FUND_CONFIRMED_LABEL, FUND_CONFIRMING_LABEL, FUND_SWIPE_LABEL } from "@/lib/money/copy";

/** The recorded swipe: the same control, answering as the server would after a pause, and saying where it would go. */
export function PreviewFundControl({ amountLabel, answer }: { amountLabel: string; answer: "ok" | "refused" }) {
  const [said, setSaid] = useState<string | null>(null);
  return (
    <div className="grid gap-sm" data-testid="fund-swipe">
      <DragToConfirm
        money
        label={`${FUND_SWIPE_LABEL}: ${amountLabel}`}
        armedLabel={FUND_ARMED_LABEL}
        confirmingLabel={FUND_CONFIRMING_LABEL}
        confirmedLabel={FUND_CONFIRMED_LABEL}
        errorLabel="Payluk did not take the payment. Check that your balance covers it; nothing has moved."
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 1200));
          setSaid(answer === "ok" ? "Recorded answer: submitted. The product now opens /agreements/[id]/held." : null);
          return answer === "ok";
        }}
      />
      {said && (
        <p role="status" className="nf-caption text-[var(--nf-platinum-hi)]">
          {said}
        </p>
      )}
    </div>
  );
}
