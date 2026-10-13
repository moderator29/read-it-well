"use client";

import { useEffect, useState } from "react";
import { getDictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { PaymentStage, stageOrigin, type StageFace, type StageOrigin } from "@/components/app/payments/PaymentStage";
import { cardPaymentSteps } from "@/components/app/payments/payment-steps";
import { successCopy } from "@/lib/ui/success-moments";
import { CHECKOUT } from "../f3/fixtures";

type At = StageFace["at"];

export function PayStagePreview({ play }: { play: boolean }) {
  const t = getDictionary("en");
  const c = t.checkout;
  const paid = successCopy(t.success, "stayPaidRecorded");
  const [at, setAt] = useState<At | null>(null);
  const [origin, setOrigin] = useState<StageOrigin | null>(null);

  /* Harness only: a timed walk through the faces, for watching the rhythm. */
  useEffect(() => {
    if (!play) return;
    const ids = [
      window.setTimeout(() => setAt("committing"), 300),
      window.setTimeout(() => setAt("processing"), 2300),
      window.setTimeout(() => setAt("paid"), 4300),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [play]);

  const steps = (phase: "opening" | "settling") =>
    cardPaymentSteps(phase, { opening: c.openingPaymentPage, confirming: c.confirmingPayment, received: c.paymentReceived });
  const faces: Record<At, StageFace> = {
    committing: { at: "committing", verdict: c.openingPaymentPage, consequence: c.nothingChargedYet, steps: steps("opening"), note: c.recordedOnce },
    processing: { at: "processing", verdict: c.confirmingPayment, consequence: c.returnChecking, steps: steps("settling"), note: c.recordedOnce },
    paid: {
      at: "paid",
      settled: true,
      moment: {
        variant: paid.variant,
        object: paid.object,
        title: paid.title,
        body: paid.body,
        details: [
          { label: t.success.detail.for, value: CHECKOUT.title },
          { label: t.success.detail.reference, value: "EXAMPLE-REF", mono: true },
        ],
        primary: { label: c.seeStays, onClick: () => setAt(null) },
      },
    },
    unknown: {
      at: "unknown",
      verdict: c.notHeardBack,
      consequence: c.stalledCardStay,
      actions: [{ label: c.tryAgain, onClick: () => setAt(null), tone: "primary" }],
    },
    failed: {
      at: "failed",
      verdict: c.paymentNotCompleted,
      consequence: c.nothingTaken,
      actions: [
        { label: c.tryAgain, onClick: () => setAt(null), tone: "primary" },
        { label: c.getHelp, href: "/help", tone: "quiet" },
      ],
    },
  };

  return (
    <main className="mx-auto grid max-w-sm gap-row p-lg">
      <h1 className="nf-h3">Pay stage</h1>
      {(Object.keys(faces) as At[]).map((id) => (
        <Button
          key={id}
          variant={id === "committing" ? "primary" : "secondary"}
          full
          onClick={(event) => {
            if (id === "committing") setOrigin(stageOrigin(event.currentTarget));
            setAt(id);
          }}
        >
          {id}
        </Button>
      ))}
      <PaymentStage
        face={at ? faces[at] : null}
        amount={{ minorUnits: CHECKOUT.totalMinor, currency: CHECKOUT.currency, locale: CHECKOUT.locale }}
        origin={origin}
        onClose={() => setAt(null)}
      />
    </main>
  );
}
