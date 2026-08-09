import { NextResponse } from "next/server";
import {
  isPaystackConfigured,
  metadataObject,
  verifyTransaction,
  verifyWebhookSignature,
} from "@/lib/payments/paystack";
import {
  failureReason,
  logMoney,
  type MoneyOutcome,
} from "@/lib/payments/observability";
import {
  availableBalanceMinor,
  ensureWalletId,
  findUserByEmail,
  getAdminClient,
  recordFunding,
  settleWithdrawal,
  walletOwnerId,
  type AdminClient,
} from "@/lib/wallet/ledger";
import { recordMoneyAudit, recordWebhookDelivery } from "@/lib/wallet/audit";
import { bestEffortEmail, sendMessage } from "@/lib/email/client";
import { walletFunded, withdrawalFailed } from "@/lib/email/messages";
import { contactForUser } from "@/lib/email/recipients";
import { announceConfirmedStay } from "@/lib/bookings/arrival";
import { markChargeFailed, settleBookingCharge } from "@/lib/bookings/settlement";
import {
  BOOKING_PREFIX,
  FUND_PREFIX,
  WITHDRAW_PREFIX,
  isBookingReference,
} from "@/lib/payments/references";
import type { Json } from "@/lib/supabase/database.types";

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
 * Routing is by reference format, the contract this platform generates, all of
 * it documented in lib/payments/references.ts:
 *  - rm-fund-<uuid>: wallet funding. charge.success credits the ledger with a
 *    COMPLETED deposit, idempotent on the unique reference, so a replayed
 *    webhook or the verify-on-redirect fallback can never double-post.
 *  - rm-wd-<uuid>: withdrawal. transfer.success / transfer.failed /
 *    transfer.reversed settle the matching PENDING debit hold.
 *  - rm-book-<uuid>: a card payment against a booking, settled through
 *    lib/bookings/settlement.ts, the same function the return path calls.
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

/* --------------------------------------------------------------- funding */

/**
 * Whose funding this is.
 *
 * Metadata first, because fundWallet writes `user_id` into it at checkout.
 * Then the customer's email, because metadata is the part of a Paystack
 * transaction that cannot be relied on: it can arrive as a JSON STRING rather
 * than an object, it can arrive empty, and it arrives shaped by whichever
 * integration created the charge. metadataObject() handles the stringified
 * case, which this route did not: a stringified metadata used to yield no
 * user_id and the funding was dropped with no trace at all.
 *
 * Last, the authoritative verify call, because the webhook payload and the
 * verify response do not always carry the same metadata for the same charge,
 * and a payment we cannot place is worth one extra API call to try to place.
 * verifyFunding has always had the email fallback; this route did not.
 *
 * The email is used for the lookup and never logged, never persisted and never
 * returned.
 */
async function ownerOfFunding(
  data: NonNullable<WebhookEvent["data"]>,
  reference: string,
): Promise<{ userId: string | null; how: string }> {
  const metadata = metadataObject(data.metadata);
  const fromMetadata = metadata["user_id"];
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
    return { userId: fromMetadata, how: "metadata_user_id" };
  }

  const email = data.customer?.email ?? null;
  if (email && email.length > 0) {
    const user = await findUserByEmail(email);
    if (user) return { userId: user.id, how: "webhook_customer_email" };
  }

  try {
    const charge = await verifyTransaction(reference);
    const verified = charge.metadata["user_id"];
    if (typeof verified === "string" && verified.length > 0) {
      return { userId: verified, how: "verify_metadata_user_id" };
    }
    if (charge.customerEmail && charge.customerEmail.length > 0) {
      const user = await findUserByEmail(charge.customerEmail);
      if (user) return { userId: user.id, how: "verify_customer_email" };
    }
  } catch {
    return { userId: null, how: "verify_failed" };
  }

  return { userId: null, how: "no_identifier" };
}

async function handleFundingChargeSuccess(
  admin: AdminClient,
  data: NonNullable<WebhookEvent["data"]>,
): Promise<Verdict> {
  const reference = data.reference ?? "";

  if (data.currency !== undefined && data.currency !== "NGN") {
    return verdict("rejected", "currency_not_ngn", 200);
  }

  const amountMinor = data.amount;
  if (!Number.isSafeInteger(amountMinor) || amountMinor === undefined || amountMinor <= 0) {
    return verdict("rejected", "amount_not_positive_integer", 200);
  }

  const owner = await ownerOfFunding(data, reference);
  if (!owner.userId) {
    // Real money with no home. Answered 200 because retrying produces the same
    // answer every time, but recorded as a failure everywhere a human looks:
    // an error line on the money channel, an unmatched row in audit_log, and a
    // gap the reconciliation sweep reports on its next run.
    await recordMoneyAudit(admin, {
      actor: { kind: "webhook" },
      action: "wallet.funding.unmatched",
      reference,
      amountMinor,
      outcome: "unmatched",
      detail: { resolution: owner.how },
    });
    return verdict("failed", `owner_unresolved:${owner.how}`, 200, { amountMinor });
  }

  const posted = await recordFunding(admin, {
    userId: owner.userId,
    amountMinor,
    reference,
    metadata: {
      channel: (data.channel ?? null) as Json,
      paid_at: (data.paid_at ?? null) as Json,
      purpose: "wallet_fund",
    },
  });

  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: posted === "posted" ? "wallet.funding.posted" : "wallet.funding.duplicate",
    reference,
    amountMinor,
    subjectUserId: owner.userId,
    outcome: posted,
    detail: { resolution: owner.how, channel: data.channel ?? null },
  });

  // This is the settlement path that actually runs in production: most fundings
  // arrive here, not through the redirect. The receipt is gated on "posted" so
  // a replayed delivery credits nothing and emails nothing.
  if (posted !== "posted") {
    return verdict("duplicate", `already_in_ledger:${owner.how}`, 200, {
      amountMinor,
      userId: owner.userId,
    });
  }

  const userId = owner.userId;
  await bestEffortEmail(async () => {
    const contact = await contactForUser(admin, userId, "wallet");
    if (!contact) return;
    const walletId = await ensureWalletId(admin, userId);
    const balanceMinor = await availableBalanceMinor(admin, walletId);
    const message = walletFunded({ ownerName: contact.name, amountMinor, balanceMinor });
    await sendMessage(contact.email, message);
  });

  return verdict("posted", `credited:${owner.how}`, 200, { amountMinor, userId });
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

  const settlement = await settleBookingCharge(admin, {
    reference,
    amountMinor,
    processorFeeMinor: typeof data.fees === "number" ? data.fees : null,
    fallbackBookingId,
  });

  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: "wallet.booking.charge_settled",
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
  if (settlement.outcome !== "settled") {
    return verdict("duplicate", `booking_${settlement.outcome}`, 200, { amountMinor });
  }

  // There is no session on a webhook, so nothing is hinted: every address is
  // resolved from the database. A stay booked for somebody else also reaches
  // the person arriving, which is decided in one place for all four paths that
  // can confirm a booking.
  await announceConfirmedStay(admin, {
    bookingId: settlement.bookingId,
    totalMinor: settlement.ledger.grossMinor,
  });

  return verdict("posted", "booking_settled", 200, { amountMinor });
}

/**
 * A card payment against a booking failed.
 *
 * The attempt is marked FAILED and the booking is deliberately left PENDING:
 * the guest still holds their dates and can try again, by card or from their
 * wallet. Only a PENDING attempt moves, so a late failure delivery cannot
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
    action: "wallet.booking.charge_failed",
    reference,
    outcome: "failed",
    detail: { source: "webhook" },
  });
  return verdict("rejected", "booking_charge_failed", 200);
}

/* -------------------------------------------------------------- transfers */

async function handleTransferEvent(
  admin: AdminClient,
  event: string,
  data: NonNullable<WebhookEvent["data"]>,
): Promise<Verdict> {
  const reference = data.reference ?? "";

  if (event === "transfer.success") {
    const settled = await settleWithdrawal(admin, reference, "COMPLETED");
    if (!settled) return verdict("duplicate", "withdrawal_not_pending", 200);
    const ownerId = await walletOwnerId(admin, settled.walletId);
    await recordMoneyAudit(admin, {
      actor: { kind: "webhook" },
      action: "wallet.withdrawal.completed",
      reference,
      amountMinor: settled.amountMinor,
      walletId: settled.walletId,
      subjectUserId: ownerId,
      outcome: "COMPLETED",
    });
    return verdict("posted", "withdrawal_completed", 200, {
      amountMinor: settled.amountMinor,
      walletId: settled.walletId,
      userId: ownerId,
    });
  }

  const outcome =
    event === "transfer.failed" ? "FAILED" : event === "transfer.reversed" ? "REVERSED" : null;
  if (!outcome) return verdict("ignored", `transfer_event_unhandled:${event}`, 200);

  const settled = await settleWithdrawal(admin, reference, outcome);
  // Null means nothing moved, which is what a replayed delivery looks like:
  // stay silent rather than tell someone twice that their money came back.
  if (!settled) return verdict("duplicate", "withdrawal_not_pending", 200);

  const ownerId = await walletOwnerId(admin, settled.walletId);
  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: "wallet.withdrawal.returned",
    reference,
    amountMinor: settled.amountMinor,
    walletId: settled.walletId,
    subjectUserId: ownerId,
    outcome,
  });

  await bestEffortEmail(async () => {
    if (!ownerId) return;
    const contact = await contactForUser(admin, ownerId, "wallet");
    if (!contact) return;

    // The withdrawal's own metadata carries where it was headed, written when
    // the hold was placed. Absent or malformed, the email simply omits it.
    const meta = metadataObject(settled.metadata);
    const bankName = typeof meta["bank_name"] === "string" ? meta["bank_name"] : null;
    const accountLast4 = typeof meta["account_last4"] === "string" ? meta["account_last4"] : null;

    const message = withdrawalFailed({
      ownerName: contact.name,
      amountMinor: settled.amountMinor,
      bankName,
      accountLast4,
    });
    await sendMessage(contact.email, message);
  });

  return verdict("posted", `withdrawal_${outcome.toLowerCase()}`, 200, {
    amountMinor: settled.amountMinor,
    walletId: settled.walletId,
    userId: ownerId,
  });
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
    if (reference.startsWith(FUND_PREFIX)) return handleFundingChargeSuccess(admin, data);
    return verdict("ignored", "reference_not_ours", 200);
  }

  if (event === "charge.failed") {
    if (reference.startsWith(BOOKING_PREFIX)) return handleBookingChargeFailed(admin, data);
    return verdict("ignored", "reference_not_ours", 200);
  }

  if (event.startsWith("transfer.")) {
    if (!reference.startsWith(WITHDRAW_PREFIX)) {
      return verdict("ignored", "reference_not_ours", 200);
    }
    return handleTransferEvent(admin, event, data);
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
    return NextResponse.json(
      { received: false, reason: "paystack_key_missing" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    // Deliberately before any database work. An unauthenticated caller must not
    // be able to write rows into audit_log by posting nonsense at this URL.
    logMoney({ surface: "webhook", outcome: "rejected", reason: "signature_invalid" });
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
