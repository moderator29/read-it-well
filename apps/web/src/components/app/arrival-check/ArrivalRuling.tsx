"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { ruleArrivalCheck } from "@/lib/stays/arrival-check-actions";

/** V-91, in the console: uphold or decline an arrival report, once. */
export function ArrivalRuling({
  bookingId,
  copy,
}: {
  bookingId: string;
  copy: Dictionary["arrivalCheck"]["admin"];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rule = (ruling: "upheld" | "declined") => {
    setError(null);
    start(async () => {
      const result = await ruleArrivalCheck({ bookingId, ruling });
      if (!result.ok) {
        setError(result.error || copy.ruleFailed);
        return;
      }
      router.refresh();
    });
  };
  return (
    <div className="mt-md">
      <div className="grid grid-cols-2 gap-sm">
        <Button variant="secondary" full disabled={pending} onClick={() => rule("upheld")}>
          {copy.uphold}
        </Button>
        <Button variant="secondary" full disabled={pending} onClick={() => rule("declined")}>
          {copy.decline}
        </Button>
      </div>
      {error && (
        <p role="alert" className="nf-body-sm mt-xs text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
