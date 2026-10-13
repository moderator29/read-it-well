/**
 * WHAT A MEMBER'S SUBSCRIPTION ROWS SAY, FOR /pro.
 *
 * The rows are `public.member_subscriptions`, read under RLS (the member's own
 * rows, the columns granted to them). Every date and amount the page shows
 * about a plan comes from here; none is computed from a remembered price.
 *
 * Pure: rows in, a view out, so each state is a unit test.
 */

import type { Dictionary } from "@vallo/i18n/core";

/** The words of the trial, the checkout and managing a plan (`subscriptions.en.ts`). */
export type SubscriptionsCopy = Dictionary["subscriptions"];

export type SubscriptionStatus =
  | "trialing"
  | "converted"
  | "expired"
  | "incomplete"
  | "active"
  | "past_due"
  | "non_renewing"
  | "cancelled"
  | "abandoned"
  | "mismatch";

/** One row as the page selects it. */
export type SubscriptionRow = {
  id: string;
  plan_key: string;
  kind: "trial" | "paid";
  status: SubscriptionStatus;
  amount_minor: number | null;
  currency: string | null;
  checkout_reference: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_requested_at: string | null;
  created_at: string;
  plan: { name: string } | null;
};

/** The columns the page and the return page select (all granted to members). */
export const SUBSCRIPTION_COLUMNS =
  "id, plan_key, kind, status, amount_minor, currency, checkout_reference, trial_ends_at, current_period_end, cancel_requested_at, created_at, plan:entitlement_plans(name)";

export type LiveSubscription =
  | { kind: "trial"; id: string; planKey: string; planName: string; trialEndsAt: string }
  | {
      kind: "paid";
      id: string;
      planKey: string;
      planName: string;
      status: "active" | "past_due" | "non_renewing";
      /** The end of the period paid for: the next charge date while it renews. */
      periodEnd: string | null;
      amountMinor: number;
    };

export type SubscriptionView = {
  /** The member has had their one free trial. */
  trialUsed: boolean;
  /** The plan they hold now through a subscription, if any. */
  live: LiveSubscription | null;
};

const LIVE: ReadonlySet<SubscriptionStatus> = new Set(["trialing", "active", "past_due", "non_renewing"]);

function after(value: string | null, now: number): boolean {
  if (value == null) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms > now;
}

/**
 * The view, or null when the read failed (the page then says it could not
 * check rather than offering a trial to somebody who may already hold one).
 * A trial past its end, or a cancelled plan past its period, is not live even
 * before the sweep has moved its status: the grant has already ended.
 */
export function subscriptionViewFrom(rows: readonly SubscriptionRow[] | null, now: number): SubscriptionView | null {
  if (rows == null) return null;
  const trialUsed = rows.some((r) => r.kind === "trial");
  const live = rows
    .filter((r) => LIVE.has(r.status))
    .filter((r) => (r.status === "trialing" ? after(r.trial_ends_at, now) : r.status === "non_renewing" ? after(r.current_period_end, now) : true))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  if (!live) return { trialUsed, live: null };
  const planName = live.plan?.name ?? live.plan_key;
  if (live.kind === "trial") {
    return { trialUsed, live: { kind: "trial", id: live.id, planKey: live.plan_key, planName, trialEndsAt: live.trial_ends_at ?? "" } };
  }
  if (typeof live.amount_minor !== "number" || !Number.isSafeInteger(live.amount_minor)) return { trialUsed, live: null };
  return {
    trialUsed,
    live: {
      kind: "paid",
      id: live.id,
      planKey: live.plan_key,
      planName,
      status: live.status as "active" | "past_due" | "non_renewing",
      periodEnd: live.current_period_end,
      amountMinor: live.amount_minor,
    },
  };
}

/** What the plan page may offer for one plan, given the view and the switches. */
export type PlanOffer =
  | { kind: "sign-in" }
  | { kind: "closed" }
  | { kind: "unknown" }
  /** Hold a paid plan already: managed above, nothing to buy here. */
  | { kind: "subscribed"; planName: string; same: boolean }
  | { kind: "buy"; trial: boolean; inTrial: boolean; canPay: boolean };

export function planOfferFor(input: {
  planKey: string;
  signedIn: boolean;
  trialOpen: boolean;
  payOpen: boolean;
  trialDays: number | null;
  view: SubscriptionView | null;
}): PlanOffer {
  if (!input.signedIn) return input.trialOpen || input.payOpen ? { kind: "sign-in" } : { kind: "closed" };
  if (!input.trialOpen && !input.payOpen) return { kind: "closed" };
  if (!input.view) return { kind: "unknown" };
  const live = input.view.live;
  if (live?.kind === "paid") return { kind: "subscribed", planName: live.planName, same: live.planKey === input.planKey };
  const trial = input.trialOpen && !input.view.trialUsed && live == null && input.trialDays != null;
  if (!trial && !input.payOpen) return { kind: "closed" };
  return { kind: "buy", trial, inTrial: live?.kind === "trial", canPay: input.payOpen };
}
