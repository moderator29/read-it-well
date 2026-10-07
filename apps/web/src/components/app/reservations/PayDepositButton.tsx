"use client";

import { useState, useTransition } from "react";
import { payReservationDeposit } from "@/lib/reservations/deposit-actions";

/**
 * D75: pay a restaurant's table deposit. Opens Paystack's hosted checkout; the
 * webhook, never this button, records it as paid. Presentation stays plain.
 */
export function PayDepositButton({ reservationId, label }: { reservationId: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col gap-inline">
      <button
        type="button"
        className="nf-btn nf-btn--primary nf-btn--sm"
        disabled={pending}
        data-testid="trip-pay-deposit"
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await payReservationDeposit(reservationId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.location.assign(result.data.authorizationUrl);
          })
        }
      >
        {label}
      </button>
      {error && (
        <span role="alert" className="nf-caption text-[var(--nf-state-danger)]">
          {error}
        </span>
      )}
    </span>
  );
}
