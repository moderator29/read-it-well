import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import type { AdminClient } from "../rpc";
import type { CronRunRecord } from "../report";
import { isPaystackConfigured } from "../../payments/paystack";
import { dueShareRefunds, stuckShareRefunds, submitShareRefunds } from "../../tenancy/share-refunds";

/**
 * V-86. Hourly: send every flatmate share refund still waiting (a cancelled
 * or stalled shared move-in) to Paystack `/refund`, back to the card it came
 * from. The lead's cancel action sends them at once; this is the retry and
 * the path for the database's own daily sweep (`vallo_sweep_rent_splits`),
 * which cannot call Paystack. Each row is claimed before it is sent, so a
 * share is sent once; an unknown answer is recorded `unknown` and never
 * re-sent automatically (the refund module raises `refund.outcome_unknown`);
 * a failed one is retried at most three times in all.
 */
export async function rentShareRefunds(admin: AdminClient): Promise<JobVerdict> {
  // A share refund a person must look at, whatever else this run does:
  // claimed but never answered for 15 minutes, or failed three times.
  const stuck = await stuckShareRefunds(admin);
  const stuckAlert: CronRunRecord["alert"] =
    stuck === null
      ? { kind: "cron.rent_share_refunds", severity: "warning" as const, detail: { read: "rent_share_refunds_stuck failed" } }
      : stuck.length > 0
        ? {
            kind: "rent_share_refund.stuck",
            severity: "critical" as const,
            detail: {
              stuck: stuck.length,
              ...Object.fromEntries(stuck.slice(0, 20).map((row, i) => [`r${i}`, `${row.refund_id}:${row.processor_status}:${row.attempts}`])),
            },
          }
        : null;
  if (!isPaystackConfigured()) {
    return {
      outcome: stuckAlert ? "attention" : "ok",
      counts: { due: 0, stuck: stuck?.length ?? 0 },
      detail: { skipped: "paystack_not_configured" },
      alert: stuckAlert,
    };
  }
  const due = await dueShareRefunds(admin, 25);
  if (due === null) {
    return {
      outcome: "attention",
      counts: { due: 0, stuck: stuck?.length ?? 0 },
      detail: { read: "failed" },
      alert: stuckAlert ?? { kind: "cron.rent_share_refunds", severity: "warning", detail: { read: "rent_share_refunds_due failed" } },
    };
  }
  const run = await submitShareRefunds(admin, due, { kind: "sweep" });
  const trouble = run.failed + run.unknown;
  return {
    outcome: trouble > 0 || stuckAlert ? "attention" : "ok",
    counts: {
      due: due.length,
      submitted: run.submitted,
      failed: run.failed,
      unknown: run.unknown,
      skipped: run.skipped,
      stuck: stuck?.length ?? 0,
    },
    detail: {},
    alert:
      stuckAlert ??
      (trouble > 0
        ? { kind: "cron.rent_share_refunds", severity: "warning", detail: { failed: run.failed, unknown: run.unknown } }
        : null),
  };
}
