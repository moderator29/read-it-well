import "server-only";

import type { Json } from "../supabase/database.types";
import type { AdminClient } from "./ledger";

/**
 * The money path's audit trail.
 *
 * `public.audit_log` has existed since the first migration, has a select policy
 * for admins, has no insert, update or delete policy for anybody, and is
 * append-only by trigger. Every privileged action in the admin console writes
 * to it. The wallet path wrote NOTHING to it: a funding, a withdrawal, a
 * transfer and a settlement all moved real money and left no line anywhere a
 * human could read afterwards. The one incident this rebuild exists to fix was
 * invisible for exactly that reason.
 *
 * Now every movement leaves a row, including the ones where money did not move
 * and especially the ones where we do not know whether it did.
 *
 * WHO ACTED. `actor_id` is nullable on purpose and stays null for a webhook or
 * a scheduled sweep, because nobody acted: the processor did, or the clock did.
 * The metadata says which, so a null actor is never ambiguous.
 *
 * WHAT MAY NEVER GO IN. The same rule as the money log: no card details, no
 * bank account numbers, no keys, no signatures, no email addresses, no raw
 * webhook bodies. A reference, a kobo amount, an opaque user id and a short
 * machine-readable reason are the whole vocabulary. `audit_log` is readable by
 * every admin, so it is a wider audience than the server log, not a narrower
 * one.
 *
 * BEST EFFORT, ALWAYS. The movement this records has already committed by the
 * time we get here. A failed audit insert must never turn a completed payment
 * into an error, so every failure here is swallowed. A missing line is a
 * visible gap; a rolled-back credit would be a lie.
 */

/** Who, if anyone, asked for this movement. */
export type MoneyActor =
  /** A signed-in human, by user id. An admin recovering a payment, or a payer. */
  | { kind: "user"; userId: string }
  /** The processor, through the webhook. Nobody on our side acted. */
  | { kind: "webhook" }
  /** The reconciliation sweep, on its schedule. Nobody on our side acted. */
  | { kind: "sweep" };

export type MoneyAuditEntry = {
  actor: MoneyActor;
  /**
   * What happened, in the same closed-ish vocabulary the money log uses, dotted
   * and prefixed so `action like 'wallet.%'` finds the whole money history.
   * For example wallet.funding.recovered, wallet.transfer.posted,
   * wallet.withdrawal.hold_expired, wallet.escrow.released.
   */
  action: string;
  /** The reference the movement is keyed on. This is the join key. */
  reference: string | null;
  /** Integer kobo. Never a float, never a formatted string. */
  amountMinor?: number | null;
  /** Whose money moved, when that is known. Opaque and safe. */
  subjectUserId?: string | null;
  walletId?: string | null;
  /** Short, stable, machine readable. Mirrors the money log's reason. */
  outcome: string;
  /** Anything else worth keeping. Scalars only, and nothing sensitive. */
  detail?: Record<string, string | number | boolean | null>;
};

const ENTITY_TYPE = "wallet_entry";

/** Append one line to the money history. Never throws, never blocks money. */
export async function recordMoneyAudit(
  admin: AdminClient,
  entry: MoneyAuditEntry,
): Promise<void> {
  try {
    const metadata: Record<string, Json> = {
      outcome: entry.outcome,
      actor_kind: entry.actor.kind,
      ...(entry.reference ? { reference: entry.reference } : {}),
      ...(typeof entry.amountMinor === "number" ? { amount_minor: entry.amountMinor } : {}),
      ...(entry.subjectUserId ? { subject_user_id: entry.subjectUserId } : {}),
      ...(entry.walletId ? { wallet_id: entry.walletId } : {}),
      ...(entry.detail ?? {}),
    };
    await admin.from("audit_log").insert({
      actor_id: entry.actor.kind === "user" ? entry.actor.userId : null,
      action: entry.action,
      entity_type: ENTITY_TYPE,
      entity_id: entry.reference,
      metadata: metadata as Json,
    });
  } catch {
    // Best effort by design. See the header.
  }
}

/**
 * One Paystack delivery, recorded as what it was and what we did about it.
 *
 * The webhook used to answer HTTP 200 on every failure branch, so the
 * processor's delivery log stayed green while nothing was written and nothing
 * was kept. Paystack's dashboard could show a successful delivery for a charge
 * that never reached the ledger, and there was no record on our side to
 * contradict it. This is that record.
 *
 * It lives in `audit_log` rather than in a table of its own because it fits:
 * a nullable actor, a text entity id that takes the reference, and a jsonb
 * bag for the rest, all append-only and admin-readable already. A dedicated
 * table would need a migration, an RLS policy and a retention rule to hold the
 * same five fields.
 *
 * The RAW BODY IS NEVER STORED. It carries the customer's email and, depending
 * on the channel, a masked pan and an authorization code. What we keep is the
 * event name, the reference, the kobo amount and our own verdict, which is
 * everything a reconciliation conversation actually needs.
 */
export async function recordWebhookDelivery(
  admin: AdminClient,
  delivery: {
    /** Paystack's event name, e.g. charge.success. Empty when unparseable. */
    event: string;
    reference: string | null;
    amountMinor?: number | null;
    currency?: string | null;
    /** Our verdict: posted, duplicate, ignored, rejected, unconfigured, failed. */
    outcome: string;
    /** Why, in one machine-readable token. */
    reason: string;
    /** The HTTP status this delivery was answered with. */
    httpStatus: number;
  },
): Promise<void> {
  try {
    const metadata: Record<string, Json> = {
      event: delivery.event,
      outcome: delivery.outcome,
      reason: delivery.reason,
      http_status: delivery.httpStatus,
      ...(delivery.reference ? { reference: delivery.reference } : {}),
      ...(typeof delivery.amountMinor === "number"
        ? { amount_minor: delivery.amountMinor }
        : {}),
      ...(delivery.currency ? { currency: delivery.currency } : {}),
    };
    await admin.from("audit_log").insert({
      actor_id: null,
      action: `paystack.webhook.${delivery.event.length > 0 ? delivery.event : "unparseable"}`,
      entity_type: "paystack_webhook",
      entity_id: delivery.reference,
      metadata: metadata as Json,
    });
  } catch {
    // Best effort by design. See the header.
  }
}
