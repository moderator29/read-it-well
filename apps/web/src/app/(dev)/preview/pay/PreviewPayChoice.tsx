"use client";

import type { Dictionary } from "@vallo/i18n/core";
import { PayChoiceCard } from "@/components/money/pay-choice/PayChoiceCard";
import type { PayChoice, PayRail } from "@/lib/payments/rail-choice";

/** The recorded answer: the real card, its Continue answering as the server would, saying nothing was charged. */
export function PreviewPayChoice({
  copy,
  choice,
  showContinue,
}: {
  copy: Dictionary["payChoice"];
  choice: PayChoice;
  showContinue: boolean;
}) {
  return (
    <PayChoiceCard
      copy={copy}
      choice={choice}
      agreement={{ id: "preview-agreement", kind: "stay", bookingId: "preview-booking", inspectionId: null }}
      here="/preview/pay"
      showContinue={showContinue}
      choose={async ({ choice: rail }: { agreementId: string; choice: PayRail }) => {
        await new Promise((r) => setTimeout(r, 600));
        return { ok: false, error: rail === "card" ? "card_needs_review" : "unavailable" };
      }}
    />
  );
}
