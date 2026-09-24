"use client";

import { useActionState } from "react";
import {
  cancelEmailRecovery,
  completeEmailRecovery,
  openEmailRecovery,
  resendRecoveryNotice,
} from "@/lib/admin/email-recovery-actions";

export type RecoveryRow = {
  id: string;
  user_id: string;
  old_email: string;
  new_email: string;
  status: "cooling_off" | "completing" | "completed" | "cancelled";
  evidence_ref: string;
  opened_at: string;
  eligible_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  last_error: string | null;
  opened_notice_at: string | null;
  completed_notice_at: string | null;
};

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";

/** The 7-day money hold starts at the move (admin_finish_email_recovery). */
const holdEnd = (iso: string) => new Date(new Date(iso).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

function Result({ state }: { state: { ok: boolean; error?: string } | null }) {
  if (!state) return null;
  return (
    <p role="status" className="mt-xs text-[length:var(--nf-text-caption)]">
      {state.ok ? "Done." : state.error}
    </p>
  );
}

function OpenForm() {
  const [state, action, pending] = useActionState(openEmailRecovery, null);
  return (
    <form action={action} className="nf-panel nf-panel--card mt-md grid gap-sm p-card">
      <h2 className="nf-overline">Open a request</h2>
      <label className="grid gap-3xs text-[length:var(--nf-text-caption)]">
        Account id
        <input name="userId" required className="nf-input" />
      </label>
      <label className="grid gap-3xs text-[length:var(--nf-text-caption)]">
        New email address
        <input name="newEmail" type="email" required className="nf-input" />
      </label>
      <label className="grid gap-3xs text-[length:var(--nf-text-caption)]">
        NIN the person gave
        <input name="nin" inputMode="numeric" required className="nf-input" autoComplete="off" />
      </label>
      <label className="grid gap-3xs text-[length:var(--nf-text-caption)]">
        Support ticket or evidence reference
        <input name="evidenceRef" required className="nf-input" />
      </label>
      <button type="submit" className="nf-btn nf-btn--primary" disabled={pending}>
        Open request
      </button>
      <Result state={state ? (state.ok ? { ok: true } : { ok: false, error: state.error }) : null} />
    </form>
  );
}

function RowActions({ row, isSuperAdmin }: { row: RecoveryRow; isSuperAdmin: boolean }) {
  const [completed, complete, completing] = useActionState(completeEmailRecovery, null);
  const [cancelled, cancel, cancelling] = useActionState(cancelEmailRecovery, null);
  const [resent, resend, resending] = useActionState(resendRecoveryNotice, null);
  if (row.status !== "cooling_off") return null;
  return (
    <div className="mt-xs flex flex-wrap items-end gap-sm">
      <form action={resend}>
        <input type="hidden" name="requestId" value={row.id} />
        <button type="submit" className="nf-btn nf-btn--secondary nf-btn--sm" disabled={resending}>
          Send the notice again
        </button>
        <Result state={resent ? (resent.ok ? { ok: true } : { ok: false, error: resent.error }) : null} />
      </form>
      {isSuperAdmin && (
        <form action={complete}>
          <input type="hidden" name="requestId" value={row.id} />
          <button type="submit" className="nf-btn nf-btn--primary nf-btn--sm" disabled={completing}>
            Move the account (a second super admin, 72 hours after the notice)
          </button>
          <Result state={completed ? (completed.ok ? { ok: true } : { ok: false, error: completed.error }) : null} />
        </form>
      )}
      <form action={cancel} className="flex items-end gap-xs">
        <input type="hidden" name="requestId" value={row.id} />
        <input name="reason" placeholder="Why cancel" required className="nf-input" />
        <button type="submit" className="nf-btn nf-btn--secondary nf-btn--sm" disabled={cancelling}>
          Cancel
        </button>
        <Result state={cancelled ? (cancelled.ok ? { ok: true } : { ok: false, error: cancelled.error }) : null} />
      </form>
    </div>
  );
}

export function RecoveryDesk({ rows, isSuperAdmin }: { rows: RecoveryRow[]; isSuperAdmin: boolean }) {
  return (
    <>
      {isSuperAdmin ? (
        <OpenForm />
      ) : (
        <p className="mt-md text-[length:var(--nf-text-body-sm)]">Only a super admin can open or complete a request.</p>
      )}
      <ul className="mt-lg grid gap-sm">
        {rows.length === 0 && <li className="text-[length:var(--nf-text-body-sm)]">No requests.</li>}
        {rows.map((row) => (
          <li key={row.id} className="nf-panel nf-panel--card p-card text-[length:var(--nf-text-body-sm)]">
            <p className="font-semibold">
              {row.old_email} → {row.new_email}
            </p>
            <p className="mt-3xs text-[var(--nf-content-secondary)]">
              {row.status.replace("_", " ")} · opened {when(row.opened_at)} · earliest {when(row.eligible_at)} ·
              evidence {row.evidence_ref}
            </p>
            <p className="mt-3xs text-[var(--nf-content-secondary)]">
              Old address told: {row.opened_notice_at ? when(row.opened_notice_at) : "not yet"}
              {row.completed_notice_at ? ` · told of the move ${when(row.completed_notice_at)}` : ""}
            </p>
            {row.status === "completed" && row.completed_at && (
              <p className="mt-3xs">
                {`Money held until ${when(holdEnd(row.completed_at))}: no withdrawals, sends, wallet payments or bank account changes.`}
              </p>
            )}
            {row.last_error && <p className="mt-3xs">Last attempt failed: {row.last_error}</p>}
            {row.cancel_reason && <p className="mt-3xs">Cancelled: {row.cancel_reason}</p>}
            <RowActions row={row} isSuperAdmin={isSuperAdmin} />
          </li>
        ))}
      </ul>
    </>
  );
}
