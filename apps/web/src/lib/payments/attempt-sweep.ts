import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import type { JobVerdict } from "@/lib/bookings/lifecycle";
import { recordMoneyAudit } from "@/lib/money/audit";
import { isPaystackConfigured, currentPaystackMode } from "./paystack";
import { judgeAttempt, lastOpenedAt } from "./attempt-rules";
import { applyVerdict, askPaystack, settleConfirmedCharge } from "./attempts";

/**
 * THE ATTEMPT SWEEP. Once an hour, inside the hold sweep and right after it
 * (`lib/cron/jobs/hold-sweep.ts`, :05, so a slow Paystack can never keep holds
 * from being released), within a 40-second budget, ask Paystack about each card attempt
 * that is still PENDING but no longer in flight by the clock (opened more than
 * 45 minutes ago), and close it on Paystack's word:
 *
 *   success                         settle, through the one settlement path
 *   failed, reversed                FAILED
 *   abandoned, or no such reference ABANDONED
 *   ongoing, pending, processing,   left PENDING, with Paystack's word and the
 *   queued, or anything new         time recorded, so the in-flight predicate
 *                                   keeps counting it while it is moving
 *   no usable answer                left PENDING, untouched
 *
 * It closes attempts; it never moves money on a guess. A success is settled
 * only because Paystack's verify said so, which is exactly what the webhook
 * and the return path do, and the refund-due branch is theirs too.
 *
 * WHY HOURLY IS ENOUGH. Nothing waits on this sweep to be unblocked: the
 * in-flight predicate (`private.payment_attempt_in_flight`) stops counting an
 * unfinished attempt 45 minutes after it was last opened, by the clock. The
 * sweep keeps the ledger honest (PENDING rows become what they really were)
 * and records "still moving" for the slow ones so they keep counting.
 *
 * THE RECONCILIATION STAYS THE SAFETY NET. `/api/paystack/reconcile` lists
 * every successful charge Paystack took and compares it with the ledger; this
 * sweep does not replace it and does not change it.
 *
 * ONE MODE AT A TIME. The database hands back only attempts opened on this
 * deployment's Paystack mode (`paystack_mode`; rows from before it existed
 * count as live), so a sandbox deployment never judges a live attempt by a
 * test key's "not found", and the reverse.
 */

const BATCH = 25;

/**
 * How long one pass may spend asking Paystack. Each verify can take up to its
 * fifteen-second timeout, so 25 slow answers could outlast the function. The
 * pass stops starting new checks after this budget and leaves the rest for the
 * next hour (they are ordered least recently checked first, so nothing starves).
 */
export const SWEEP_BUDGET_MS = 40_000;

type DueRow = {
  id: string;
  provider_ref: string;
  booking_id: string;
  created_at: string;
  checkout_opened_at: string | null;
  processor_status: string | null;
  paystack_mode: string | null;
};

export type AttemptSweepCounts = {
  checked: number;
  /** Left for the next run because the time budget ran out. */
  deferred: number;
  /** Paystack took it in another currency: flagged for a person, never settled here. */
  not_ngn: number;
  settled: number;
  refunded: number;
  failed: number;
  abandoned: number;
  kept: number;
  unknown: number;
  errors: number;
};

export type AttemptSweepSummary = {
  /** False when it did not run (no usable Paystack key for this mode, or the list was unreadable). */
  ran: boolean;
  mode: string | null;
  counts: AttemptSweepCounts;
  reason: string | null;
};

/**
 * One pass. NEVER THROWS: the hold sweep it runs inside must still release
 * holds when Paystack or this read is down. Failures are counted instead.
 */
export async function sweepStaleAttempts(
  admin: AdminClient,
  now: () => number = Date.now,
  budgetMs: number = SWEEP_BUDGET_MS,
): Promise<AttemptSweepSummary> {
  const started = now();
  const counts: AttemptSweepCounts = {
    checked: 0,
    deferred: 0,
    not_ngn: 0,
    settled: 0,
    refunded: 0,
    failed: 0,
    abandoned: 0,
    kept: 0,
    unknown: 0,
    errors: 0,
  };
  if (!isPaystackConfigured()) return { ran: false, mode: null, counts, reason: "paystack_not_configured" };

  const mode = currentPaystackMode();
  let due: DueRow[];
  try {
    const { data, error } = await admin.rpc("payment_attempts_due_for_check", { p_mode: mode, p_limit: BATCH });
    if (error) throw new Error(error.message);
    due = (data ?? []) as DueRow[];
  } catch {
    counts.errors += 1;
    return { ran: false, mode, counts, reason: "due_list_unreadable" };
  }

  for (const row of due) {
    if (now() - started >= budgetMs) {
      counts.deferred += 1;
      continue;
    }
    /* Belt and braces: the list is already filtered to this mode. */
    if ((row.paystack_mode ?? "live") !== mode) continue;
    counts.checked += 1;
    try {
      const { answer, tx } = await askPaystack(row.provider_ref);
      if (answer.kind === "unknown") counts.unknown += 1;
      const verdict = judgeAttempt(answer, { payerClosed: false, openedAt: lastOpenedAt(row), now: now() });

      if (verdict.action === "settle") {
        if (!tx) continue;
        const settled = await settleConfirmedCharge(admin, row.provider_ref, tx, { kind: "sweep" }, row.booking_id);
        /* Any outcome that recorded the money counts as settled, including a
           flatmate share settling toward its move-in total. */
        if (settled.outcome === "refund-due") counts.refunded += 1;
        else if (settled.outcome === "not-ngn") counts.not_ngn += 1;
        else if (settled.outcome === "unknown-reference" || settled.outcome === "mode-mismatch") counts.errors += 1;
        else counts.settled += 1;
        continue;
      }

      /* Conditional on the attempt not having been handed to the payer again
         since the list was read: a retry that reuses it moves
         checkout_opened_at, and then this close finds nothing to move. */
      const moved = await applyVerdict(admin, row.provider_ref, verdict, {
        checkoutOpenedAt: row.checkout_opened_at,
      });
      if (verdict.action === "keep") {
        counts.kept += 1;
        continue;
      }
      if (!moved) continue;
      if (verdict.action === "fail") counts.failed += 1;
      else counts.abandoned += 1;
      await recordMoneyAudit(admin, {
        actor: { kind: "sweep" },
        action: verdict.action === "fail" ? "payment.attempt.failed" : "payment.attempt.abandoned",
        reference: row.provider_ref,
        outcome: verdict.action === "fail" ? "failed" : verdict.reason,
        detail: { processor_status: verdict.processorStatus, mode },
      });
    } catch {
      counts.errors += 1;
    }
  }

  return { ran: true, mode, counts, reason: null };
}

/**
 * Fold one attempt sweep into the hold sweep's verdict: its counts prefixed
 * `attempts_`, its summary in the detail, and attention (with a warning) only
 * when something errored. A clean hold sweep with a clean attempt sweep stays
 * clean, and the hold sweep's own alert always wins.
 */
export function withAttemptSweep(verdict: JobVerdict, sweep: AttemptSweepSummary): JobVerdict {
  const counts: Record<string, number> = { ...verdict.counts };
  for (const [key, value] of Object.entries(sweep.counts)) counts[`attempts_${key}`] = value;
  const erred = sweep.counts.errors > 0;
  return {
    outcome: erred ? "attention" : verdict.outcome,
    counts,
    detail: { ...verdict.detail, attempts: { ran: sweep.ran, mode: sweep.mode, reason: sweep.reason } },
    alert:
      verdict.alert ??
      (erred
        ? {
            kind: "cron.attempt_sweep.errors",
            severity: "warning",
            detail: {
              mode: sweep.mode,
              checked: sweep.counts.checked,
              errors: sweep.counts.errors,
              reason: sweep.reason,
            },
          }
        : null),
  };
}
