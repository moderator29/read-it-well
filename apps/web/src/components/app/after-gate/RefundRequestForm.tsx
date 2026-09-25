"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { requestRefund } from "@/lib/after-gate/refund-request-actions";

/**
 * V-24. The dated ask for a paid stay to be cancelled.
 *
 * Before this a guest wrote to support in free text and nothing recorded when
 * they asked, so no promise about the refund could be measured. The form is
 * two questions; the database stamps the time and the due-by. On success the
 * page refreshes and the ask appears as a dated line above.
 */
export function RefundRequestForm({
  bookingId,
  copy,
  reasons,
}: {
  bookingId: string;
  copy: Dictionary["afterTheGate"]["refund"];
  reasons: { code: string; label: string }[];
}) {
  const router = useRouter();
  const [reason, setReason] = useState(reasons[0]?.code ?? "guest_choice");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const result = await requestRefund({ bookingId, reason, note });
      if (!result.ok) {
        setError(result.error || copy.askFailed);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      className="nf-panel nf-panel--card block p-md"
      data-testid="refund-request"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h2 className="nf-h3">{copy.askHeading}</h2>
      <p className="nf-body-sm mt-xs text-[var(--nf-content-secondary)]">{copy.askLede}</p>
      <div className="mt-md grid gap-md">
        <Field label={copy.askReason}>
          {(control) => (
            <select {...control} className="nf-field" value={reason} onChange={(event) => setReason(event.target.value)}>
              {reasons.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={copy.askNote} error={error ?? undefined}>
          {(control) => (
            <textarea
              {...control}
              className="nf-field min-h-[5.5rem]"
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
      </div>
      <Button type="submit" variant="secondary" full className="mt-md" loading={pending} disabled={pending}>
        {copy.askSubmit}
      </Button>
    </form>
  );
}
