import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { recordMoneyAudit, type MoneyActor } from "@/lib/money/audit";
import { failureReason, logMoney } from "./observability";
import { PaystackError, PaystackUnknownOutcome, refundTransaction } from "./paystack";
import { recordAlert } from "@/lib/alerts";

import { REFUND_ALREADY_CLAIMED, REFUND_CLAIM_UNAVAILABLE, UNKNOWN_OUTCOME } from "./refund-outcomes";

export { REFUND_ALREADY_CLAIMED, REFUND_CLAIM_UNAVAILABLE, UNKNOWN_OUTCOME };

/** A claim still `claimed` after this long means its caller died mid-refund. */
const STALE_CLAIM_MS = 10 * 60_000;

/**
 * Money goes back the way it came: to the card or account, through Paystack.
 *
 * Two callers. The settlement answers `refund-due` for a charge that could
 * not be applied (the whole charge goes back), and an admin refund decides a
 * part or all of a paid booking (`booking_refunds`, processor_status
 * `pending`). Either way the processor is asked here, and what it said is
 * written down. A refund the processor refused stays visible as `failed` on
 * the admin desk rather than being retried blind.
 *
 * ONE REFUND, ONE CALL. The webhook, the payer's return and the sweep can all
 * be told `refund-due` for the same charge, at the same moment. Before
 * Paystack is called a claim is taken in the database (`claim_card_refund`,
 * an insert on the claim key, committed on its own), and only the caller that
 * took it goes on. Every other caller gets REFUND_ALREADY_CLAIMED and calls
 * nothing. What Paystack answered is written back to the claim: a refusal
 * frees it for a later retry; a submitted refund or an unknown outcome never
 * does. If the claim cannot be taken at all, nothing is sent (the sweep finds
 * the charge again).
 */

type Claim =
  | { kind: "claimed" }
  | { kind: "held"; state: string; claimedAt: string | null }
  | { kind: "unavailable"; reason: string };

async function claimRefund(
  admin: AdminClient,
  key: string,
  params: { reference: string; amountMinor?: number; reason: string },
): Promise<Claim> {
  try {
    const { data, error } = await admin.rpc("claim_card_refund" as never, {
      p_key: key,
      p_reference: params.reference,
      p_amount_minor: params.amountMinor ?? null,
      p_reason: params.reason,
    } as never);
    if (error) return { kind: "unavailable", reason: error.message };
    const answer = (data ?? {}) as { claimed?: unknown; state?: unknown; claimed_at?: unknown };
    if (answer.claimed === true) return { kind: "claimed" };
    const state = typeof answer.state === "string" ? answer.state : "";
    if (state === "" || state === "bad_request") return { kind: "unavailable", reason: state || "no_answer" };
    return { kind: "held", state, claimedAt: typeof answer.claimed_at === "string" ? answer.claimed_at : null };
  } catch (error) {
    return { kind: "unavailable", reason: failureReason(error) };
  }
}

async function settleClaim(
  admin: AdminClient,
  key: string,
  state: "submitted" | "unknown" | "failed",
  processorRefundId: string | null,
): Promise<void> {
  try {
    await admin.rpc("settle_card_refund_claim" as never, {
      p_key: key,
      p_state: state,
      p_processor_refund_id: processorRefundId ?? "",
    } as never);
  } catch {
    // The claim stays `claimed`, which blocks a second refund: the safe side.
  }
}

/** The claim key: a whole charge by its reference, a part refund by its row. */
export function refundClaimKey(params: { reference: string; amountMinor?: number; claimKey?: string }): string | null {
  if (params.claimKey) return params.claimKey;
  return params.amountMinor === undefined ? `charge:${params.reference}` : null;
}

export async function refundChargeToCard(
  admin: AdminClient,
  params: { reference: string; amountMinor?: number; reason: string; actor: MoneyActor; claimKey?: string },
): Promise<{ ok: true; refundId: string } | { ok: false; reason: string }> {
  // A part refund must name what it refunds, or two part refunds of the
  // same charge would share (and block) one claim.
  const key = refundClaimKey(params);
  if (!key) return { ok: false, reason: "claim_key_required" };

  const claim = await claimRefund(admin, key, params);
  if (claim.kind === "unavailable") {
    logMoney({ surface: "refund", outcome: "failed", reason: `claim_unavailable:${claim.reason}`, reference: params.reference });
    return { ok: false, reason: REFUND_CLAIM_UNAVAILABLE };
  }
  if (claim.kind === "held") {
    logMoney({ surface: "refund", outcome: "duplicate", reason: `refund_claim_${claim.state}`, reference: params.reference });
    const age = claim.claimedAt ? Date.now() - Date.parse(claim.claimedAt) : 0;
    if (claim.state === "claimed" && age > STALE_CLAIM_MS) {
      await recordAlert({
        kind: "refund.claim_stale",
        severity: "critical",
        detail: { reference: params.reference, claim_key: key, claimed_at: claim.claimedAt, reason: params.reason },
        subjectId: params.reference,
      });
    }
    return { ok: false, reason: REFUND_ALREADY_CLAIMED };
  }

  let refund: Awaited<ReturnType<typeof refundTransaction>>;
  try {
    refund = await refundTransaction({
      reference: params.reference,
      ...(params.amountMinor !== undefined ? { amountMinor: params.amountMinor } : {}),
      merchantNote: `Vallo refund: ${params.reason}`,
      customerNote: "Your payment is being returned to the card or account you paid with.",
    });
  } catch (error) {
    /* MON-01 for refunds: a timeout, a 5xx or an unreadable answer means we do
       not know whether Paystack accepted the refund. Recording it as failed
       would invite a second refund of the same charge, so the claim is kept
       (`unknown`) and a person is told to check Paystack first. Only an
       explicit refusal frees the claim. */
    const refused = error instanceof PaystackError && !(error instanceof PaystackUnknownOutcome);
    if (!refused) {
      await settleClaim(admin, key, "unknown", null);
      logMoney({ surface: "refund", outcome: "failed", reason: "unknown_outcome", reference: params.reference });
      await recordAlert({
        kind: "refund.outcome_unknown",
        severity: "critical",
        detail: { reference: params.reference, amount_minor: params.amountMinor ?? null, reason: params.reason },
        subjectId: params.reference,
      });
      return { ok: false, reason: UNKNOWN_OUTCOME };
    }
    await settleClaim(admin, key, "failed", null);
    const reason = error.message;
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

  // Paystack took it. Nothing after this line may turn it into a failure.
  await settleClaim(admin, key, "submitted", refund.refundId);
  try {
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
  } catch (error) {
    logMoney({ surface: "refund", outcome: "failed", reason: `record_after_submit:${failureReason(error)}`, reference: params.reference });
  }
  return { ok: true, refundId: refund.refundId };
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
    claimKey: `booking_refund:${params.refundId}`,
  });
  /* Unknown, or another caller holds this row's claim, or the claim could not
     be taken: leave the row as it is. Paystack was not asked by this call
     (or its answer is unknown and the alert asks a person to check). */
  if (
    !sent.ok &&
    (sent.reason === UNKNOWN_OUTCOME || sent.reason === REFUND_ALREADY_CLAIMED || sent.reason === REFUND_CLAIM_UNAVAILABLE)
  ) {
    return sent;
  }
  await admin.rpc("record_processor_refund" as never, {
    p_refund: params.refundId,
    p_status: sent.ok ? "submitted" : "failed",
    p_processor_id: sent.ok ? sent.refundId : "",
  } as never);
  return sent.ok ? { ok: true } : sent;
}
