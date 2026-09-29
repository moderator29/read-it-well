import { NextResponse } from "next/server";
import { failureReason, logMoney } from "@/lib/payments/observability";
import { getAdminClient } from "@/lib/supabase/service";
import { recordWebhookDelivery } from "@/lib/money/audit";
import { recordAlert } from "@/lib/alerts";
import { ROUTE_FAILURE_LIMITS, countRouteFailure } from "@/lib/security/money-limits";
import { providerFor } from "@/lib/crypto/providers";
import { isCryptoReference } from "@/lib/crypto/reference";
import { applyEvent } from "@/lib/crypto/service";

/**
 * Yellow Card webhook: the provider's word on one crypto payment.
 *
 * ===========================================================================
 * THE STATUS CODES MEAN THINGS.
 * ===========================================================================
 *
 *   200  we made a decision and stand by it (applied, a progress update, a
 *        duplicate, a stale or out-of-order report, a foreign reference).
 *        Do not send this again.
 *   400  the body is not JSON.
 *   401  the signature did not verify with YELLOWCARD_WEBHOOK_SECRET.
 *   500  we could not record it. SEND IT AGAIN: an unrecorded settlement
 *        must stay in the provider's retry queue.
 *
 * ===========================================================================
 * NEVER TRUST THE BODY, ONLY THE SIGNED BODY, AND ONLY THROUGH THE DATABASE.
 * ===========================================================================
 *
 * The signature is checked over the RAW body before anything is parsed. The
 * report is then handed to `crypto_payment_apply`, which records it once per
 * event id (idempotency), refuses a transition out of order, refuses a
 * settlement that is not exactly the charge in naira, and only on a real
 * settlement calls `private.settle_booking_charge` and writes the AML record,
 * all in one transaction. This route decides nothing about money itself.
 *
 * Vallo never holds the crypto or the naira: the provider settled the naira
 * straight to the lister, the Guarantee reserve and Vallo before it told us.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();
  const provider = providerFor("yellowcard");

  if (!provider.isConfigured()) {
    /* 500, not 200: unconfigured is a state we come out of, and a settlement
       arriving meanwhile must stay in the retry queue. */
    logMoney({ surface: "webhook", outcome: "unconfigured", reason: "yellowcard_not_configured" });
    await recordAlert({
      kind: "webhook.yellowcard.unconfigured",
      severity: "critical",
      detail: { reason: "yellowcard_not_configured", http_status: 500 },
      subjectId: "yellowcard-webhook",
    });
    return NextResponse.json({ received: false, reason: "unconfigured" }, { status: 500 });
  }

  if (!provider.verifyWebhook(raw, request.headers)) {
    const spray = await countRouteFailure(ROUTE_FAILURE_LIMITS.webhookBadSignature, request.headers);
    if (!spray.allowed) {
      return NextResponse.json(
        { received: false, reason: "too_many_failures" },
        { status: 429, headers: { "retry-after": String(spray.retryAfterSeconds) } },
      );
    }
    logMoney({ surface: "webhook", outcome: "rejected", reason: "yellowcard_bad_signature" });
    await recordAlert({ kind: "webhook.yellowcard.signature_invalid", severity: "warning", detail: { http_status: 401 } });
    return NextResponse.json({ received: false, reason: "unauthorised" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ received: false, reason: "malformed" }, { status: 400 });
  }

  const event = provider.parseWebhook(body);
  if (!event) {
    logMoney({ surface: "webhook", outcome: "rejected", reason: "yellowcard_unreadable_event" });
    return NextResponse.json({ received: true, acted: false }, { status: 200 });
  }

  if (!isCryptoReference(event.reference)) {
    logMoney({ surface: "webhook", outcome: "rejected", reason: "yellowcard_foreign_reference", reference: event.reference });
    await recordAlert({
      kind: "webhook.yellowcard.unknown_reference",
      severity: "warning",
      detail: { reference: event.reference, status: event.state },
      subjectId: event.reference,
    });
    return NextResponse.json({ received: true, acted: false }, { status: 200 });
  }

  const admin = getAdminClient();
  if (!admin) {
    logMoney({ surface: "webhook", outcome: "unconfigured", reason: "service_role_key_missing", reference: event.reference });
    await recordAlert({
      kind: "webhook.yellowcard.unconfigured",
      severity: "critical",
      detail: { reason: "service_role_key_missing", reference: event.reference, http_status: 500 },
      subjectId: event.reference,
    });
    return NextResponse.json({ received: false, reason: "unconfigured" }, { status: 500 });
  }

  try {
    const applied = await applyEvent(admin, provider, event, "webhook");
    const acted = applied.outcome === "applied" || applied.outcome === "updated";
    if (applied.outcome === "unknown-reference") {
      await recordAlert({
        kind: "webhook.yellowcard.unknown_reference",
        severity: "warning",
        detail: { reference: event.reference, status: event.state },
        subjectId: event.reference,
      });
    }
    await recordWebhookDelivery(admin, {
      event: `crypto.${event.state}`,
      reference: event.reference,
      amountMinor: event.facts.settledMinor ?? null,
      currency: "NGN",
      outcome: acted ? "posted" : applied.outcome === "duplicate" ? "duplicate" : "ignored",
      reason: applied.outcome,
      httpStatus: 200,
    });
    logMoney({
      surface: "webhook",
      outcome: acted ? "posted" : applied.outcome === "duplicate" ? "duplicate" : "rejected",
      reason: `yellowcard_${applied.outcome}`,
      reference: event.reference,
      ...(event.facts.settledMinor !== undefined ? { amountMinor: event.facts.settledMinor } : {}),
    });
    return NextResponse.json({ received: true, acted, outcome: applied.outcome }, { status: 200 });
  } catch (error) {
    logMoney({
      surface: "webhook",
      outcome: "failed",
      reason: `yellowcard_write_failed:${failureReason(error)}`,
      reference: event.reference,
    });
    await recordAlert({
      kind: "webhook.yellowcard.settlement_failed",
      severity: "critical",
      detail: { reference: event.reference, state: event.state, reason: `write_failed:${failureReason(error)}` },
      subjectId: event.reference,
    });
    await recordWebhookDelivery(admin, {
      event: `crypto.${event.state}`,
      reference: event.reference,
      amountMinor: event.facts.settledMinor ?? null,
      currency: "NGN",
      outcome: "failed",
      reason: `write_failed:${failureReason(error)}`,
      httpStatus: 500,
    });
    return NextResponse.json({ received: false, reason: "write_failed" }, { status: 500 });
  }
}
