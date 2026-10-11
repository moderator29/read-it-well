import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MoneyOutcome } from "@/lib/payments/observability";
import { recordMoneyAudit } from "@/lib/money/audit";
import { refundChargeToCard } from "@/lib/payments/refund";
import { isDepositReference } from "@/lib/payments/references";
import type { AdminClient } from "@/lib/supabase/service";

/**
 * D75: THE TABLE DEPOSIT LEG OF THE PAYSTACK WEBHOOK, and the refunds it owes.
 *
 * Called from app/api/paystack/webhook/route.ts for `rm-dep-` references only,
 * after the route verified the signature, the same way promotions are.
 *
 * charge.success -> `reservation_deposit_settle`, the only way a deposit is
 *   paid. Idempotent on the reference. A charge the database cannot apply (the
 *   wrong amount, the reservation cancelled meanwhile, the time passed) is
 *   `refund-due` and goes straight back to the card through the one refund
 *   path (`refundChargeToCard`, which claims the refund first so it is sent
 *   once).
 * charge.failed  -> `reservation_deposit_close(..., 'failed')`, from pending only.
 *
 * `sendDueDepositRefunds` is the hourly retry and the path for refunds the
 * restaurant's cancellation rule decided inside the database (a guest who
 * cancelled in time, a venue that cancelled), which cannot call Paystack.
 */

export type DepositVerdict = { outcome: MoneyOutcome; reason: string; httpStatus: number; amountMinor?: number | null };

type ChargeData = { reference?: string; amount?: number; currency?: string };

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

const rpc = (admin: AdminClient) => admin as unknown as Rpc;

async function sendRefund(admin: AdminClient, reference: string, reason: string, actor: { kind: "webhook" } | { kind: "sweep" }) {
  const sent = await refundChargeToCard(admin, { reference, reason: `table_deposit:${reason}`, actor });
  if (sent.ok) {
    await rpc(admin).rpc("reservation_deposit_refunded", { p_reference: reference, p_processor_refund_id: sent.refundId });
  }
  return sent;
}

export async function handleDepositChargeSuccess(admin: AdminClient, data: ChargeData): Promise<DepositVerdict> {
  const reference = data.reference ?? "";
  if (!isDepositReference(reference)) return { outcome: "ignored", reason: "not_a_deposit_reference", httpStatus: 200 };
  const amountMinor = Number.isSafeInteger(data.amount) ? (data.amount as number) : null;
  if (amountMinor === null || amountMinor <= 0) return { outcome: "rejected", reason: "deposit_amount_not_positive_integer", httpStatus: 200 };
  const currency = typeof data.currency === "string" ? data.currency : null;

  const { data: row, error } = await rpc(admin).rpc("reservation_deposit_settle", {
    p_reference: reference,
    p_amount_minor: amountMinor,
    p_currency: currency,
  });
  if (error || !row || typeof row !== "object") {
    // Unknown state: Paystack retries, and the settle is idempotent.
    return { outcome: "failed", reason: "deposit_settle_error", httpStatus: 500, amountMinor };
  }
  const answer = row as { outcome?: unknown; reason?: unknown };
  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: "payment.deposit.charge_settled",
    reference,
    amountMinor,
    outcome: typeof answer.outcome === "string" ? answer.outcome : "unreadable",
    detail: { source: "webhook" },
  });
  switch (answer.outcome) {
    case "settled":
      return { outcome: "posted", reason: "deposit_paid", httpStatus: 200, amountMinor };
    case "duplicate":
      return { outcome: "duplicate", reason: "deposit_already_settled", httpStatus: 200, amountMinor };
    case "not_found":
      return { outcome: "ignored", reason: "reference_not_ours", httpStatus: 200, amountMinor };
    case "refund-due": {
      const sent = await sendRefund(admin, reference, String(answer.reason ?? "not_applied"), { kind: "webhook" });
      /* A decision either way: the refund is sent, or held for the hourly
         retry (an unknown outcome raises its own critical alert). */
      return { outcome: "failed", reason: `deposit_refund_due:${sent.ok ? "sent" : sent.reason}`, httpStatus: 200, amountMinor };
    }
    default:
      return { outcome: "failed", reason: "deposit_settle_unreadable", httpStatus: 500, amountMinor };
  }
}

export async function handleDepositChargeFailed(admin: AdminClient, data: ChargeData): Promise<DepositVerdict> {
  const reference = data.reference ?? "";
  if (!isDepositReference(reference)) return { outcome: "ignored", reason: "not_a_deposit_reference", httpStatus: 200 };
  const { data: moved } = await rpc(admin).rpc("reservation_deposit_close", { p_reference: reference, p_status: "failed" });
  return { outcome: "rejected", reason: moved === "changed" ? "deposit_charge_failed" : "deposit_charge_failed_no_move", httpStatus: 200 };
}

export type DepositRefundRun = { due: number; sent: number; held: number };

/** Send every refund the restaurant's rule decided. One claim per charge, so a refund is never sent twice. */
export async function sendDueDepositRefunds(admin: AdminClient, limit = 25): Promise<DepositRefundRun | null> {
  /* Untyped: the table is in a pending migration, not yet in database.types.ts. */
  const { data, error } = await (admin as unknown as SupabaseClient)
    .from("reservation_deposits")
    .select("provider_ref, outcome_reason")
    .eq("status", "refund_due")
    .limit(limit);
  if (error || !Array.isArray(data)) return null;
  const run: DepositRefundRun = { due: data.length, sent: 0, held: 0 };
  for (const row of data as { provider_ref: string; outcome_reason: string | null }[]) {
    const sent = await sendRefund(admin, row.provider_ref, row.outcome_reason ?? "refund_due", { kind: "sweep" });
    if (sent.ok) run.sent += 1;
    else run.held += 1;
  }
  return run;
}
