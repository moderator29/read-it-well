import "server-only";

import { recordMoneyAudit } from "@/lib/money/audit";
import type { MoneyOutcome } from "@/lib/payments/observability";
import type { AdminClient } from "@/lib/supabase/service";
import type { PaystackMode } from "@/lib/payments/paystack-mode";
import { isSubscriptionEventType, readSubscriptionEvent, type SubscriptionEvent } from "./events";

/**
 * THE SUBSCRIPTION LEG OF THE PAYSTACK WEBHOOK. Called from
 * app/api/paystack/webhook/route.ts after the route verified the signature,
 * for charge.success on a subscription (our `rm-sub-` checkout or a renewal
 * Paystack charged under a plan), subscription.create, subscription.not_renew,
 * subscription.disable, invoice.create, invoice.update and
 * invoice.payment_failed.
 *
 * Everything that moves is decided in ONE database transaction by
 * `public.subscription_apply_event`: the replay check on the event key, the
 * state move (trialing, active, past_due, non_renewing, cancelled, expired),
 * the plan grant through member_entitlement_plans, and, in live mode, the
 * revenue line. This file only reads the payload and words the answer.
 *
 * STATUS CODES follow the route's contract: 200 for a decision, 500 when the
 * write errored so Paystack retries (the apply is idempotent). Money that does
 * not match what was sold, a renewal at another amount and money on a finished
 * subscription answer 200 with outcome "failed", which raises the route's
 * critical desk alert: a person decides (refund). An event about nothing of
 * ours answers reason `reference_not_ours`, which raises its warning.
 */

export type SubscriptionVerdict = {
  outcome: MoneyOutcome;
  reason: string;
  httpStatus: number;
  amountMinor?: number | null;
  userId?: string | null;
};

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

type ApplyRow = { outcome?: unknown; status?: unknown; user_id?: unknown };

/** Apply one normalised event. Shared by the webhook and the return page's own verify. */
export async function applySubscriptionEvent(
  admin: AdminClient,
  mode: PaystackMode,
  read: SubscriptionEvent,
): Promise<{ ok: true; outcome: string; status: string | null; userId: string | null } | { ok: false }> {
  try {
    const { data, error } = await (admin as unknown as Rpc).rpc("subscription_apply_event", {
      p_mode: mode,
      p_event: read.event,
      p_event_key: read.eventKey,
      p_data: read.data,
    });
    if (error || !data || typeof data !== "object") return { ok: false };
    const row = data as ApplyRow;
    if (typeof row.outcome !== "string") return { ok: false };
    return {
      ok: true,
      outcome: row.outcome,
      status: typeof row.status === "string" ? row.status : null,
      userId: typeof row.user_id === "string" ? row.user_id : null,
    };
  } catch {
    return { ok: false };
  }
}

/** The route's verdict for each outcome the database can answer. */
export function subscriptionVerdict(
  event: string,
  outcome: string,
  extra: { amountMinor?: number | null; userId?: string | null } = {},
): SubscriptionVerdict {
  const base = { amountMinor: extra.amountMinor ?? null, userId: extra.userId ?? null };
  switch (outcome) {
    case "applied":
      return { outcome: "posted", reason: `subscription_${event}_applied`, httpStatus: 200, ...base };
    case "recorded":
      return { outcome: "ignored", reason: `subscription_${event}_recorded`, httpStatus: 200, ...base };
    case "duplicate":
      return { outcome: "duplicate", reason: `subscription_${event}_duplicate`, httpStatus: 200, ...base };
    case "unmatched":
      return { outcome: "ignored", reason: "reference_not_ours", httpStatus: 200, ...base };
    case "ignored":
      return { outcome: "ignored", reason: `subscription_${event}_ignored`, httpStatus: 200, ...base };
    case "mismatch":
      return { outcome: "failed", reason: "subscription_amount_or_currency_mismatch", httpStatus: 200, ...base };
    case "amount_differs":
      return { outcome: "failed", reason: "subscription_renewal_amount_differs", httpStatus: 200, ...base };
    case "late_charge":
      return { outcome: "failed", reason: "subscription_charge_on_finished_subscription", httpStatus: 200, ...base };
    default:
      return { outcome: "failed", reason: "subscription_apply_unreadable", httpStatus: 500, ...base };
  }
}

export async function handleSubscriptionEvent(
  admin: AdminClient,
  mode: PaystackMode,
  event: string,
  data: unknown,
): Promise<SubscriptionVerdict> {
  if (!isSubscriptionEventType(event)) return { outcome: "ignored", reason: `event_unhandled:${event}`, httpStatus: 200 };
  const read = readSubscriptionEvent(event, data);
  if (!read) return { outcome: "ignored", reason: `subscription_${event}_unreadable`, httpStatus: 200 };
  const amountMinor = read.data.amount_minor ?? null;

  const applied = await applySubscriptionEvent(admin, mode, read);
  if (!applied.ok) {
    // Unknown state: let Paystack retry. The apply is idempotent on the event key.
    return { outcome: "failed", reason: "subscription_apply_error", httpStatus: 500, amountMinor };
  }

  await recordMoneyAudit(admin, {
    actor: { kind: "webhook" },
    action: `subscription.${event}`,
    reference: read.data.reference ?? read.data.subscription_code ?? read.data.invoice_code ?? null,
    amountMinor,
    subjectUserId: applied.userId,
    outcome: applied.outcome,
    detail: { source: "webhook", status: applied.status, mode },
  });

  return subscriptionVerdict(event, applied.outcome, { amountMinor, userId: applied.userId });
}
