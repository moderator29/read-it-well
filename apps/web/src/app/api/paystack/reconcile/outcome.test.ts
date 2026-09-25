import { describe, expect, it } from "vitest";

import { RECONCILE_SUBJECT, reconcileAlert, reconcileAuditOutcome, type ReconcileRunSummary } from "./outcome";

/**
 * A clean hourly run writes its audit row and opens no alert; a run that
 * needs a person opens exactly one warning with the counts beside it. The
 * desk's badge must count attention, never the clock.
 */
function run(over: Partial<ReconcileRunSummary> = {}): ReconcileRunSummary {
  return {
    hours: 6,
    apply: true,
    needsAttention: false,
    counts: {
      charges_seen: 12,
      charges_ours: 12,
      gaps: 0,
      refunded_minor: 0,
    },
    ...over,
  };
}

describe("reconcileAlert", () => {
  it("opens nothing on a clean run", () => {
    expect(reconcileAlert(run())).toBeNull();
    expect(reconcileAuditOutcome(run())).toBe("clean");
  });

  it("opens one warning with the counts when a run needs attention", () => {
    const summary = run({
      needsAttention: true,
      counts: { ...run().counts, gaps: 2, refunded_minor: 500_000 },
    });
    expect(reconcileAlert(summary)).toEqual({
      kind: "cron.reconcile.needs_attention",
      severity: "warning",
      detail: {
        hours: 6,
        apply: true,
        charges_seen: 12,
        charges_ours: 12,
        gaps: 2,
        refunded_minor: 500_000,
      },
      subjectId: RECONCILE_SUBJECT,
    });
    expect(reconcileAuditOutcome(summary)).toBe("needs_attention");
  });

  it("never carries anything but counts and the window in its detail", () => {
    const alert = reconcileAlert(run({ needsAttention: true }));
    for (const value of Object.values(alert?.detail ?? {})) {
      expect(["number", "boolean"]).toContain(typeof value);
    }
  });
});
