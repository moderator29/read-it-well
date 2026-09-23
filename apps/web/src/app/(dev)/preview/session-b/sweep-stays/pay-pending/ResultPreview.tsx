"use client";

import { useState } from "react";
import { ResultSheet } from "@/components/app/ResultSheet";

/**
 * The checkout's payment sheets, open, with the exact copy
 * `checkout/[bookingId]/PaymentReturn.tsx` hands `ResultSheet` for each phase.
 * PaymentReturn itself polls a server action for its phase, which needs a
 * session and a real reference, so the harness draws the sheet it would draw.
 */
export function ResultPreview({ kind }: { kind: "pending" | "failed" }) {
  const [open, setOpen] = useState(true);
  const fact = { amountMinor: 48_000_000, subject: "Eko Pearl Apartments, 4 nights", reference: "VAL-STY-7Q2K9M" };
  if (kind === "pending") {
    return (
      <ResultSheet
        open={open}
        onOpenChange={setOpen}
        state="pending"
        blocking
        verdict="Confirming your payment"
        fact={fact}
        locale="en"
        consequence="Checking with the payment service. This usually takes a few seconds."
      />
    );
  }
  return (
    <ResultSheet
      open={open}
      onOpenChange={setOpen}
      state="failed"
      verdict="Payment not confirmed"
      fact={fact}
      locale="en"
      consequence="Your card has not been charged. If money did leave your account, it returns within 24 hours."
      actions={[
        { label: "Try again", href: "/preview/session-b/sweep-stays/checkout", tone: "primary" },
        { label: "Get help", href: "/help", tone: "quiet" },
      ]}
    />
  );
}
