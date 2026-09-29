import { NextResponse } from "next/server";
import {
  isPaystackConfigured,
  metadataObject,
  verifyWebhookSignature,
} from "@/lib/payments/paystack";
import {
  failureReason,
  logMoney,
  type MoneyOutcome,
} from "@/lib/payments/observability";
import { getAdminClient, type AdminClient } from "@/lib/supabase/service";
import { recordMoneyAudit, recordWebhookDelivery } from "@/lib/money/audit";
import { announceConfirmedStay } from "@/lib/bookings/arrival";
import { markChargeFailed, settleBookingCharge } from "@/lib/bookings/settlement";
import { savePaymentMethodFromCharge } from "@/lib/payments/methods";
import { recordAlert } from "@/lib/alerts";
import { ROUTE_FAILURE_LIMITS, countRouteFailure } from "@/lib/security/money-limits";
import { BOOKING_PREFIX, FUND_PREFIX, isBookingReference } from "@/lib/payments/references";
import { refundChargeToCard } from "@/lib/payments/refund";
import { handleRefundEvent, readRefundEvent } from "@/lib/payments/refund-events";
import { REFUND_ALREADY_CLAIMED } from "@/lib/payments/refund-outcomes";

/**
 * Paystack webhook.
 *
 * The processor's word on what actually happened to money, and the single most
 * important file in this application.
 *
 * WHAT THIS FILE USED TO DO, AND WHY IT COST SOMEBODY THEIR MONEY. Every
 * failure branch answered HTTP 200. A missing service role key, an unverifiable
 * signature, an unparseable body and a caught write error all replied
 * `{ received: false }` with a 200 beside it. To Paystack, 200 means "we have
 * it, never send it again". So the owner funded their wallet, getAdminClient()
 * returned null because SUPABASE_SERVICE_ROLE_KEY was missing from the
 * production runtime, this route said 200, Paystack's delivery log went green,
 * the retry that would have fixed it once the key was set never came, and the
 * credit was lost permanently with no line anywhere to say so. The live
 * database held zero wallets and zero wallet_entries. The notifications table
 * had never received a wallet trigger row, which independently proves the
 * credit was never written rather than written and lost.
 *
 * SO THE STATUS CODES NOW MEAN THINGS:
 *  - 200 we made a decision and we stand by it. Do not send this again.
 *  - 400 the body is not something we can read. Retrying will not change that,
 *        but the delivery is now visibly failed rather than silently swallowed.
 *  - 401 the signature did not verify. This did not come from Paystack, or our
 *        key is wrong. Either way it is not acknowledged.
 *  - 503 our environment is incomplete, which is OUR fault and is temporary.
 *        PLEASE RETRY. This is the branch that lost the money.
 *  - 500 something threw while writing. Money is in an unknown state.
 *        PLEASE RETRY. Answering 200 here tells the processor never to try
 *        again, which is exactly how a credit is lost forever.
 *
 * AND EVERY BRANCH SAYS SOMETHING. One `[money]` line through logMoney with a
 * reason that tells the branches apart, and one row in audit_log recording what
 * Paystack sent and what we did with it. Nothing sensitive in either: no raw
 * body, no signature, no email address, no card detail. A reference and a kobo
 * amount, which is what a reconciliation conversation actually joins on.
 *
 * NOTHING IS PERSISTED BEFORE THE SIGNATURE VERIFIES. An unauthenticated caller
 * must not be able to write rows into audit_log by posting nonsense at this
 * URL.
 *
 * VALLO NEVER HOLDS CUSTOMER MONEY (Track A, 25 September 2026). There is no
 * wallet to fund and nothing to withdraw, so the only money event this route
 * acts on is a charge against a booking:
 *  - rm-book-<uuid>: a card payment against a booking, opened with its split
 *    and settled through lib/bookings/settlement.ts, the same function the
 *    return path calls. A charge that cannot be applied is refunded to the
 *    card, in full, from here.
 *  - rm-fund-<uuid>: a wallet top-up from before the wallet was retired. If
 *    one ever arrives, it is refunded to the card in full; it is never
 *    credited anywhere.
 *  - transfer.* events are acknowledged and ignored: Vallo sends no transfers.
 *
 * Completion notifications fire from the database trigger, never from here.
 */

export const runtime = "nodejs";

type WebhookEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    /** Kobo the processor kept, when it reports one. */
    fees?: number | null;
    currency?: string;
    channel?: string | null;
    paid_at?: string | null;
    customer?: { email?: string | null } | null;
    metadata?: unknown;
    /** The reusable-card token, when the charge produced one. Read defensively. */
    authorization?: unknown;
  };
};

/**
 * What this delivery came to. One of these leaves the route, is logged once,
 * and is persisted once.
 */
type Verdict = {
  outcome: MoneyOutcome;
  /** Short, stable, machine readable. Distinguishes every branch. */
  reason: string;
  httpStatus: number;
  amountMinor?: number | null;
  userId?: string | null;
  walletId?: string | null;
};

function verdict(
  outcome: MoneyOutcome,
  reason: string,
  httpStatus: number,
  extra?: Omit<Verdict, "outcome" | "reason" | "httpStatus">,
): Verdict {
  return { outcome, reason, httpStatus, ...(extra ?? {}) };
}

/* ----------------------------------------------------------- saved cards */

/**
 * File the card a charge was paid with, when the charge asked for it.
 *
 * Runs on every charge.success this platform owns, after the payer is known.
 * The rule is in lib/payments/methods.ts: metadata.save_card must be true
 * (the boolean, or the string the stringified-metadata quirk makes of it)
 * AND Paystack must say the authorization is reusable, and the row is
 * written by the service role from the processor's own payload. Nothing a
 * client sends can reach this insert.
 *
 * Best effort, and audited when it did anything. A card that could not be
 * filed is a missing convenience; the money has already been accounted for
 * by the time this runs and a 500 here would only make Paystack replay a
 * credit the ledger has already refused as a duplicate.
 */
async function fileCardIfAsked(
  admin: AdminClient,
  data: NonNullable<WebhookEvent["data"]>,
  userId: string,
  reference: string,
): Promise<void> {
  const outcome = await savePaymentMethodFromCharge(admin, {
    userId,
    email: data.customer?.email ?? null,
    metadata: data.metadata,
    authorization: data.authorization,
  });
  if (outcome === "skipped") return;
  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: `payment_method.${outcome}`,
    reference,
    subjectUserId: userId,
    outcome,
    detail: { source: "webhook" },
  });
}

/* --------------------------------------------------------------- booking */

/**
 * A card payment against a booking succeeded.
 *
 * The whole settlement lives in lib/bookings/settlement.ts and is shared with
 * the return-from-Paystack path, so there is exactly one implementation of
 * "this booking is now paid". Replay safety comes from that module's two keys:
 * the conditional flip of the unique provider_ref row to SUCCESSFUL, and the
 * PENDING guard on the booking transition. A replayed delivery therefore moves
 * nothing, writes no second ledger row and sends no second email.
 */
async function handleBookingChargeSuccess(
  admin: AdminClient,
  data: NonNullable<WebhookEvent["data"]>,
): Promise<Verdict> {
  const reference = data.reference ?? "";
  if (!isBookingReference(reference)) return verdict("ignored", "not_a_booking_reference", 200);
  if (data.currency !== undefined && data.currency !== "NGN") {
    return verdict("rejected", "currency_not_ngn", 200);
  }

  const amountMinor = Number.isSafeInteger(data.amount) ? (data.amount as number) : 0;
  if (amountMinor <= 0) return verdict("rejected", "amount_not_positive_integer", 200);

  const metadata = metadataObject(data.metadata);
  const metaBookingId = metadata["booking_id"];
  const fallbackBookingId = typeof metaBookingId === "string" ? metaBookingId : null;

  // A booking checkout that asked to keep the card names its payer in
  // metadata; without that there is nobody to file the card against.
  const payerId = metadata["user_id"];
  if (typeof payerId === "string" && payerId.length > 0) {
    await fileCardIfAsked(admin, data, payerId, reference);
  }

  const settlement = await settleBookingCharge(admin, {
    reference,
    amountMinor,
    processorFeeMinor: typeof data.fees === "number" ? data.fees : null,
    fallbackBookingId,
  });

  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: "payment.booking.charge_settled",
    reference,
    amountMinor,
    outcome: settlement.outcome,
    detail: { source: "webhook" },
  });

  // Only a payment that actually landed on THIS call is worth announcing, which
  // is what makes a replay silent as well as harmless. The test is the outcome,
  // not settlement.confirmed: a request-to-book stay the host already accepted
  // is CONFIRMED before the money arrives, so gating on the status change would
  // take a guest's card and never send them a receipt.
  /* The money moved but could not be applied to the booking. The database
     marked it and raised the alert; the whole charge goes back to the card
     now. Vallo keeps nothing and credits nothing. Handled, not failed: 200. */
  if (settlement.outcome === "refund-due") {
    const refund = await refundChargeToCard(admin, {
      reference,
      reason: settlement.reason,
      actor: { kind: "webhook" },
    });
    // The payer's return or the sweep is already refunding this charge (or
    // has): this delivery sent nothing, which is the point.
    if (!refund.ok && refund.reason === REFUND_ALREADY_CLAIMED) {
      return verdict("duplicate", `booking_refund_due:${settlement.reason}:refund_already_claimed`, 200, { amountMinor });
    }
    return verdict(
      refund.ok ? "posted" : "failed",
      `booking_refund_due:${settlement.reason}:${refund.ok ? "refund_submitted" : "refund_failed"}`,
      200,
      { amountMinor },
    );
  }
  if (settlement.outcome === "share-settled") {
    // V-86: a flatmate's share moved money on this call; the booking waits for the rest.
    return verdict("posted", "booking_share_settled", 200, { amountMinor });
  }
  if (settlement.outcome !== "settled") {
    return verdict("duplicate", `booking_${settlement.outcome}`, 200, { amountMinor });
  }

  // There is no session on a webhook, so nothing is hinted: every address is
  // resolved from the database. A stay booked for somebody else also reaches
  // the person arriving, which is decided in one place for all four paths that
  // can confirm a booking.
  await announceConfirmedStay(admin, {
    bookingId: settlement.bookingId,
    totalMinor: settlement.totalMinor,
  });

  return verdict("posted", "booking_settled", 200, { amountMinor });
}

/**
 * A card payment against a booking failed.
 *
 * The attempt is marked FAILED and the booking is deliberately left PENDING:
 * the guest still holds their dates and can try again. Only a PENDING attempt moves, so a late failure delivery cannot
 * unpick a payment that already succeeded.
 */
async function handleBookingChargeFailed(
  admin: AdminClient,
  data: NonNullable<WebhookEvent["data"]>,
): Promise<Verdict> {
  const reference = data.reference ?? "";
  if (!isBookingReference(reference)) return verdict("ignored", "not_a_booking_reference", 200);
  await markChargeFailed(admin, reference);
  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: "payment.booking.charge_failed",
    reference,
    outcome: "failed",
    detail: { source: "webhook" },
  });
  return verdict("rejected", "booking_charge_failed", 200);
}

/* ------------------------------------------------------------- dispatch */

async function dispatch(
  admin: AdminClient,
  event: string,
  data: NonNullable<WebhookEvent["data"]>,
): Promise<Verdict> {
  const reference = data.reference ?? "";

  if (event === "charge.success") {
    // Two charge families share this event, told apart by their reference.
    if (reference.startsWith(BOOKING_PREFIX)) return handleBookingChargeSuccess(admin, data);
    if (reference.startsWith(FUND_PREFIX)) {
      // A retired wallet top-up. Nothing credits it: it goes back to the card.
      const refund = await refundChargeToCard(admin, {
        reference,
        reason: "wallet_retired",
        actor: { kind: "webhook" },
      });
      if (!refund.ok && refund.reason === REFUND_ALREADY_CLAIMED) {
        return verdict("duplicate", "wallet_topup_refund_already_claimed", 200);
      }
      return verdict(refund.ok ? "posted" : "failed", `wallet_topup_refunded:${refund.ok}`, 200);
    }
    return verdict("ignored", "reference_not_ours", 200);
  }

  if (event === "charge.failed") {
    if (reference.startsWith(BOOKING_PREFIX)) return handleBookingChargeFailed(admin, data);
    return verdict("ignored", "reference_not_ours", 200);
  }

  // V-24: the processor's word that a refund reached the card (or did not).
  // Recorded only; Vallo holds no balance to credit (lib/payments/refund-events.ts).
  if (event === "refund.processed" || event === "refund.failed") {
    const refund = readRefundEvent(event, data);
    if (!refund) return verdict("ignored", "refund_event_unreadable", 200);
    const recorded = await handleRefundEvent(admin, refund);
    if (recorded === "error") return verdict("failed", "refund_event_not_recorded", 500);
    return verdict(recorded === "recorded" ? "posted" : "duplicate", `refund_${refund.status}:${recorded}`, 200);
  }

  if (event.startsWith("transfer.")) {
    return verdict("ignored", "transfers_retired", 200);
  }

  return verdict("ignored", `event_unhandled:${event}`, 200);
}

/* ---------------------------------------------------------------- route */

/** The single exit. Logs once, persists once when it can, answers once. */
async function answer(
  admin: AdminClient | null,
  context: { event: string; reference: string | null; currency: string | null },
  v: Verdict,
): Promise<NextResponse> {
  logMoney({
    surface: "webhook",
    outcome: v.outcome,
    reason: v.reason,
    event: context.event.length > 0 ? context.event : null,
    reference: context.reference,
    ...(v.amountMinor === undefined ? {} : { amountMinor: v.amountMinor }),
    ...(v.userId === undefined ? {} : { userId: v.userId }),
    ...(v.walletId === undefined ? {} : { walletId: v.walletId }),
  });

  if (admin) {
    await recordWebhookDelivery(admin, {
      event: context.event,
      reference: context.reference,
      amountMinor: v.amountMinor ?? null,
      currency: context.currency,
      outcome: v.outcome,
      reason: v.reason,
      httpStatus: v.httpStatus,
    });
  }

  /*
   * The desk hears about the two outcomes a log line alone would bury: a
   * settlement that threw with money in an unknown state, and a well-signed
   * delivery about a reference this platform never minted (a misrouted
   * webhook, or somebody else's key pointed at our URL). Both fold into one
   * open alert per reference for ten minutes, so a Paystack retry storm is
   * one row, not five. Never throws, never changes the answer below.
   */
  if (v.outcome === "failed") {
    await recordAlert({
      kind: "webhook.paystack.settlement_failed",
      severity: "critical",
      detail: {
        event: context.event,
        reference: context.reference,
        reason: v.reason,
        http_status: v.httpStatus,
        amount_minor: v.amountMinor ?? null,
      },
      subjectId: context.reference ?? undefined,
    });
  } else if (v.reason === "reference_not_ours") {
    await recordAlert({
      kind: "webhook.paystack.unknown_reference",
      severity: "warning",
      detail: { event: context.event, reference: context.reference, currency: context.currency },
      subjectId: context.reference ?? undefined,
    });
  }

  return NextResponse.json(
    { received: v.httpStatus === 200, reason: v.reason },
    { status: v.httpStatus },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    // Nothing is verified and nothing is persisted: an unreadable body could
    // have come from anywhere.
    logMoney({ surface: "webhook", outcome: "rejected", reason: "body_unreadable" });
    return NextResponse.json({ received: false, reason: "body_unreadable" }, { status: 400 });
  }

  // The signature cannot be checked without the key, so a delivery arriving now
  // has not been authenticated and must not be acknowledged. 503, because this
  // is our environment being incomplete and it is temporary: please retry.
  if (!isPaystackConfigured()) {
    logMoney({ surface: "webhook", outcome: "unconfigured", reason: "paystack_key_missing" });
    /*
     * AND THE DESK HEARS ABOUT IT, which it did not until now.
     *
     * This branch is the loudest state this route can be in: without the key
     * NOTHING that arrives can be authenticated, so every genuine settlement
     * is piling up in Paystack's retry queue with a 503 against it, and the
     * only trace on our side was a log line in Vercel. That is the shape of
     * the incident this whole file is written around, one layer further out.
     * `recordAlert` makes its own client and never throws, so it is safe in
     * exactly the branch where nothing else is configured; when it cannot
     * write either, it says so on the console itself. The alerts writer folds
     * repeats inside ten minutes into one row, so a processor retrying hard
     * leaves one alert, not a hundred.
     */
    await recordAlert({
      kind: "webhook.paystack.unconfigured",
      severity: "critical",
      detail: { reason: "paystack_key_missing", http_status: 503 },
      subjectId: "paystack-webhook",
    });
    return NextResponse.json(
      { received: false, reason: "paystack_key_missing" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    // Deliberately before any database work. An unauthenticated caller must not
    // be able to write rows into audit_log by posting nonsense at this URL.
    //
    // Failures are counted per address, never successes, so a genuine retry
    // from Paystack is never limited while a sprayed URL is answered from the
    // deny cache with no HMAC work, no log line and no alert after the first
    // thirty. The alert itself is one row per ten minutes: the desk needs to
    // know the URL is being probed, not to count the probes.
    const spray = await countRouteFailure(ROUTE_FAILURE_LIMITS.webhookBadSignature, request.headers);
    if (!spray.allowed) {
      return NextResponse.json(
        { received: false, reason: "too_many_failures" },
        { status: 429, headers: { "retry-after": String(spray.retryAfterSeconds) } },
      );
    }
    logMoney({ surface: "webhook", outcome: "rejected", reason: "signature_invalid" });
    await recordAlert({
      kind: "webhook.paystack.signature_invalid",
      severity: "warning",
      detail: { http_status: 401 },
    });
    return NextResponse.json({ received: false, reason: "signature_invalid" }, { status: 401 });
  }

  // From here the delivery is genuinely Paystack's.

  let payload: WebhookEvent;
  try {
    payload = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    logMoney({ surface: "webhook", outcome: "rejected", reason: "body_unparseable" });
    return NextResponse.json({ received: false, reason: "body_unparseable" }, { status: 400 });
  }

  const event = payload.event ?? "";
  const data = payload.data;
  const reference = data?.reference ?? null;
  const currency = data?.currency ?? null;
  const context = { event, reference, currency };

  const admin = getAdminClient();
  if (!admin) {
    // THIS IS THE BRANCH THAT LOST THE OWNER'S MONEY.
    //
    // It used to answer 200, so Paystack recorded a successful delivery for a
    // credit that was never written and never retried it. It now answers 503,
    // which Paystack retries, so the same delivery lands again once the key is
    // set and the credit posts itself. There is nothing to persist here: the
    // service role client is the thing that is missing.
    logMoney({
      surface: "webhook",
      outcome: "unconfigured",
      reason: "service_role_key_missing",
      event,
      reference,
    });
    // Cannot land without the same key. It logs the attempt and returns.
    await recordAlert({
      kind: "webhook.paystack.unconfigured",
      severity: "critical",
      detail: { event, reference, reason: "service_role_key_missing" },
      subjectId: reference ?? undefined,
    });
    return NextResponse.json(
      { received: false, reason: "service_role_key_missing" },
      { status: 503 },
    );
  }

  if (!data) {
    return answer(admin, context, verdict("ignored", "no_data", 200));
  }

  try {
    return await answer(admin, context, await dispatch(admin, event, data));
  } catch (error) {
    // Money is in an unknown state. 500, so Paystack retries and the ledger
    // gets another chance. The old code caught this and answered 200, which
    // told the processor never to try again: exactly how a credit is lost
    // forever. Reconciliation is the backstop, not the plan.
    return answer(
      admin,
      context,
      verdict("failed", `write_failed:${failureReason(error)}`, 500),
    );
  }
}
