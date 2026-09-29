import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminClient } from "@/lib/supabase/service";
import type { MoneyActor } from "@/lib/money/audit";
import { recordAlert } from "@/lib/alerts";
import { REFUND_ALREADY_CLAIMED, REFUND_CLAIM_UNAVAILABLE, UNKNOWN_OUTCOME, refundChargeToCard } from "../payments/refund";

/**
 * V-86. A flatmate's paid share goes back to the card it came from.
 *
 * When a shared move-in is cancelled before its shares reach the total (by
 * the lead, `rent_split_cancel_as`, or by the daily sweep on the move-in
 * day), the database records one `rent_share_refunds` row per paid share.
 *
 * SENT ONCE. Each row is CLAIMED before Paystack is called
 * (`claim_rent_share_refund`: pending, or failed under three attempts, becomes
 * `sending`), and only the caller that got the row back sends it, so two
 * runs (the lead's cancel and the hourly job, or two overlapping jobs) can
 * never both send the same share. What Paystack said is then written down
 * (`record_rent_share_refund`): submitted, failed, or, when no answer came
 * back (a timeout, a 5xx), `unknown`. An `unknown` row is never claimed or
 * sent again by anything automatic: the database and the refund module both
 * raise an alert and a person checks Paystack first. A row left in `sending`
 * because the process died between the claim and the record is likewise
 * never re-sent; it stays on the operator's refund clock, and the hourly job
 * raises a critical alert for it after 15 minutes (`rent_share_refunds_stuck`).
 * If writing the answer down fails, `refund.outcome_unknown` is raised.
 *
 * The card refund itself also takes a claim (`claim_card_refund`, in
 * `refundChargeToCard`). If that claim is already held, another caller is
 * refunding this charge, so the share is recorded `unknown` for a person to
 * check. If that claim cannot be taken at all, nothing was sent and nothing
 * is recorded: the row stays `sending` and the stuck check surfaces it.
 * Paystack's `refund.processed` webhook closes the last leg.
 */

export type DueShareRefund = { refund_id: string; reference: string; amount_minor: number };

export type StuckShareRefund = { refund_id: string; processor_status: string; attempts: number };

/** Share refunds a person must look at: sending for over 15 minutes, or failed three times. Null when the read failed. */
export async function stuckShareRefunds(admin: AdminClient): Promise<StuckShareRefund[] | null> {
  const { data, error } = await admin.rpc("rent_share_refunds_stuck" as never);
  if (error || !Array.isArray(data)) return null;
  return (data as Record<string, unknown>[]).flatMap((row) =>
    typeof row.refund_id === "string"
      ? [{ refund_id: row.refund_id, processor_status: String(row.processor_status ?? ""), attempts: Number(row.attempts) || 0 }]
      : [],
  );
}

export type ShareRefundRun = { submitted: number; failed: number; unknown: number; skipped: number };

type Claimed = { reference: string; amountMinor: number };

async function claim(admin: AdminClient, refundId: string): Promise<Claimed | null> {
  const { data, error } = await admin.rpc("claim_rent_share_refund" as never, { p_refund: refundId } as never);
  const rows = data as unknown;
  if (error || !Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;
  const amount = Number(row.amount_minor);
  if (typeof row.reference !== "string" || !Number.isSafeInteger(amount) || amount <= 0) return null;
  return { reference: row.reference, amountMinor: amount };
}

async function record(
  admin: AdminClient,
  refundId: string,
  status: "submitted" | "failed" | "unknown",
  processorId: string,
): Promise<void> {
  let wrote = false;
  try {
    const { data, error } = await admin.rpc("record_rent_share_refund" as never, {
      p_refund: refundId,
      p_status: status,
      p_processor_id: processorId,
    } as never);
    const answer = error ? null : String((data as { status?: unknown } | null)?.status ?? "");
    wrote = answer === "ok";
    if (answer === "not_claimed") {
      // Somebody (the webhook, a person) already moved the row on. Only a row
      // still waiting to be sent means our answer was lost.
      const { data: row, error: readError } = await (admin as unknown as SupabaseClient)
        .from("rent_share_refunds")
        .select("processor_status")
        .eq("id", refundId)
        .maybeSingle();
      const state = readError ? null : (row as { processor_status?: unknown } | null)?.processor_status;
      wrote = !(state === "sending" || state === "pending" || state === null || state === undefined);
    }
  } catch {
    wrote = false;
  }
  if (!wrote) {
    // The row stays `sending`, which nothing re-sends; a person must look.
    await recordAlert({
      kind: "refund.outcome_unknown",
      severity: "critical",
      detail: { rent_share_refund: refundId, paystack_said: status, processor_refund_id: processorId || null },
      subjectId: refundId,
    });
  }
}

export async function submitShareRefunds(
  admin: AdminClient,
  refunds: DueShareRefund[],
  actor: MoneyActor,
): Promise<ShareRefundRun> {
  const run: ShareRefundRun = { submitted: 0, failed: 0, unknown: 0, skipped: 0 };
  for (const refund of refunds) {
    const claimed = await claim(admin, refund.refund_id);
    // Somebody else claimed it, or it is no longer due: never send it here.
    if (!claimed) {
      run.skipped += 1;
      continue;
    }
    const sent = await refundChargeToCard(admin, {
      reference: claimed.reference,
      reason: "rent_split_cancelled",
      actor,
    });
    if (!sent.ok && sent.reason === REFUND_CLAIM_UNAVAILABLE) {
      run.skipped += 1;
      continue;
    }
    if (!sent.ok && (sent.reason === UNKNOWN_OUTCOME || sent.reason === REFUND_ALREADY_CLAIMED)) {
      await record(admin, refund.refund_id, "unknown", "");
      run.unknown += 1;
      continue;
    }
    await record(admin, refund.refund_id, sent.ok ? "submitted" : "failed", sent.ok ? sent.refundId : "");
    if (sent.ok) run.submitted += 1;
    else run.failed += 1;
  }
  return run;
}

/** The share refunds due to be sent (or re-sent, under the cap). Null when the read failed. */
export async function dueShareRefunds(admin: AdminClient, limit = 25): Promise<DueShareRefund[] | null> {
  const { data, error } = await admin.rpc("rent_share_refunds_due" as never, { p_limit: limit } as never);
  if (error || !Array.isArray(data)) return null;
  return (data as Record<string, unknown>[]).flatMap((row) => {
    const amount = Number(row.amount_minor);
    return typeof row.refund_id === "string" && typeof row.reference === "string" && Number.isSafeInteger(amount)
      ? [{ refund_id: row.refund_id, reference: row.reference, amount_minor: amount }]
      : [];
  });
}
