import "server-only";

import type { MoneyOutcome } from "@/lib/payments/observability";
import { recordMoneyAudit } from "@/lib/money/audit";
import type { AdminClient } from "@/lib/supabase/service";
import { isPromotionReference } from "./reference";
import { markPromotionPurchase } from "./purchase";

/**
 * THE PROMOTION LEG OF THE PAYSTACK WEBHOOK (D60). Called from
 * app/api/paystack/webhook/route.ts for `rm-promo-` references only, after the
 * route has verified the signature.
 *
 * charge.success → `promotion_purchase_settle`, the ONLY activation. In one
 * database transaction it checks the amount and currency against the price
 * frozen at purchase, opens the labelled placement and posts FEE_CHARGED to
 * ledger_vallo_revenue under 'promotion:<purchase id>'. Idempotent on the
 * reference: a replay answers `duplicate` and writes nothing.
 *
 * charge.failed → status 'failed' (never from 'paid').
 *
 * Status codes follow the route's contract: 200 for a decision, 500 when the
 * write threw or errored so Paystack retries. A mismatch is a decision (200)
 * but answers outcome "failed" so the route raises the critical desk alert:
 * money arrived that does not match what was sold and needs a human (refund).
 */

export type PromotionVerdict = {
  outcome: MoneyOutcome;
  reason: string;
  httpStatus: number;
  amountMinor?: number | null;
};

type ChargeData = { reference?: string; amount?: number; currency?: string };

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export async function handlePromotionChargeSuccess(admin: AdminClient, data: ChargeData): Promise<PromotionVerdict> {
  const reference = data.reference ?? "";
  if (!isPromotionReference(reference)) return { outcome: "ignored", reason: "not_a_promotion_reference", httpStatus: 200 };
  const amountMinor = Number.isSafeInteger(data.amount) ? (data.amount as number) : null;
  if (amountMinor === null || amountMinor <= 0) {
    return { outcome: "rejected", reason: "promotion_amount_not_positive_integer", httpStatus: 200 };
  }
  // Currency absent is not assumed NGN: the database compares it to the frozen row.
  const currency = typeof data.currency === "string" ? data.currency : null;

  const { data: row, error } = await (admin as unknown as Rpc).rpc("promotion_purchase_settle", {
    p_reference: reference,
    p_amount_minor: amountMinor,
    p_currency: currency,
  });
  if (error || !row || typeof row !== "object") {
    // Unknown state: let Paystack retry. The settle is idempotent.
    return { outcome: "failed", reason: "promotion_settle_error", httpStatus: 500, amountMinor };
  }
  const outcome = (row as { outcome?: unknown }).outcome;

  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: "payment.promotion.charge_settled",
    reference,
    amountMinor,
    outcome: typeof outcome === "string" ? outcome : "unreadable",
    detail: { source: "webhook" },
  });

  switch (outcome) {
    case "activated":
      return { outcome: "posted", reason: "promotion_activated", httpStatus: 200, amountMinor };
    case "duplicate":
      return { outcome: "duplicate", reason: "promotion_already_activated", httpStatus: 200, amountMinor };
    case "mismatch":
      return { outcome: "failed", reason: "promotion_amount_or_currency_mismatch", httpStatus: 200, amountMinor };
    case "not_found":
      return { outcome: "ignored", reason: "reference_not_ours", httpStatus: 200, amountMinor };
    default:
      return { outcome: "failed", reason: "promotion_settle_unreadable", httpStatus: 500, amountMinor };
  }
}

export async function handlePromotionChargeFailed(admin: AdminClient, data: ChargeData): Promise<PromotionVerdict> {
  const reference = data.reference ?? "";
  if (!isPromotionReference(reference)) return { outcome: "ignored", reason: "not_a_promotion_reference", httpStatus: 200 };
  const moved = await markPromotionPurchase(admin, reference, "failed");
  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: "payment.promotion.charge_failed",
    reference,
    outcome: moved ? "failed" : "unchanged",
    detail: { source: "webhook" },
  });
  return { outcome: "rejected", reason: moved ? "promotion_charge_failed" : "promotion_charge_failed_no_move", httpStatus: 200 };
}
