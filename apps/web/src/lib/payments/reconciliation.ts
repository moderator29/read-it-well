import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { recordMoneyAudit, type MoneyActor } from "@/lib/money/audit";
import { recordAlert } from "@/lib/alerts";
import { settleBookingCharge } from "@/lib/bookings/settlement";
import { failureReason, logMoney } from "./observability";
import { PaystackError, isPaystackConfigured, type ChargeSummary } from "./paystack";
import { requireCapability } from "./provider";
import { paystackSeam } from "./providers";
import { isBookingReference, isFundReference } from "./references";
import { refundChargeToCard } from "./refund";
import { REFUND_ALREADY_CLAIMED } from "./refund-outcomes";

/**
 * THE SCHEDULED MONEY RECONCILIATION, AFTER THE WALLET.
 *
 * Vallo holds no customer money (Track A, 25 September 2026), so there is no
 * wallet to reconcile, no withdrawal hold to release and no balance that can
 * go below zero. What is left is the one question that still matters: did
 * Paystack take a charge this platform has not recorded? A booking charge
 * whose webhook and return both went missing is settled on an applied run by
 * the same database function the webhook calls, which confirms it when it
 * matches an approved agreement and otherwise marks it refund-due, in which
 * case it is refunded to the card here. A wallet top-up (a reference from
 * before the wallet was retired) is refunded to the card on an applied run.
 *
 * `apply: false` reports and changes nothing, which is what a first run
 * against a live database should always be.
 */

export const DEFAULT_SWEEP_HOURS = 48;

export type ChargeGap = {
  reference: string;
  amountMinor: number;
  paidAt: string | null;
  family: "booking" | "retired-wallet";
  action: "settled" | "refunded" | "reported" | "unmatched" | "failed";
  reason: string;
};

export type ChargeSweep = {
  from: string;
  to: string;
  chargesSeen: number;
  chargesOurs: number;
  gaps: ChargeGap[];
  refundedMinor: number;
  unavailable: boolean;
  reason: string;
};

export type ReconciliationReport = { charges: ChargeSweep; needsAttention: boolean };

async function recordedReferences(admin: AdminClient, references: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < references.length; i += 100) {
    const slice = references.slice(i, i + 100);
    const { data, error } = await admin
      .from("transactions")
      .select("provider_ref, status")
      .in("provider_ref", slice)
      .in("status", ["SUCCESSFUL", "REFUNDED"]);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) if (row.provider_ref) found.add(row.provider_ref);
  }
  return found;
}

async function handleBookingGap(
  admin: AdminClient,
  charge: ChargeSummary,
  actor: MoneyActor,
): Promise<ChargeGap> {
  const base = { reference: charge.reference, amountMinor: charge.amountMinor, paidAt: charge.paidAt, family: "booking" as const };
  const metaBooking = charge.metadata["booking_id"];
  try {
    const settlement = await settleBookingCharge(admin, {
      reference: charge.reference,
      amountMinor: charge.amountMinor,
      processorFeeMinor: charge.feesMinor ?? null,
      fallbackBookingId: typeof metaBooking === "string" ? metaBooking : null,
    });
    await recordMoneyAudit(admin, {
      actor,
      action: "payment.booking.charge_settled",
      reference: charge.reference,
      amountMinor: charge.amountMinor,
      outcome: settlement.outcome,
      detail: { found_by: "sweep" },
    });
    if (settlement.outcome === "refund-due") {
      const sent = await refundChargeToCard(admin, { reference: charge.reference, reason: settlement.reason, actor });
      // Another path is refunding it (or did): reported, never sent twice.
      if (!sent.ok && sent.reason === REFUND_ALREADY_CLAIMED) return { ...base, action: "reported", reason: REFUND_ALREADY_CLAIMED };
      return { ...base, action: sent.ok ? "refunded" : "failed", reason: settlement.reason };
    }
    if (settlement.outcome === "unknown-reference") return { ...base, action: "unmatched", reason: "unknown_reference" };
    // Found refund-due on an earlier call: the database will not refund it
    // again, and nothing here says the refund went out, so a person looks.
    if (settlement.outcome === "already-settled" && settlement.transactionStatus === "REFUND_DUE") {
      return { ...base, action: "failed", reason: "refund_due_unsent" };
    }
    return { ...base, action: "settled", reason: settlement.outcome };
  } catch (error) {
    return { ...base, action: "failed", reason: failureReason(error) };
  }
}

export async function runMoneyReconciliation(
  admin: AdminClient,
  options?: { hours?: number; apply?: boolean; actor?: MoneyActor; maxPages?: number },
): Promise<ReconciliationReport> {
  const hours = Math.max(1, Math.min(options?.hours ?? DEFAULT_SWEEP_HOURS, 24 * 90));
  const apply = options?.apply ?? false;
  const actor: MoneyActor = options?.actor ?? { kind: "sweep" };
  const to = new Date();
  const from = new Date(to.getTime() - hours * 3_600_000);
  const empty: ChargeSweep = {
    from: from.toISOString(),
    to: to.toISOString(),
    chargesSeen: 0,
    chargesOurs: 0,
    gaps: [],
    refundedMinor: 0,
    unavailable: true,
    reason: "",
  };

  if (!isPaystackConfigured()) {
    return { charges: { ...empty, reason: "paystack_key_missing" }, needsAttention: true };
  }

  let charges: ChargeSummary[];
  try {
    const paystack = paystackSeam();
    requireCapability(paystack, "list_successful_charges");
    charges = await paystack.listSuccessfulCharges({
      from: empty.from,
      to: empty.to,
      ...(options?.maxPages === undefined ? {} : { maxPages: options.maxPages }),
    });
  } catch (error) {
    const reason = error instanceof PaystackError ? `paystack:${error.message}` : failureReason(error);
    logMoney({ surface: "reconcile", outcome: "failed", reason: `sweep_list_failed:${reason}` });
    return { charges: { ...empty, reason }, needsAttention: true };
  }

  const ours = charges.filter((c) => isBookingReference(c.reference) || isFundReference(c.reference));
  let known: Set<string>;
  try {
    known = await recordedReferences(admin, ours.map((c) => c.reference));
  } catch (error) {
    return { charges: { ...empty, reason: failureReason(error) }, needsAttention: true };
  }

  const gaps: ChargeGap[] = [];
  let refundedMinor = 0;
  for (const charge of ours) {
    if (known.has(charge.reference)) continue;
    const family = isBookingReference(charge.reference) ? "booking" : "retired-wallet";
    if (!apply) {
      gaps.push({ reference: charge.reference, amountMinor: charge.amountMinor, paidAt: charge.paidAt, family, action: "reported", reason: "dry_run" });
      continue;
    }
    if (family === "booking") {
      const gap = await handleBookingGap(admin, charge, actor);
      if (gap.action === "refunded") refundedMinor += gap.amountMinor;
      gaps.push(gap);
    } else {
      const sent = await refundChargeToCard(admin, { reference: charge.reference, reason: "wallet_retired", actor });
      if (sent.ok) refundedMinor += charge.amountMinor;
      const claimed = !sent.ok && sent.reason === REFUND_ALREADY_CLAIMED;
      gaps.push({
        reference: charge.reference,
        amountMinor: charge.amountMinor,
        paidAt: charge.paidAt,
        family,
        action: sent.ok ? "refunded" : claimed ? "reported" : "failed",
        reason: claimed ? REFUND_ALREADY_CLAIMED : "wallet_retired",
      });
    }
  }

  if (gaps.some((g) => g.action === "failed" || g.action === "unmatched")) {
    await recordAlert({
      kind: "cron.reconcile.gap",
      severity: "warning",
      detail: { gaps: gaps.length, failed: gaps.filter((g) => g.action === "failed").length },
      subjectId: "paystack-reconcile",
    });
  }

  return {
    charges: {
      from: empty.from,
      to: empty.to,
      chargesSeen: charges.length,
      chargesOurs: ours.length,
      gaps,
      refundedMinor,
      unavailable: false,
      reason: gaps.length > 0 ? "gaps_found" : "clean",
    },
    needsAttention: gaps.length > 0,
  };
}
