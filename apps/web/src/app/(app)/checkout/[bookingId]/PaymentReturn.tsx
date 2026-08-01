"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { settleCardPayment } from "@/lib/bookings/checkout";

/**
 * The return trip from Paystack.
 *
 * The guest usually lands back here before the webhook arrives, so this calls
 * the verify path, which settles the charge through exactly the same function
 * the webhook uses. Whichever gets there first does the work; the second finds
 * the attempt already SUCCESSFUL and the booking already CONFIRMED and moves
 * nothing. That is why running both is safe rather than merely tolerable.
 *
 * The action runs once per mount, guarded by a ref, because React may mount an
 * effect twice in development and a settlement is not something to ask for
 * twice on a whim, idempotent or not.
 */

type Phase =
  | { kind: "checking" }
  | { kind: "settled"; confirmed: boolean }
  | { kind: "failed"; message: string };

export function PaymentReturn({ reference }: { reference: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    settleCardPayment(reference).then((result) => {
      if (cancelled) return;
      if (result.ok && result.data) {
        setPhase({ kind: "settled", confirmed: result.data.confirmed });
        router.refresh();
        return;
      }
      setPhase({
        kind: "failed",
        message: result.ok
          ? "The payment could not be confirmed just now."
          : result.error,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  return (
    <div role="status" aria-live="polite" className="nf-card mb-4 p-4">
      {phase.kind === "checking" && (
        <>
          <p className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
            Confirming your payment
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            Checking with the payment service. This takes a moment.
          </p>
        </>
      )}

      {phase.kind === "settled" && (
        <>
          <p className="text-[0.9375rem] font-semibold text-[var(--nf-state-success)]">
            Payment received
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            {phase.confirmed
              ? "Your stay is confirmed and the dates are yours."
              : "This payment was already recorded, so your stay is confirmed."}
          </p>
        </>
      )}

      {phase.kind === "failed" && (
        <>
          <p className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
            Payment check
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            {phase.message}
          </p>
        </>
      )}
    </div>
  );
}
