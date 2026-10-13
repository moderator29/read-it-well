"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDepositReturn } from "@/lib/reservations/deposit-actions";
import { TYPE } from "@/components/app/Screen";

/**
 * Back from paying a table deposit (track/restaurant-deposits): asks once
 * whether the charge went through, through the webhook's own settle leg, and
 * says the answer. The page then redraws from the record. Nothing here marks
 * anything paid; it only asks.
 */
export function DepositReturnCheck({
  reservationId,
  reference,
  words,
}: {
  reservationId: string;
  reference: string;
  words: { checking: string; paidNow: string; notPaid: string; stillOpen: string; goingBack: string };
}) {
  const router = useRouter();
  const asked = useRef(false);
  const [message, setMessage] = useState(words.checking);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void confirmDepositReturn(reservationId, reference).then((result) => {
      if (!result.ok) {
        setFailed(true);
        setMessage(result.error);
        return;
      }
      const state = result.data.state;
      setMessage(
        state === "paid"
          ? words.paidNow
          : state === "not_paid"
            ? words.notPaid
            : state === "going_back"
              ? words.goingBack
              : words.stillOpen,
      );
      router.refresh();
    });
  }, [reservationId, reference, router, words]);
  return (
    <p
      role={failed ? "alert" : "status"}
      className={`${TYPE.body} ${failed ? "text-[var(--nf-state-error)]" : ""}`}
      data-testid="deposit-return"
    >
      {message}
    </p>
  );
}
