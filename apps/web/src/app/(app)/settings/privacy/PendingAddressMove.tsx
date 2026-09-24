"use client";

import { useActionState } from "react";
import type { Dictionary } from "@vallo/i18n";
import { ownerCancelEmailRecovery } from "@/lib/admin/email-recovery-actions";
import type { PendingMove } from "@/lib/auth/pending-address-move";

/**
 * SEC-15: the owner's view of a request by support to move their account to
 * another address. Shown only while it is cooling off; the database refuses
 * a cancel on any request that is not theirs or not cooling off.
 */
export function PendingAddressMove({
  t,
  move,
}: {
  t: Dictionary;
  move: PendingMove;
}) {
  const [state, action, pending] = useActionState(
    ownerCancelEmailRecovery,
    null
  );
  const copy = t.settings.addressMove;
  if (state?.ok) {
    return (
      <p
        role="status"
        className="nf-panel nf-panel--card p-card text-[length:var(--nf-text-body-sm)]"
      >
        {copy.cancelled}
      </p>
    );
  }
  return (
    <form
      action={action}
      className="nf-panel nf-panel--card grid gap-sm p-card"
      role="alert"
    >
      <h2 className="font-semibold">{copy.title}</h2>
      <p className="text-[length:var(--nf-text-body-sm)]">
        {copy.body
          .replace("{address}", move.newAddressMasked)
          .replace("{when}", move.earliest ?? copy.afterNotice)}
      </p>
      <p className="text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
        {copy.ifYou}
      </p>
      <input type="hidden" name="requestId" value={move.id} />
      <button
        type="submit"
        className="nf-btn nf-btn--primary"
        disabled={pending}
      >
        {copy.cancel}
      </button>
      {state && !state.ok && (
        <p role="status" className="text-[length:var(--nf-text-caption)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
