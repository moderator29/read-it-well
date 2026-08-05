"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@naijafinds/i18n";
import { Amount } from "@/components/ui/Amount";
import { verifyFunding } from "@/lib/wallet/actions";
import { Button } from "@/components/ui/Button";

/**
 * The funded=1 landing state.
 *
 * When Paystack sends the user back to /wallet?funded=1&reference=..., the
 * webhook may not have arrived yet. This banner calls the verifyFunding
 * action, which checks the transaction with Paystack and credits the ledger
 * idempotently, the same write the webhook performs, so whichever side wins
 * the race the money posts exactly once. On success the page re-reads the
 * statement and the URL is cleaned back to /wallet.
 */

type VerifyState =
  | { phase: "verifying" }
  | { phase: "credited"; amountMinor: number }
  | { phase: "failed"; message: string };

export function FundingVerifier({ reference, locale }: { reference: string; locale: Locale }) {
  const [state, setState] = useState<VerifyState>({ phase: "verifying" });
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    verifyFunding(reference).then((result) => {
      if (cancelled) return;
      if (result.ok && result.data) {
        setState({ phase: "credited", amountMinor: result.data.amountMinor });
        router.refresh();
      } else {
        setState({
          phase: "failed",
          message: result.ok
            ? "The payment could not be confirmed just now."
            : result.error,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  const dismiss = () => {
    router.replace("/wallet", { scroll: false });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="nf-card mb-4 flex items-start justify-between gap-4 p-4"
    >
      <div className="min-w-0 flex-1">
        {state.phase === "verifying" && (
          <>
            <p className="text-[0.9375rem] font-semibold">Confirming your payment</p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              Checking with the payment service. This takes a moment.
            </p>
          </>
        )}
        {state.phase === "credited" && (
          <>
            <p className="text-[0.9375rem] font-semibold text-[var(--nf-state-success)]">
              +<Amount minorUnits={state.amountMinor} locale={locale} showFraction /> added to
              your wallet
            </p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              The deposit is in your history below, recorded to the kobo.
            </p>
          </>
        )}
        {state.phase === "failed" && (
          <>
            <p className="text-[0.9375rem] font-semibold">Payment check</p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              {state.message}
            </p>
          </>
        )}
      </div>
      {state.phase !== "verifying" && (
        <Button variant="ghost" size="sm" onClick={dismiss} className="shrink-0">
          Done
        </Button>
      )}
    </div>
  );
}
