"use client";

import { PhoneGateLink } from "@/components/app/PhoneGateLink";
import { isPhoneGate } from "@/lib/actions/envelope";
import { useState, useTransition } from "react";
import { payReservationDeposit } from "@/lib/reservations/deposit-actions";

/**
 * D75: pay a restaurant's table deposit. Opens Paystack's hosted checkout; the
 * webhook, never this button, records it as paid. Presentation stays plain.
 */
export function PayDepositButton({ reservationId, label }: { reservationId: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [phoneGate, setPhoneGate] = useState(false);
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
            setPhoneGate(false);
            const result = await payReservationDeposit(reservationId);
            if (!result.ok) {
              setError(result.error);
              setPhoneGate(isPhoneGate(result));
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
      <PhoneGateLink show={phoneGate} full />
    </span>
  );
}
