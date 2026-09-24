import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import { deriveRiskFor, peopleDue } from "../../compliance/risk-derive";
import type { AdminClient } from "../rpc";

/**
 * SCUML item 15: the daily classification run.
 *
 * Classifies up to RISK_BATCH people whose class is missing, due for review,
 * or older than a new PEP record or report. One failure does not stop the
 * run; failures are counted and raise an alert, because a person the job
 * could not classify is a person with no class, and the desk must know.
 */
export const RISK_BATCH = 300;

export async function riskClasses(admin: AdminClient): Promise<JobVerdict> {
  const due = await peopleDue(admin, RISK_BATCH);
  const tally = { written: 0, unchanged: 0, override_stands: 0 };
  let failures = 0;
  const failed: string[] = [];
  for (const userId of due) {
    try {
      tally[await deriveRiskFor(admin, userId)] += 1;
    } catch {
      failures += 1;
      if (failed.length < 20) failed.push(userId);
    }
  }
  return {
    outcome: failures > 0 ? "attention" : "ok",
    counts: { due: due.length, ...tally, failed: failures },
    detail: { failed },
    alert:
      failures > 0
        ? {
            kind: "risk_classes_failed",
            severity: "warning",
            detail: { scuml_item: 15, failed: failures, first: failed[0] ?? null },
          }
        : null,
  };
}
