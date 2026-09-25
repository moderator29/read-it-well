import { NextResponse } from "next/server";
import {
  isYellowCardConfigured,
  parseWebhook,
  verifyWebhookSignature,
} from "@/lib/payments/yellowcard";
import { failureReason, logMoney } from "@/lib/payments/observability";
import { getAdminClient } from "@/lib/supabase/service";
import { settleBookingCharge } from "@/lib/bookings/settlement";
import { recordMoneyAudit, recordWebhookDelivery } from "@/lib/money/audit";
import { isCryptoReference } from "@/lib/payments/references";
import { recordAlert } from "@/lib/alerts";
import { ROUTE_FAILURE_LIMITS, countRouteFailure } from "@/lib/security/money-limits";

/**
 * Yellow Card webhook: the crypto on-ramp's word on what happened to money.
 *
 * ===========================================================================
 * THE STATUS CODES MEAN THINGS, AND THAT LESSON WAS PAID FOR.
 * ===========================================================================
 *
 * The Paystack webhook beside this one used to answer 200 to every failure -
 * a missing service role key, an unverifiable signature, an unreadable body,
 * a caught write error. To a processor, 200 means "we have it, never send it
 * again". So a real deposit was opened, paid, silently not credited, and the
 * retry that would have fixed it never came, because our own endpoint had told
 * the processor everything was fine.
 *
 * This route is written with that already known:
 *
 *   200  we made a decision and we stand by it. Do not send this again.
 *   400  the body is not something we can read. Retrying will not help, but
 *        the delivery is now visibly failed rather than silently swallowed.
 *   401  the signature did not verify. This did not come from Yellow Card.
 *   500  we could not record it. SEND IT AGAIN. This is the one that matters:
 *        an unwritten credit must stay in the processor's retry queue.
 *
 * ===========================================================================
 * WHAT IT WILL AND WILL NOT ACT ON.
 * ===========================================================================
 *
 * Only references this platform generated, and only completed ones. A
 * `sequenceId` we did not mint is not ours to credit no matter how well signed
 * the envelope is, and `isCryptoReference` is the shape test that decides.
 * Pending and failed events are acknowledged and do nothing: a crypto payment
 * that has not settled has not settled.
 *
 * TRACK A: there is no wallet to credit. A completed collection settles ONE
 * booking through `settleBookingCharge`, the same database function a card
 * charge uses, in naira only, idempotent on the reference: a webhook
 * delivered five times settles once. Yellow Card has already settled the
 * naira straight to the lister, the Guarantee reserve and Vallo; this only
 * records that it happened. A collection that cannot be applied cannot be
 * refunded to a card, so it raises a critical alert for a person to return
 * it through Yellow Card.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();
  const signature =
    request.headers.get("x-yc-signature") ?? request.headers.get("authorization") ?? "";

  if (!isYellowCardConfigured()) {
    /* 500, not 200. Unconfigured is a state we can come out of, and a credit
       arriving while we are in it must stay in the retry queue rather than
       being acknowledged into oblivion. */
    logMoney({ surface: "webhook", outcome: "unconfigured", reason: "yellowcard_not_configured" });
    /*
     * AND THE DESK HEARS ABOUT IT, which it did not until now.
     *
     * Without the key nothing arriving here can be authenticated, so every
     * genuine crypto credit is sitting in Yellow Card's retry queue with a 500
     * against it and the only trace on our side was a log line nobody reads at
     * 3am. `recordAlert` makes its own client and never throws, which is what
     * makes it safe in the one branch where the environment is incomplete, and
     * it folds repeats inside ten minutes into one row so a retrying processor
     * leaves one alert rather than a hundred.
     */
    await recordAlert({
      kind: "webhook.yellowcard.unconfigured",
      severity: "critical",
      detail: { reason: "yellowcard_not_configured", http_status: 500 },
      subjectId: "yellowcard-webhook",
    });
    return NextResponse.json({ received: false, reason: "unconfigured" }, { status: 500 });
  }

  if (!verifyWebhookSignature(raw, signature)) {
    /* Failures per address, exactly as the Paystack route counts them: a
       genuine retry is never limited, a sprayed URL is answered from cache. */
    const spray = await countRouteFailure(ROUTE_FAILURE_LIMITS.webhookBadSignature, request.headers);
    if (!spray.allowed) {
      return NextResponse.json(
        { received: false, reason: "too_many_failures" },
        { status: 429, headers: { "retry-after": String(spray.retryAfterSeconds) } },
      );
    }
    logMoney({ surface: "webhook", outcome: "rejected", reason: "yellowcard_bad_signature" });
    await recordAlert({
      kind: "webhook.yellowcard.signature_invalid",
      severity: "warning",
      detail: { http_status: 401 },
    });
    return NextResponse.json({ received: false, reason: "unauthorised" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ received: false, reason: "malformed" }, { status: 400 });
  }

  const event = parseWebhook(body);
  if (!event) {
    /* 200: a shape we do not recognise is not a failure on our side and
       retrying it forever helps nobody. It is logged so an unexpected event
       type shows up as a pattern rather than as silence. */
    logMoney({ surface: "webhook", outcome: "rejected", reason: "yellowcard_unreadable_event" });
    return NextResponse.json({ received: true, acted: false }, { status: 200 });
  }

  if (!isCryptoReference(event.reference)) {
    logMoney({
      surface: "webhook",
      outcome: "rejected",
      reason: "yellowcard_foreign_reference",
      reference: event.reference,
    });
    await recordAlert({
      kind: "webhook.yellowcard.unknown_reference",
      severity: "warning",
      detail: { reference: event.reference, status: event.status },
      subjectId: event.reference,
    });
    return NextResponse.json({ received: true, acted: false }, { status: 200 });
  }

  if (event.status !== "completed") {
    /* Acknowledged and NOT credited. A pending crypto payment is money still
       in motion, and a balance that counts it is a balance somebody can spend
       before it exists. */
    logMoney({
      surface: "webhook",
      outcome: "received",
      reason: `yellowcard_${event.status}`,
      reference: event.reference,
      amountMinor: event.amountMinor,
    });
    return NextResponse.json({ received: true, acted: false }, { status: 200 });
  }

  const admin = getAdminClient();
  if (!admin) {
    /* THE EXACT FAILURE THAT COST A REAL PAYMENT, answered correctly this
       time. Without this key nothing can be written, so the only honest reply
       is one that keeps the delivery in the retry queue until the key is set. */
    logMoney({
      surface: "webhook",
      outcome: "unconfigured",
      reason: "service_role_key_missing",
      reference: event.reference,
    });
    /* A signed, completed credit we cannot write down. The delivery stays in
       the retry queue and a person is told, because the retry queue is the
       processor's dashboard and not ours. */
    await recordAlert({
      kind: "webhook.yellowcard.unconfigured",
      severity: "critical",
      detail: {
        reason: "service_role_key_missing",
        reference: event.reference,
        amount_minor: event.amountMinor,
        http_status: 500,
      },
      subjectId: event.reference,
    });
    return NextResponse.json({ received: false, reason: "unconfigured" }, { status: 500 });
  }

  try {
    const settlement = await settleBookingCharge(admin, {
      reference: event.reference,
      amountMinor: event.amountMinor,
      processorFeeMinor: 0,
    });

    await recordMoneyAudit(admin, {
      actor: { kind: "webhook" },
      action: "payment.booking.charge_settled",
      reference: event.reference,
      amountMinor: event.amountMinor,
      outcome: settlement.outcome,
      detail: { provider: "yellowcard", currency: "NGN" },
    });

    if (settlement.outcome === "refund-due" || settlement.outcome === "unknown-reference") {
      await recordAlert({
        kind: "webhook.yellowcard.return_needed",
        severity: "critical",
        detail: {
          reference: event.reference,
          amount_minor: event.amountMinor,
          reason: settlement.outcome === "refund-due" ? settlement.reason : "unknown_reference",
        },
        subjectId: event.reference,
      });
    }

    await recordWebhookDelivery(admin, {
      event: "collection.completed",
      reference: event.reference,
      amountMinor: event.amountMinor,
      currency: "NGN",
      outcome: settlement.outcome === "settled" ? "posted" : settlement.outcome === "already-settled" ? "duplicate" : "rejected",
      reason: settlement.outcome,
      httpStatus: 200,
    });

    logMoney({
      surface: "webhook",
      outcome: settlement.outcome === "settled" ? "posted" : settlement.outcome === "already-settled" ? "duplicate" : "rejected",
      reason: `yellowcard_${settlement.outcome}`,
      reference: event.reference,
      amountMinor: event.amountMinor,
    });

    return NextResponse.json({ received: true, acted: settlement.outcome === "settled" }, { status: 200 });
  } catch (error) {
    logMoney({
      surface: "webhook",
      outcome: "failed",
      reason: `yellowcard_write_failed:${failureReason(error)}`,
      reference: event.reference,
      amountMinor: event.amountMinor,
    });
    await recordAlert({
      kind: "webhook.yellowcard.settlement_failed",
      severity: "critical",
      detail: {
        reference: event.reference,
        reason: `write_failed:${failureReason(error)}`,
        amount_minor: event.amountMinor,
      },
      subjectId: event.reference,
    });
    /* EVERY DELIVERY LEAVES A ROW, including this one. The two branches above
       write `recordWebhookDelivery` and this one did not, so the delivery that
       went WRONG was the single delivery with no line in the run history: an
       operator counting deliveries against Yellow Card's dashboard would have
       found ours short by exactly the failures. Best effort, like every audit
       write on a money path, and the alert above stands whether it lands. */
    await recordWebhookDelivery(admin, {
      event: "collection.completed",
      reference: event.reference,
      amountMinor: event.amountMinor,
      currency: "NGN",
      outcome: "failed",
      reason: `write_failed:${failureReason(error)}`,
      httpStatus: 500,
    });
    /* 500 so it is sent again. The credit is not written, and an acknowledged
       failure here is a lost deposit. */
    return NextResponse.json({ received: false, reason: "write_failed" }, { status: 500 });
  }
}
