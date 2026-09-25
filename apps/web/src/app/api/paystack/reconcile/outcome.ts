import type { AlertInput } from "@/lib/alerts";

/**
 * What one reconciliation run leaves behind, decided in one place.
 *
 * BA's convention for every scheduled job (lib/cron/report.ts): the run
 * history lives in `audit_log`, one row per run whatever the outcome, and
 * `risk_alerts` hears only what needs a person. This route used to open an
 * info alert on every clean hourly run as well, so the desk's badge counted
 * twenty-four "nothing happened" rows a day beside the one that mattered.
 * The audit row already carries the date that proves the job still fires.
 *
 * Pure, so the rule is testable without a request or a database: the
 * counts a run reports in, the alert it earns out, or null for a clean run.
 */

export type ReconcileRunSummary = {
  hours: number;
  apply: boolean;
  needsAttention: boolean;
  counts: {
    charges_seen: number;
    charges_ours: number;
    gaps: number;
    refunded_minor: number;
  };
};

export const RECONCILE_SUBJECT = "paystack-reconcile";

/** The alert a run earns, or null when it earned none. */
export function reconcileAlert(run: ReconcileRunSummary): AlertInput | null {
  if (!run.needsAttention) return null;
  return {
    kind: "cron.reconcile.needs_attention",
    severity: "warning",
    detail: { hours: run.hours, apply: run.apply, ...run.counts },
    subjectId: RECONCILE_SUBJECT,
  };
}

/** The audit row every run writes, clean or not. */
export function reconcileAuditOutcome(run: ReconcileRunSummary): "needs_attention" | "clean" {
  return run.needsAttention ? "needs_attention" : "clean";
}
