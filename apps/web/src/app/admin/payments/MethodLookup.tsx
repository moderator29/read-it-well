"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  removeBankAccountAsAdmin,
  removePaymentMethodAsAdmin,
} from "@/lib/admin/payments-actions";

/**
 * Removing a saved card or a bank account for somebody who asked.
 *
 * The rule the whole payments desk is built around: a destructive action
 * states what it will do before it does it. So the control names the entry
 * by its masked tail, asks who asked and how, and only then offers the
 * button. The reason is the record; the owner is told; nothing about the
 * card or the account goes into the log.
 */
export function RemoveSavedMethod({
  kind,
  id,
  describe,
}: {
  kind: "card" | "account";
  id: string;
  /** "Visa ending 4821" or "GTBank ending 0912". The masked words only. */
  describe: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    setError(null);
    start(async () => {
      const result =
        kind === "card"
          ? await removePaymentMethodAsAdmin({ id, reason: reason.trim() })
          : await removeBankAccountAsAdmin({ id, reason: reason.trim() });
      if (!result.ok) {
        setError(result.fieldErrors?.["reason"] ?? result.error);
        return;
      }
      setDone(true);
      setOpen(false);
      router.refresh();
    });
  }

  if (done) {
    return (
      <p className="nf-body-sm mt-row font-medium text-[var(--nf-state-success)]">
        Removed. The owner has been told, and the reason is in the audit log.
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="dangerQuiet" onClick={() => setOpen(true)}>
        Remove at their request
      </Button>
    );
  }

  return (
    /* The same ruling as the reservation desk's confirm panel: a container
       edge is lit glass, never a flat grey outline. `nf-card` carries it. */
    <div className="nf-panel nf-panel--card nf-admin-card mt-row p-card-sm">
      <p className="nf-body font-semibold text-content">Remove {describe} from their account?</p>
      <p className="nf-body-sm mt-row text-content-2">
        It comes off their list exactly as if they had removed it themselves. The
        row is kept for support, the owner is sent a notification saying a member
        of staff did this, and your reason goes into the audit log. Nothing about
        the {kind === "card" ? "card" : "account"} itself is written anywhere new.
      </p>
      <label className="mt-row block">
        <span className="nf-label">Who asked, and how</span>
        <textarea
          className="nf-field min-h-[72px] resize-y"
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="For example: owner asked by support ticket 1234 after losing the phone the card was on."
        />
      </label>
      <div className="mt-row flex flex-wrap gap-inline">
        <Button
          type="button"
          size="sm"
          variant="danger"
          loading={pending}
          disabled={reason.trim().length < 10}
          onClick={run}
        >
          Remove {describe}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Not now
        </Button>
      </div>
      {error && (
        <p role="alert" className="nf-body-sm mt-row font-medium text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
