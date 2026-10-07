import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { paylukMerchantConfig } from "@/lib/payouts/payluk-merchant";
import { environmentMatches, parsePaylukWebhook, verifyPaylukSignature } from "@/lib/payments/providers/payluk-webhook";
import { ROUTE_FAILURE_LIMITS, countRouteFailure } from "@/lib/security/money-limits";
import { recordAlert } from "@/lib/alerts";
import { decidePaymentEvent } from "@/lib/money/balance-events";
import { adminDb, observe, type Db } from "@/lib/money/member-wallet";
import { applyArrangementWebhook, arrangementsLive } from "@/lib/money/provider-arrangements";
import { paylukContext } from "@/lib/payments/providers/payluk";
import { lagosToday } from "@/lib/bookings/schema";

/**
 * PAYLUK WEBHOOKS (Part B phase 15; founder sections 27 and 28;
 * docs/payments/payluk-source/concepts_webhooks.txt).
 *
 *   signature  ->  raw event persisted  ->  idempotency  ->  processing
 *   ->  movement status (funds_movement_observe)  ->  answer
 *
 *  - Nothing here is true because a request returned 200 elsewhere; this is
 *    where a movement becomes completed, failed or reversed.
 *  - The signature is checked before any database work, so an unsigned
 *    caller cannot write a row.
 *  - Every signed delivery is stored raw first, unique on (provider, key):
 *    a redelivery of a processed event changes nothing and pays nothing.
 *  - Arrival order is not trusted: the status in the payload is, and the
 *    database refuses a transition that would go backwards.
 *  - Unknown event names are acknowledged with 2xx and recorded (the docs:
 *    "new event names may appear").
 *  - A processing failure answers 500 so the provider retries; the stored
 *    row keeps the error and a retry count.
 */
export const runtime = "nodejs";

function answer(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

async function memberForCustomer(db: Db, customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await db
    .from("financial_provider_accounts")
    .select("user_id")
    .eq("provider", "payluk")
    .eq("provider_customer_id", customerId)
    .maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return answer({ received: false, reason: "body_unreadable" }, 400);
  }

  const config = paylukMerchantConfig(process.env);
  if (!config) return answer({ received: false, reason: "not_configured" }, 503);

  if (!verifyPaylukSignature(rawBody, request.headers.get("x-payluk-signature"), config.key)) {
    const spray = await countRouteFailure(ROUTE_FAILURE_LIMITS.webhookBadSignature, request.headers);
    if (!spray.allowed) {
      return NextResponse.json(
        { received: false, reason: "too_many_failures" },
        { status: 429, headers: { "retry-after": String(spray.retryAfterSeconds) } },
      );
    }
    await recordAlert({ kind: "webhook.payluk.signature_invalid", severity: "warning", detail: { http_status: 401 } });
    return answer({ received: false, reason: "signature_invalid" }, 401);
  }

  const db = adminDb();
  if (!db) return answer({ received: false, reason: "store_unavailable" }, 503);

  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  const event = parsePaylukWebhook(body);
  const eventKey = event?.key ?? `malformed:${createHash("sha256").update(rawBody).digest("hex")}`;
  const eventType = event?.event ?? "malformed";

  /* Raw persistence first. */
  const inserted = await db
    .from("provider_webhook_events")
    .insert({
      provider: "payluk",
      event_key: eventKey,
      event_type: eventType,
      environment: event?.environment ?? null,
      payload: body ?? { raw: rawBody.slice(0, 10_000) },
      signature_valid: true,
    })
    .select("id")
    .maybeSingle();

  let rowId: number | null = (inserted.data as { id: number } | null)?.id ?? null;
  if (inserted.error) {
    /* Already stored: a redelivery. Done unless the first attempt failed part way. */
    const { data: prior } = await db
      .from("provider_webhook_events")
      .select("id, processing_status, retry_count")
      .eq("provider", "payluk")
      .eq("event_key", eventKey)
      .maybeSingle();
    const p = prior as { id: number; processing_status: string; retry_count: number } | null;
    if (!p) return answer({ received: false, reason: "store_failed" }, 500);
    if (p.processing_status !== "received" && p.processing_status !== "failed") {
      return answer({ received: true, duplicate: true });
    }
    rowId = p.id;
    await db.from("provider_webhook_events").update({ retry_count: p.retry_count + 1 }).eq("id", p.id);
  }

  const finish = async (status: "processed" | "ignored" | "rejected" | "failed", error: string | null = null) => {
    if (rowId !== null) {
      await db.from("provider_webhook_events").update({ processing_status: status, processed_at: new Date().toISOString(), error }).eq("id", rowId);
    }
  };

  if (!event) {
    await finish("rejected", "malformed");
    return answer({ received: true, ignored: "malformed" });
  }
  if (!environmentMatches(event.environment, config.environment)) {
    await finish("rejected", "environment_mismatch");
    return answer({ received: true, ignored: "environment_mismatch" });
  }
  if (event.family === "escrow") {
    /* D73 Part B (phases 11 and 12): with the arrangement flows built and
       `rentals_protected_pay` on, escrow.* moves Vallo's record of the
       protected payment; otherwise it is recorded and parked, as before. */
    const ctx = paylukContext();
    if (!ctx || !(await arrangementsLive(db))) {
      await finish("ignored", "escrow_flows_not_built");
      return answer({ received: true, ignored: event.family });
    }
    try {
      const verdict = await applyArrangementWebhook(
        {
          db,
          ctx,
          todayLagos: lagosToday,
          alert: async (kind, detail) => {
            await recordAlert({ kind, severity: "critical", detail });
          },
        },
        (body as { data?: unknown }).data,
        eventKey,
      );
      if (verdict === "error") throw new Error("arrangement_observe_failed");
      if (verdict === "unmapped" || verdict === "unknown_arrangement" || verdict === "malformed") {
        await finish("ignored", verdict);
      } else {
        await finish("processed", verdict === "changed" || verdict === "same" ? null : verdict);
      }
      return answer({ received: true, outcome: verdict });
    } catch (error) {
      await finish("failed", error instanceof Error ? error.message.slice(0, 200) : "processing_failed");
      return answer({ received: false, reason: "processing_failed" }, 500);
    }
  }
  if (event.family !== "payment") {
    /* A name we do not know yet. */
    await finish("ignored", "unknown_event");
    return answer({ received: true, ignored: event.family });
  }

  try {
    const m = event.movement;
    const { data: known } = await db.from("funds_movements").select("id, user_id, amount_minor").eq("reference", m.reference).maybeSingle();
    const k = known as { id: string; user_id: string; amount_minor: number } | null;
    let ownerCustomerId: string | null = null;
    if (k) {
      const { data: acct } = await db
        .from("financial_provider_accounts")
        .select("provider_customer_id")
        .eq("user_id", k.user_id)
        .eq("provider", "payluk")
        .maybeSingle();
      ownerCustomerId = (acct as { provider_customer_id: string | null } | null)?.provider_customer_id ?? null;
    }
    const decision = decidePaymentEvent(
      event,
      k ? { amountMinor: Number(k.amount_minor), ownerCustomerId } : null,
      k ? null : await memberForCustomer(db, m.customerId),
    );

    if (decision.kind === "observe") {
      const verdict = await observe(db, m.reference, decision.to, "provider_webhook", {
        providerStatus: m.status,
        providerTransactionId: m.providerId || undefined,
        providerFeeMinor: m.feeMinor,
        detail: { event: event.event, ...decision.detail },
      });
      if (verdict === "error") throw new Error("observe_failed");
      await finish("processed", verdict === "refused" ? "transition_refused" : null);
      return answer({ received: true, outcome: verdict });
    }
    if (decision.kind === "mirror") {
      const { data: row, error } = await db
        .from("funds_movements")
        .insert({
          user_id: decision.userId,
          provider: "payluk",
          kind: decision.movementKind,
          reference: m.reference,
          provider_transaction_id: m.providerId || null,
          amount_minor: m.amountMinor,
          provider_fee_minor: m.feeMinor,
          status: decision.status,
          provider_status: m.status,
          status_source: "provider_webhook",
          provider_metadata: { event: event.event },
        })
        .select("id")
        .maybeSingle();
      if (error && !/duplicate key/i.test(error.message)) throw error;
      const id = (row as { id: string } | null)?.id;
      if (id) {
        await db.from("funds_movement_events").insert({ movement_id: id, from_status: null, to_status: decision.status, source: "provider_webhook", provider_status: m.status, detail: { event: event.event } });
      }
      await finish("processed");
      return answer({ received: true, outcome: "mirrored" });
    }
    await finish("ignored", decision.reason);
    return answer({ received: true, ignored: decision.reason });
  } catch (error) {
    await finish("failed", error instanceof Error ? error.message.slice(0, 200) : "processing_failed");
    return answer({ received: false, reason: "processing_failed" }, 500);
  }
}
