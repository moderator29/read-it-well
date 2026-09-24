"use client";

import { useActionState } from "react";
import type { Dictionary } from "@vallo/i18n";
import type { ActionResult } from "@/lib/actions/envelope";
import { reopenEddReview } from "@/lib/compliance/edd-actions";

/** SCUML item 15: reopen a cleared person's EDD review; the gates shut until it is cleared again. Staff only. */
export function ReopenEddButton({ userId, copy }: { userId: string; copy: Dictionary["complianceRisk"]["lane"] }) {
  const [state, run, pending] = useActionState<ActionResult<null> | null, FormData>(reopenEddReview, null);
  return (
    <form action={run} className="flex flex-wrap items-center gap-xs">
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending || state?.ok === true} className="nf-btn nf-btn--glass min-h-[44px] disabled:opacity-60">
        {copy.reopen}
      </button>
      {state?.ok ? (
        <span role="status" className="nf-caption text-[var(--nf-content-secondary)]">
          {copy.reopened}
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
