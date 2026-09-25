"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { ruleArrivalCheck } from "@/lib/stays/arrival-check-actions";

type Ruling = "upheld" | "declined";

/**
 * V-91, in the console: uphold or decline an arrival report, once. A ruling
 * cannot be undone, so each asks for a confirmation that says what it does to
 * the payout pause; a ruling the database refused ("none") says so.
 */
export function ArrivalRuling({
  bookingId,
  copy,
}: {
  bookingId: string;
  copy: Dictionary["arrivalCheck"]["admin"];
}) {
  const router = useRouter();
  const [asking, setAsking] = useState<Ruling | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const rule = (ruling: Ruling) => {
    setMessage(null);
    start(async () => {
      const result = await ruleArrivalCheck({ bookingId, ruling });
      setAsking(null);
      if (!result.ok) {
        setMessage(result.error || copy.ruleFailed);
        return;
      }
      if (result.data.state === "none") {
        setMessage(copy.ruleNone);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-md">
      {asking ? (
        <div className="grid gap-sm" data-testid="arrival-ruling-confirm">
          <p className="nf-body-sm">{asking === "upheld" ? copy.confirmUphold : copy.confirmDecline}</p>
          <div className="grid grid-cols-2 gap-sm">
            <Button variant="ghost" full disabled={pending} onClick={() => setAsking(null)}>
              {copy.cancel}
            </Button>
            <Button variant="primary" full loading={pending} disabled={pending} onClick={() => rule(asking)}>
              {copy.confirm}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-sm">
          <Button variant="secondary" full disabled={pending} onClick={() => setAsking("upheld")}>
            {copy.uphold}
          </Button>
          <Button variant="secondary" full disabled={pending} onClick={() => setAsking("declined")}>
            {copy.decline}
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="nf-body-sm mt-xs text-[var(--nf-content-secondary)]">
          {message}
        </p>
      )}
    </div>
  );
}
