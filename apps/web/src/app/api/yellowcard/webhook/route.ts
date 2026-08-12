import { NextResponse } from "next/server";
import {
  isYellowCardConfigured,
  parseWebhook,
  verifyWebhookSignature,
} from "@/lib/payments/yellowcard";
import { failureReason, logMoney } from "@/lib/payments/observability";
import { findUserByEmail, getAdminClient, recordFunding } from "@/lib/wallet/ledger";
import { recordMoneyAudit, recordWebhookDelivery } from "@/lib/wallet/audit";
import { isCryptoReference } from "@/lib/payments/references";

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
 * that has not settled has not settled, and the wallet must never show money
 * that is still moving.
 *
 * The credit itself is `recordFunding`, the same function the card path uses,
 * idempotent on the reference. A webhook delivered five times credits once.
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
    logMoney({ surface: "fund", outcome: "unconfigured", reason: "yellowcard_not_configured" });
    return NextResponse.json({ received: false, reason: "unconfigured" }, { status: 500 });
  }

  if (!verifyWebhookSignature(raw, signature)) {
    logMoney({ surface: "fund", outcome: "rejected", reason: "yellowcard_bad_signature" });
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
    logMoney({ surface: "fund", outcome: "rejected", reason: "yellowcard_unreadable_event" });
    return NextResponse.json({ received: true, acted: false }, { status: 200 });
  }

  if (!isCryptoReference(event.reference)) {
    logMoney({
      surface: "fund",
      outcome: "rejected",
      reason: "yellowcard_foreign_reference",
      reference: event.reference,
    });
    return NextResponse.json({ received: true, acted: false }, { status: 200 });
  }

  if (event.status !== "completed") {
    /* Acknowledged and NOT credited. A pending crypto payment is money still
       in motion, and a balance that counts it is a balance somebody can spend
       before it exists. */
    logMoney({
      surface: "fund",
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
      surface: "fund",
      outcome: "unconfigured",
      reason: "service_role_key_missing",
      reference: event.reference,
    });
    return NextResponse.json({ received: false, reason: "unconfigured" }, { status: 500 });
  }

  try {
    /*
     * WHOSE WALLET.
     *
     * The same mechanism the card path uses - `findUserByEmail` on the address
     * the processor echoes back - rather than a second one invented for this
     * route. `startCryptoDeposit` sends the signed-in user's own address as
     * `customerEmail`, so the round trip is what ties an anonymous crypto
     * settlement to an account.
     */
    const user = event.email ? await findUserByEmail(event.email) : null;
    const userId = user?.id ?? null;
    if (!userId) {
      /* A signed, completed, correctly-shaped credit we cannot attribute. NOT
         200: this is money that has been paid and has nowhere to go, and it
         must stay visible in the processor's retry queue while somebody looks
         at it rather than being quietly accepted and dropped. */
      logMoney({
        surface: "fund",
        outcome: "failed",
        reason: "yellowcard_unattributable",
        reference: event.reference,
        amountMinor: event.amountMinor,
      });
      await recordMoneyAudit(admin, {
        actor: { kind: "webhook" },
        action: "wallet.funding.unmatched",
        reference: event.reference,
        amountMinor: event.amountMinor,
        outcome: "unmatched",
        detail: { provider: "yellowcard" },
      });
      await recordWebhookDelivery(admin, {
        event: "collection.completed",
        reference: event.reference,
        amountMinor: event.amountMinor,
        currency: "NGN",
        outcome: "failed",
        reason: "owner_unresolved",
        httpStatus: 500,
      });
      return NextResponse.json({ received: false, reason: "unattributable" }, { status: 500 });
    }

    const result = await recordFunding(admin, {
      userId,
      amountMinor: event.amountMinor,
      reference: event.reference,
      metadata: { note: "Wallet top-up with crypto", provider: "yellowcard" },
    });

    await recordMoneyAudit(admin, {
      actor: { kind: "webhook" },
      action: result === "posted" ? "wallet.funding.posted" : "wallet.funding.duplicate",
      reference: event.reference,
      amountMinor: event.amountMinor,
      subjectUserId: userId,
      outcome: result,
      detail: { provider: "yellowcard" },
    });

    await recordWebhookDelivery(admin, {
      event: "collection.completed",
      reference: event.reference,
      amountMinor: event.amountMinor,
      currency: "NGN",
      outcome: result,
      reason: "credited",
      httpStatus: 200,
    });

    logMoney({
      surface: "fund",
      outcome: result,
      reason: result === "duplicate" ? "yellowcard_duplicate" : "yellowcard_credited",
      reference: event.reference,
      amountMinor: event.amountMinor,
      userId,
    });

    return NextResponse.json({ received: true, acted: result === "posted" }, { status: 200 });
  } catch (error) {
    logMoney({
      surface: "fund",
      outcome: "failed",
      reason: `yellowcard_write_failed:${failureReason(error)}`,
      reference: event.reference,
      amountMinor: event.amountMinor,
    });
    /* 500 so it is sent again. The credit is not written, and an acknowledged
       failure here is a lost deposit. */
    return NextResponse.json({ received: false, reason: "write_failed" }, { status: 500 });
  }
}
