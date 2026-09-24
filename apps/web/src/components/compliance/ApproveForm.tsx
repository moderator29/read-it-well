"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions/envelope";

/**
 * SCUML item 19: one button that a SECOND member of staff presses. The
 * database refuses the proposer anyway; the lane hides the button from them
 * and shows `ownLine` instead. Staff only.
 */
export function ApproveForm({
  action,
  fieldName,
  value,
  label,
  doneLabel,
  own,
  ownLine,
}: {
  action: (prev: ActionResult<null> | null, formData: FormData) => Promise<ActionResult<null>>;
  fieldName: string;
  value: string;
  label: string;
  doneLabel: string;
  own: boolean;
  ownLine: string;
}) {
  const [state, run, pending] = useActionState<ActionResult<null> | null, FormData>(action, null);
  if (own) return <p className="nf-caption text-[var(--nf-content-muted)]">{ownLine}</p>;
  return (
    <form action={run} className="flex flex-wrap items-center gap-xs">
      <input type="hidden" name={fieldName} value={value} />
      <button type="submit" disabled={pending || state?.ok === true} className="nf-btn nf-btn--primary min-h-[44px] disabled:opacity-60">
        {label}
      </button>
      {state?.ok ? (
        <span role="status" className="nf-caption text-[var(--nf-content-secondary)]">
          {doneLabel}
        </span>
      ) : null}
      {state && !state.ok ? (
        <span role="alert" className="nf-caption text-[var(--nf-state-warning)]">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
