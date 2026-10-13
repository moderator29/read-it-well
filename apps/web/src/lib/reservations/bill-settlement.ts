import "server-only";

import type { MoneyOutcome } from "@/lib/payments/observability";
import { recordMoneyAudit } from "@/lib/money/audit";
import { isBillReference } from "@/lib/payments/references";
import type { AdminClient } from "@/lib/supabase/service";

/**
 * FOUNDER DECISION D: THE RESTAURANT BILL LEG OF THE PAYSTACK WEBHOOK.
 *
 * Called from app/api/paystack/webhook/route.ts for `rm-bill-` references
 * only, after the route verified the signature, the way the table deposit is.
 * Before this the bill was confirmed only when the diner came back from
 * Paystack (`confirmTableBillReturn`); a diner who closed the tab after paying
 * left a paid bill marked unpaid until they opened it again.
 *
 * charge.success -> `restaurant_bill_settle`, the same function the return
 *   calls, with the charged kobo and currency from the signed payload. It is
 *   idempotent on the reference (a second delivery, or the return arriving
 *   first, answers `duplicate`), it refuses a charge of the wrong amount or
 *   currency and raises a high risk alert for a person to refund by hand, and
 *   only a settle marks the table seated.
 * charge.failed  -> `restaurant_bill_reopen`, from pending only, so the diner
 *   can pay again; a late failure cannot unpick a paid bill.
 *
 * Bill payment stays off until the founder sets the commission and a
 * restaurant has a Paystack subaccount (`restaurant_bill_open` answers
 * not_priced or payee_not_set_up and no checkout is opened). This leg only
 * ever settles a bill a checkout was opened for; it opens nothing.
 */

export type BillVerdict = { outcome: MoneyOutcome; reason: string; httpStatus: number; amountMinor?: number | null };

type ChargeData = { reference?: string; amount?: number; currency?: string };

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

const rpc = (admin: AdminClient) => admin as unknown as Rpc;

export async function handleBillChargeSuccess(admin: AdminClient, data: ChargeData): Promise<BillVerdict> {
  const reference = data.reference ?? "";
  if (!isBillReference(reference)) return { outcome: "ignored", reason: "not_a_bill_reference", httpStatus: 200 };
  const amountMinor = Number.isSafeInteger(data.amount) ? (data.amount as number) : null;
  if (amountMinor === null || amountMinor <= 0) return { outcome: "rejected", reason: "bill_amount_not_positive_integer", httpStatus: 200 };
  const currency = typeof data.currency === "string" ? data.currency : null;

  const { data: row, error } = await rpc(admin).rpc("restaurant_bill_settle", {
    p_reference: reference,
    p_amount_minor: amountMinor,
    p_currency: currency,
  });
  if (error || !row || typeof row !== "object") {
    // Unknown state: Paystack retries, and the settle is idempotent.
    return { outcome: "failed", reason: "bill_settle_error", httpStatus: 500, amountMinor };
  }
  const outcome = (row as { outcome?: unknown }).outcome;
  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: "payment.restaurant_bill.charge_settled",
    reference,
    amountMinor,
    outcome: typeof outcome === "string" ? outcome : "unreadable",
    detail: { source: "webhook" },
  });
  switch (outcome) {
    case "settled":
      return { outcome: "posted", reason: "bill_paid", httpStatus: 200, amountMinor };
    case "duplicate":
      return { outcome: "duplicate", reason: "bill_already_settled", httpStatus: 200, amountMinor };
    case "not_found":
      return { outcome: "ignored", reason: "reference_not_ours", httpStatus: 200, amountMinor };
    case "mismatch":
      /* Decided: the bill is not marked paid, and the database raised a high
         risk alert for a person to check and refund. A retry would change
         nothing. */
      return { outcome: "rejected", reason: "bill_amount_mismatch", httpStatus: 200, amountMinor };
    default:
      return { outcome: "failed", reason: "bill_settle_unreadable", httpStatus: 500, amountMinor };
  }
}

export async function handleBillChargeFailed(admin: AdminClient, data: ChargeData): Promise<BillVerdict> {
  const reference = data.reference ?? "";
  if (!isBillReference(reference)) return { outcome: "ignored", reason: "not_a_bill_reference", httpStatus: 200 };
  const { data: moved, error } = await rpc(admin).rpc("restaurant_bill_reopen", { p_reference: reference });
  if (error) return { outcome: "failed", reason: "bill_reopen_error", httpStatus: 500 };
  return { outcome: "rejected", reason: moved === "changed" ? "bill_charge_failed" : "bill_charge_failed_no_move", httpStatus: 200 };
}
