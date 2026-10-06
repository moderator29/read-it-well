import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { recordMoneyAudit, type MoneyActor } from "@/lib/money/audit";
import { settleBookingCharge, type ChargeSettlement } from "@/lib/bookings/settlement";
import { announceConfirmedStay } from "@/lib/bookings/arrival";
import { refundChargeToCard } from "./refund";
import { recordAlert } from "@/lib/alerts";
import {
  PaystackError,
  PaystackUnknownOutcome,
  currentPaystackMode,
  type VerifiedTransaction,
} from "./paystack";
import { paystackSeam, verifyRecord } from "./providers";
import {
  decideReuse,
  isAttemptInFlight,
  pickReusableAttempt,
  type AttemptClock,
  type AttemptVerdict,
  type ExpectedCharge,
  type ReusableRow,
  type VerifyAnswer,
} from "./attempt-rules";

/**
 * The database and processor half of an attempt's life. The decisions
 * themselves are pure and live in `./attempt-rules.ts`; this file only reads,
 * asks Paystack, and writes what was decided.
 *
 * EVERY WRITE HERE IS CONDITIONAL ON `status = 'PENDING'`. Settlement locks
 * the row and moves it to SUCCESSFUL; an abandon that lands after that finds
 * nothing to move, and one that lands before it does not stop it, because
 * `settle_booking_charge` settles any attempt that is not SUCCESSFUL or
 * REFUNDED. Double settlement stays impossible for the reasons it already was:
 * the row lock, the booking lock and `transactions_one_success_per_booking`.
 */

const REUSE_COLUMNS =
  "id, provider_ref, status, created_at, checkout_opened_at, processor_status, processor_checked_at, " +
  "access_code, authorization_url, amount_minor, agreement_id, payee_subaccount_code, " +
  "reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, paystack_mode, share_payer_id";

/** Paystack's "no such transaction", told apart from every other refusal. */
export function isReferenceNotFound(error: unknown): boolean {
  if (!(error instanceof PaystackError) || error instanceof PaystackUnknownOutcome) return false;
  if (error.status !== 400 && error.status !== 404) return false;
  return /not found/i.test(error.message);
}

/**
 * Ask Paystack about one reference. Never throws: an answer we cannot act on
 * (a network failure, a timeout, a 5xx, a refused key) is "unknown", which
 * leaves the attempt exactly as it was.
 */
export async function askPaystack(
  reference: string,
): Promise<{ answer: VerifyAnswer; tx: VerifiedTransaction | null }> {
  try {
    const tx = await verifyRecord(paystackSeam(), reference);
    return { answer: { kind: "status", status: String(tx.status ?? "") }, tx };
  } catch (error) {
    if (isReferenceNotFound(error)) return { answer: { kind: "not-found" }, tx: null };
    return { answer: { kind: "unknown" }, tx: null };
  }
}

/** The live attempt a retry may reuse for this booking and charge, or null. */
export async function findReusableAttempt(
  admin: AdminClient,
  bookingId: string,
  expected: ExpectedCharge,
  now: number = Date.now(),
): Promise<ReusableRow | null> {
  const { data, error } = await admin
    .from("transactions")
    .select(REUSE_COLUMNS)
    .eq("booking_id", bookingId)
    .eq("status", "PENDING")
    .not("access_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data) return null;
  return pickReusableAttempt(data as unknown as ReusableRow[], expected, now);
}

/**
 * Hand the attempt to the payer again: move `checkout_opened_at`, only while
 * it is still PENDING. False when something closed or settled it in between,
 * and the caller then opens a new one.
 */
export async function claimForReuse(admin: AdminClient, id: string): Promise<boolean> {
  const { data, error } = await admin
    .from("transactions")
    .update({ checkout_opened_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "PENDING")
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

/** Keep Paystack's handle on the attempt, so a retry can resume it. */
export async function recordCheckoutHandle(
  admin: AdminClient,
  reference: string,
  handle: { accessCode: string; authorizationUrl: string },
): Promise<void> {
  const accessCode = handle.accessCode.trim();
  const url = handle.authorizationUrl.trim();
  await admin
    .from("transactions")
    .update({
      access_code: accessCode.length > 0 && accessCode.length <= 200 && !/\s/.test(accessCode) ? accessCode : null,
      authorization_url: url.startsWith("https://") && url.length <= 500 ? url : null,
    })
    .eq("provider_ref", reference)
    .eq("status", "PENDING");
}

/**
 * What the caller read about the attempt before asking Paystack: the moment it
 * was last handed to the payer. Passing it makes the write conditional on
 * nobody having reopened the attempt in between (a retry that reuses it moves
 * `checkout_opened_at`), so a close decided on a stale read cannot close a
 * checkout the payer was just handed again.
 */
export type OpenedSnapshot = { checkoutOpenedAt: string | null };

/**
 * Write a verdict that closes or annotates an attempt. `settle` is not handled
 * here: it goes through the settlement path. Returns true when the row moved
 * out of PENDING on this call.
 */
export async function applyVerdict(
  admin: AdminClient,
  reference: string,
  verdict: Exclude<AttemptVerdict, { action: "settle" }>,
  snapshot?: OpenedSnapshot,
): Promise<boolean> {
  const checkedAt = new Date().toISOString();
  const values =
    verdict.action === "keep"
      ? {
          processor_checked_at: checkedAt,
          ...(verdict.processorStatus !== null ? { processor_status: verdict.processorStatus } : {}),
        }
      : verdict.action === "fail"
        ? {
            status: "FAILED" as const,
            closed_reason: "processor_failed",
            processor_status: verdict.processorStatus,
            processor_checked_at: checkedAt,
          }
        : {
            status: "ABANDONED" as const,
            closed_reason: verdict.reason,
            processor_status: verdict.processorStatus,
            processor_checked_at: checkedAt,
          };
  let query = admin.from("transactions").update(values).eq("provider_ref", reference).eq("status", "PENDING");
  if (snapshot) {
    query =
      snapshot.checkoutOpenedAt === null
        ? query.is("checkout_opened_at", null)
        : query.eq("checkout_opened_at", snapshot.checkoutOpenedAt);
  }
  const { data, error } = await query.select("id");
  if (error) throw new Error(error.message);
  return verdict.action !== "keep" && (data?.length ?? 0) > 0;
}

export type ConfirmedSettlement =
  | ChargeSettlement
  /** Paystack took it in another currency: left for a person, never settled here. */
  | { outcome: "not-ngn" }
  /** The attempt was opened on the other Paystack mode: never settled on this key's word. */
  | { outcome: "mode-mismatch" };

/**
 * Settle a charge Paystack has confirmed, with no person present: the sweep's
 * path, and the retry's when the live attempt turns out paid. The same
 * settlement the webhook and the return path call, so whichever arrives first
 * does the work and the rest find it done. A charge that cannot be applied goes
 * back to the card, exactly as the webhook does it.
 *
 * TWO REFUSALS BEFORE ANY MONEY IS RECORDED.
 *  - The attempt's own `paystack_mode` must be this deployment's mode. A test
 *    key's "success" never settles a live attempt, nor the reverse.
 *  - The charge must be in naira. Anything else is marked `not_ngn` on the
 *    attempt (which the sweep then stops asking about) and raises ONE alert,
 *    the first time, for a person to trace and refund.
 */
export async function settleConfirmedCharge(
  admin: AdminClient,
  reference: string,
  tx: VerifiedTransaction,
  actor: MoneyActor,
  fallbackBookingId: string | null,
): Promise<ConfirmedSettlement> {
  const { data: row } = await admin
    .from("transactions")
    .select("paystack_mode, processor_status")
    .eq("provider_ref", reference)
    .maybeSingle();
  if (row && (row.paystack_mode ?? "live") !== currentPaystackMode()) return { outcome: "mode-mismatch" };

  if (tx.currency !== "NGN") {
    if (row && row.processor_status !== "not_ngn") {
      /* Recorded once: the sweep skips a not_ngn attempt from now on, and
         this branch alerts only when the mark is new. */
      await admin
        .from("transactions")
        .update({ processor_status: "not_ngn", processor_checked_at: new Date().toISOString() })
        .eq("provider_ref", reference)
        .eq("status", "PENDING");
      await recordAlert({
        kind: "payment.attempt.not_ngn",
        severity: "critical",
        detail: { reference, currency: tx.currency, amount_minor: tx.amountMinor },
        subjectId: reference,
      });
    }
    return { outcome: "not-ngn" };
  }

  const settlement = await settleBookingCharge(admin, {
    reference,
    amountMinor: tx.amountMinor,
    processorFeeMinor: tx.feesMinor,
    fallbackBookingId,
  });
  await recordMoneyAudit(admin, {
    actor,
    action: "payment.booking.charge_settled",
    reference,
    amountMinor: tx.amountMinor,
    outcome: settlement.outcome,
    detail: { source: actor.kind },
  });
  if (settlement.outcome === "refund-due") {
    await refundChargeToCard(admin, {
      reference: settlement.reference || reference,
      reason: settlement.reason,
      actor,
    });
  }
  if (settlement.outcome === "settled") {
    /* As the webhook does: only a settlement that happened on this call is
       announced, so a stay already confirmed by the webhook is not told twice. */
    await announceConfirmedStay(admin, {
      bookingId: settlement.bookingId,
      totalMinor: settlement.totalMinor,
    });
  }
  return settlement;
}

/**
 * Is a payment for this booking genuinely in flight right now? The saved-card
 * path asks before charging, so a card is never charged beside an open hosted
 * checkout for the same booking (the payer could complete both).
 */
export async function bookingHasPaymentInFlight(
  admin: AdminClient,
  bookingId: string,
  now: number = Date.now(),
): Promise<boolean> {
  const { data, error } = await admin
    .from("transactions")
    .select("status, created_at, checkout_opened_at, processor_status, processor_checked_at")
    .eq("booking_id", bookingId)
    .eq("status", "PENDING")
    .limit(20);
  if (error) return true;
  return (data ?? []).some((row) => isAttemptInFlight(row as AttemptClock, now));
}

/* ------------------------------------------------------------------ reuse */

export type ReusedCheckout = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  amountMinor: number;
};

export type ReuseOutcome =
  | { kind: "checkout"; checkout: ReusedCheckout }
  /** The live attempt had in fact been paid; it is settled now and nothing new opens. */
  | { kind: "paid"; message: string }
  /** Nothing to reuse: open a new attempt. */
  | { kind: "none" };

const PAID_ALREADY =
  "Your earlier payment for this booking went through, so there is nothing to pay again.";
const PAID_NOT_APPLIED =
  "Your earlier payment went through but could not be applied to this booking, so the whole amount is being returned to the card or account you paid with. Vallo has kept nothing.";

/**
 * Find the payer's live attempt for this exact charge and, if Paystack agrees
 * it is still open, hand its checkout back instead of opening another.
 *
 * Idempotent per (payer, charge): only the booking's guest reaches this
 * (`guardPayable`), so the booking is the payer, and the quote is the charge.
 * Two taps at once are already serialised by the booking-scoped idempotency
 * claim around the caller; this makes the sequential case, a retry after a
 * closed window or a reloaded page, reuse rather than duplicate.
 */
export async function reuseLiveAttempt(
  admin: AdminClient,
  bookingId: string,
  quote: {
    amountMinor: number;
    agreementId: string;
    commissionMinor: number;
    mode: "live" | "test";
    /** A flatmate share's payer; omit or null for a whole-booking charge. */
    sharePayerId?: string | null;
    split: { listerSubaccount: string; listerShareMinor: number; reserveSubaccount: string; guaranteeMinor: number };
  },
  actor: MoneyActor = { kind: "sweep" },
): Promise<ReuseOutcome> {
  const live = await findReusableAttempt(admin, bookingId, {
    agreementId: quote.agreementId,
    amountMinor: quote.amountMinor,
    payeeSubaccount: quote.split.listerSubaccount,
    reserveSubaccount: quote.split.reserveSubaccount,
    listerShareMinor: quote.split.listerShareMinor,
    guaranteeMinor: quote.split.guaranteeMinor,
    commissionMinor: quote.commissionMinor,
    mode: quote.mode,
    sharePayerId: quote.sharePayerId ?? null,
  });
  if (!live || !live.provider_ref || !live.access_code) return { kind: "none" };
  const reference = live.provider_ref;

  const { answer, tx } = await askPaystack(reference);
  const decision = decideReuse(answer);

  if (decision.action === "settle") {
    if (!tx) return { kind: "none" };
    try {
      const settled = await settleConfirmedCharge(admin, reference, tx, actor, bookingId);
      if (settled.outcome === "refund-due") return { kind: "paid", message: PAID_NOT_APPLIED };
      if (settled.outcome === "not-ngn") {
        return {
          kind: "paid",
          message:
            "Your earlier payment was not in naira, so it was not applied to this booking. Do not pay again: our team has been told and will trace it with you.",
        };
      }
    } catch {
      // Not recorded yet; the webhook and the sweep settle it. Open nothing new.
    }
    return { kind: "paid", message: PAID_ALREADY };
  }

  if (decision.action === "replace") {
    try {
      await applyVerdict(admin, reference, decision.verdict, { checkoutOpenedAt: live.checkout_opened_at });
    } catch {
      // The sweep closes it later; a new attempt opens either way.
    }
    return { kind: "none" };
  }

  if (!(await claimForReuse(admin, live.id))) return { kind: "none" };
  if (decision.processorStatus !== null) {
    await applyVerdict(admin, reference, { action: "keep", processorStatus: decision.processorStatus });
  }
  return {
    kind: "checkout",
    checkout: {
      accessCode: live.access_code,
      authorizationUrl: live.authorization_url ?? `https://checkout.paystack.com/${live.access_code}`,
      reference,
      amountMinor: Number(live.amount_minor),
    },
  };
}
