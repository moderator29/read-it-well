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

export type RefundableCharge = {
  provider_ref: string;
  share_payer_id: string | null;
  amount_minor: number;
  /** Already committed to refunds on this charge (submitted, settled, or claimed and in flight). */
  refunded_minor: number;
};

/**
 * D40: SPLIT A BOOKING REFUND ACROSS THE CHARGES THAT PAID FOR IT.
 *
 * A booking can carry several successful charges, one per flatmate sharing it
 * (`transactions_one_share_success_per_payer`). The admin decides a refund for
 * the BOOKING (the database computes it against the sum of every charge), so
 * the money goes back to each card in proportion to what that card still has
 * to refund, never all of it to whichever flatmate paid last. Largest
 * remainder rounding, so the parts sum exactly to the decision.
 *
 * Refused, never guessed: a booking mixing an unsplit charge with share
 * charges, a charge with no processor reference, or a refund larger than what
 * is still refundable across the charges.
 */
export function allocateBookingRefund(
  charges: RefundableCharge[],
  amountMinor: number,
): { ok: true; parts: { charge: RefundableCharge; amountMinor: number }[] } | { ok: false; reason: string } {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return { ok: false, reason: "invalid_amount" };
  if (charges.length === 0) return { ok: false, reason: "no_settled_charge" };
  if (charges.some((c) => !c.provider_ref)) return { ok: false, reason: "charge_without_reference" };
  const shares = charges.filter((c) => c.share_payer_id !== null);
  if (shares.length > 0 && shares.length !== charges.length) return { ok: false, reason: "mixed_charges" };
  if (shares.length === 0 && charges.length > 1) return { ok: false, reason: "ambiguous_charge" };

  const open = charges
    .map((charge) => ({ charge, remaining: Math.max(0, charge.amount_minor - charge.refunded_minor) }))
    .filter((c) => c.remaining > 0);
  const total = open.reduce((sum, c) => sum + c.remaining, 0);
  if (amountMinor > total) return { ok: false, reason: "refund_exceeds_paid" };

  const exact = open.map((c) => (amountMinor * c.remaining) / total);
  const parts = open.map((c, n) => ({ charge: c.charge, amountMinor: Math.floor(exact[n]!), frac: exact[n]! % 1, cap: c.remaining }));
  let left = amountMinor - parts.reduce((sum, p) => sum + p.amountMinor, 0);
  for (const p of [...parts].sort((a, b) => b.frac - a.frac)) {
    if (left === 0) break;
    if (p.amountMinor < p.cap) {
      p.amountMinor += 1;
      left -= 1;
    }
  }
  return { ok: true, parts: parts.filter((p) => p.amountMinor > 0).map(({ charge, amountMinor: a }) => ({ charge, amountMinor: a })) };
}

type StoredPart = { id: string; provider_ref: string; amount_minor: number; claim_key: string; processor_status: string };
type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

/** Submit an admin-decided refund row to the processor and record where it is. */
export async function submitBookingRefund(
  admin: AdminClient,
  params: { refundId: string; bookingId: string; amountMinor: number; reason: string; actor: MoneyActor },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const rpc = admin.rpc.bind(admin) as unknown as Rpc;
  const markFailed = async (why: string): Promise<boolean> => {
    const { error } = await rpc("record_processor_refund", { p_refund: params.refundId, p_status: "failed", p_processor_id: "" });
    await recordMoneyAudit(admin, {
      actor: params.actor,
      action: "payment.refund.refused",
      reference: params.refundId,
      amountMinor: params.amountMinor,
      outcome: "failed",
      detail: { reason: why, booking_id: params.bookingId },
    });
    return !error;
  };
  const unreadable = async (): Promise<{ ok: false; reason: string }> => {
    /* Unknown, not refused: leave the row pending and tell a person. */
    await recordAlert({
      kind: "refund.unreadable",
      severity: "critical",
      detail: { refund_id: params.refundId, booking_id: params.bookingId },
      subjectId: params.refundId,
    });
    return { ok: false, reason: "charges_unreadable" };
  };

  const { data: rows, error: chargesError } = await admin
    .from("transactions")
    .select("id, provider_ref, share_payer_id, amount_minor")
    .eq("booking_id", params.bookingId)
    .eq("status", "SUCCESSFUL")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (chargesError) return unreadable();
  const raw = (rows ?? []) as { id: string; provider_ref: string | null; share_payer_id: string | null; amount_minor: number }[];

  /* A stored plan always wins, even if the booking's charges changed since:
     replaying it is the only way a retry never sends more than was decided. */
  let plan = await rpc("plan_booking_refund", { p_refund: params.refundId, p_parts: null });
  if (plan.error) return unreadable();
  let planned = plan.data as { status: string; parts?: StoredPart[]; reason?: string } | null;

  /* ONE CHARGE: exactly the path every refund took before D40, including its
     claim key, so the webhook settles it as it always has. */
  if (planned?.status === "none" && raw.length === 1 && raw[0]!.provider_ref) {
    const only = raw[0]!;
    if (params.amountMinor > only.amount_minor) {
      return (await markFailed("refund_exceeds_paid")) ? { ok: false, reason: "refund_exceeds_paid" } : unreadable();
    }
    const sent = await refundChargeToCard(admin, {
      reference: only.provider_ref!,
      amountMinor: params.amountMinor,
      reason: params.reason,
      actor: params.actor,
      claimKey: `booking_refund:${params.refundId}`,
    });
    if (!sent.ok && (sent.reason === UNKNOWN_OUTCOME || sent.reason === REFUND_ALREADY_CLAIMED || sent.reason === REFUND_CLAIM_UNAVAILABLE)) {
      return sent;
    }
    await rpc("record_processor_refund", {
      p_refund: params.refundId,
      p_status: sent.ok ? "submitted" : "failed",
      p_processor_id: sent.ok ? sent.refundId : "",
    });
    return sent.ok ? { ok: true } : sent;
  }

  /* SEVERAL CHARGES (D40). The plan is stored once; a retry or a second admin
     reads it back and never re-splits, so nothing can be sent twice or more
     than was decided. */
  if (planned?.status === "none") {
    const refs = raw.map((r) => r.provider_ref).filter((r): r is string => !!r);
    const claims = await rpc("card_refund_claims_for", { p_refs: refs });
    if (claims.error) return unreadable();
    const ownPrefix = `booking_refund:${params.refundId}`;
    const charges: (RefundableCharge & { id: string })[] = raw.map((r) => ({
      id: r.id,
      provider_ref: r.provider_ref ?? "",
      share_payer_id: r.share_payer_id,
      amount_minor: r.amount_minor,
      refunded_minor: ((claims.data ?? []) as { reference: string; amount_minor: number | null; state: string; claim_key: string }[])
        .filter((c) => c.reference === r.provider_ref && c.state !== "failed" && !c.claim_key.startsWith(ownPrefix))
        .reduce((sum, c) => sum + (c.amount_minor ?? r.amount_minor), 0),
    }));
    const split = allocateBookingRefund(charges, params.amountMinor);
    if (!split.ok) {
      return (await markFailed(split.reason)) ? split : unreadable();
    }
    plan = await rpc("plan_booking_refund", {
      p_refund: params.refundId,
      p_parts: split.parts.map((part) => ({ transaction_id: (part.charge as RefundableCharge & { id: string }).id, amount_minor: part.amountMinor })),
    });
    if (plan.error) return unreadable();
    planned = plan.data as typeof planned;
  }
  if (planned?.status === "legacy" || planned?.status === "bad_plan") {
    const why = planned.status === "legacy" ? "legacy" : `bad_plan:${planned.reason ?? ""}`;
    /* A legacy claim means money may already have gone under the old key:
       never mark failed, a person checks. */
    if (planned.status === "legacy") return unreadable();
    return (await markFailed(why)) ? { ok: false, reason: "bad_plan" } : unreadable();
  }
  if (planned?.status !== "existing" || !planned.parts) return unreadable();

  let sentAny = planned.parts.some((p) => p.processor_status === "submitted" || p.processor_status === "processed");
  for (const part of planned.parts) {
    if (part.processor_status === "submitted" || part.processor_status === "processed") continue;
    const sent = await refundChargeToCard(admin, {
      reference: part.provider_ref,
      amountMinor: part.amount_minor,
      reason: params.reason,
      actor: params.actor,
      claimKey: part.claim_key,
    });
    if (!sent.ok && (sent.reason === UNKNOWN_OUTCOME || sent.reason === REFUND_ALREADY_CLAIMED || sent.reason === REFUND_CLAIM_UNAVAILABLE)) {
      return sent;
    }
    await rpc("record_refund_part", { p_part: part.id, p_status: sent.ok ? "submitted" : "failed", p_processor_id: sent.ok ? sent.refundId : "" });
    if (!sent.ok) {
      /* The database rolls the row up (failed only if no card was refunded)
         and raises the alert when some were. */
      return { ok: false, reason: sentAny ? "partial_refund" : sent.reason };
    }
    sentAny = true;
  }
  return { ok: true };
}
