import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { recordMoneyAudit, type MoneyActor } from "@/lib/money/audit";
import { failureReason, logMoney } from "./observability";
import { PaystackError, PaystackUnknownOutcome, refundTransaction } from "./paystack";
import { recordAlert } from "@/lib/alerts";

/** The refund was sent and no answer came back: check Paystack before retrying. */
export const UNKNOWN_OUTCOME = "unknown_outcome";

/**
 * Money goes back the way it came: to the card or account, through Paystack.
 *
 * Two callers. The settlement answers `refund-due` for a charge that could
 * not be applied (the whole charge goes back), and an admin refund decides a
 * part or all of a paid booking (`booking_refunds`, processor_status
 * `pending`). Either way the processor is asked here, and what it said is
 * written down. A refund the processor refused stays visible as `failed` on
 * the admin desk rather than being retried blind.
 */

export async function refundChargeToCard(
  admin: AdminClient,
  params: { reference: string; amountMinor?: number; reason: string; actor: MoneyActor },
): Promise<{ ok: true; refundId: string } | { ok: false; reason: string }> {
  try {
    const refund = await refundTransaction({
      reference: params.reference,
      ...(params.amountMinor !== undefined ? { amountMinor: params.amountMinor } : {}),
      merchantNote: `Vallo refund: ${params.reason}`,
      customerNote: "Your payment is being returned to the card or account you paid with.",
    });
    if (params.amountMinor === undefined) {
      await admin.from("transactions").update({ status: "REFUNDED" }).eq("provider_ref", params.reference);
    }
    await recordMoneyAudit(admin, {
      actor: params.actor,
      action: "payment.refund.submitted",
      reference: params.reference,
      amountMinor: params.amountMinor ?? null,
      outcome: "submitted",
      detail: { reason: params.reason, refund_id: refund.refundId, processor_status: refund.status },
    });
    return { ok: true, refundId: refund.refundId };
  } catch (error) {
    /* MON-01 for refunds: a timeout, a 5xx or an unreadable answer means we do
       not know whether Paystack accepted the refund. Recording it as failed
       would invite a second refund of the same charge, so it stays pending
       and a person is told to check Paystack first. */
    if (error instanceof PaystackUnknownOutcome) {
      logMoney({ surface: "refund", outcome: "failed", reason: "unknown_outcome", reference: params.reference });
      await recordAlert({
        kind: "refund.outcome_unknown",
        severity: "critical",
        detail: { reference: params.reference, amount_minor: params.amountMinor ?? null, reason: params.reason },
        subjectId: params.reference,
      });
      return { ok: false, reason: UNKNOWN_OUTCOME };
    }
    const reason = error instanceof PaystackError ? error.message : failureReason(error);
    logMoney({ surface: "refund", outcome: "failed", reason, reference: params.reference });
    await recordMoneyAudit(admin, {
      actor: params.actor,
      action: "payment.refund.failed",
      reference: params.reference,
      amountMinor: params.amountMinor ?? null,
      outcome: "failed",
      detail: { reason: params.reason, error: reason },
    });
    return { ok: false, reason };
  }
}

/** Submit an admin-decided refund row to the processor and record where it is. */
export async function submitBookingRefund(
  admin: AdminClient,
  params: { refundId: string; bookingId: string; amountMinor: number; reason: string; actor: MoneyActor },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: charge } = await admin
    .from("transactions")
    .select("provider_ref")
    .eq("booking_id", params.bookingId)
    .eq("status", "SUCCESSFUL")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!charge?.provider_ref) return { ok: false, reason: "no_settled_charge" };
  const sent = await refundChargeToCard(admin, {
    reference: charge.provider_ref,
    amountMinor: params.amountMinor,
    reason: params.reason,
    actor: params.actor,
  });
  /* Unknown: leave the row pending; the alert above asks a person to check. */
  if (!sent.ok && sent.reason === UNKNOWN_OUTCOME) return sent;
  await admin.rpc("record_processor_refund" as never, {
    p_refund: params.refundId,
    p_status: sent.ok ? "submitted" : "failed",
    p_processor_id: sent.ok ? sent.refundId : "",
  } as never);
  return sent.ok ? { ok: true } : sent;
}
