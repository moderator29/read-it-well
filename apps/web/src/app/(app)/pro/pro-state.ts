/**
 * WHAT /pro KNOWS ABOUT THE PERSON LOOKING AT IT, AND NOTHING IT DOES NOT.
 *
 * The plan tables exist (`b3_tax_entitlements_promotion`, applied 6 October):
 * `entitlement_plans` (readable by anyone), `member_entitlement_plans` (each
 * member reads only their own rows under RLS). D83 (the founder's rulings of
 * 8 October, migration d84) adds the two paid plans as rows: Vallo Pro and
 * Vallo Business, each with its monthly price on the row, its promotion quotas
 * as grants and what else it includes as `perks`, and the free trial's length
 * as one settings value (`subscription_settings.trial_days`). Every figure the
 * page shows is read from those rows; none is written in code. No checkout and
 * no way to start a trial exist yet, so the page never offers one.
 *
 * The answer is one of four, and the page draws each one differently:
 *   signed-out  nobody to ask about
 *   unknown     the read failed; the page says it could not check, it never
 *               guesses "Free" for somebody who might hold a plan
 *   free        no plan of their own in force; the default plan's own name
 *   held        a plan of their own in force, with its end date if it has one
 *
 * Pure: `planStateFrom` takes rows, so the four answers are tested without a
 * database. The read itself lives in `page.tsx`.
 */

export type ProPlanState =
  | { kind: "signed-out" }
  | { kind: "unknown" }
  | { kind: "free"; planName: string }
  | { kind: "held"; planName: string; until: string | null };

/** One of the member's own plan rows, as the page selects it. */
export type MemberPlanRow = {
  effective_from: string;
  effective_to: string | null;
  plan: { plan_key: string; name: string; is_default: boolean } | null;
};

/**
 * A plan row from `entitlement_plans`. The page selects `*`, so before the
 * d84 migration adds the price columns they are simply absent, never an error.
 */
export type PlanRow = {
  id?: number;
  plan_key: string;
  name: string;
  is_default: boolean;
  effective_from: string;
  effective_to: string | null;
  price_minor?: number | null;
  billing_interval?: string | null;
  perks?: string[] | null;
};

/** A row from `entitlement_plan_features`. */
export type PlanFeatureRow = {
  plan_id: number;
  feature_key: string;
  granted: boolean;
  quota: number | null;
};

/** The promotion keys a plan can carry a monthly quota of, in reach order. */
export const PLAN_QUOTA_KEYS = ["listing_boost", "listing_spotlight", "listing_featured", "listing_prime"] as const;
export type PlanQuotaKey = (typeof PLAN_QUOTA_KEYS)[number];

/** What a plan includes beyond its quotas, as the database names it. */
export const PLAN_PERKS = [
  "deep_analytics",
  "pro_badge",
  "priority_support",
  "team_members",
  "command_centre",
  "bulk_tools",
  "export",
] as const;
export type PlanPerk = (typeof PLAN_PERKS)[number];

/** A paid plan as the page draws it: every figure from the rows. */
export type PaidPlan = {
  key: string;
  name: string;
  priceMinor: number;
  interval: "month";
  quotas: { key: PlanQuotaKey; count: number }[];
  perks: PlanPerk[];
};

function inForce(from: string, to: string | null, now: number): boolean {
  const start = Date.parse(from);
  if (!Number.isFinite(start) || start > now) return false;
  if (to == null) return true;
  const end = Date.parse(to);
  return Number.isFinite(end) && end > now;
}

/**
 * The person's state from the two reads. `mine` is null when that read
 * failed, and so is `plans`: either failing is "unknown", because a member
 * who holds a plan must never be told they are on Free by a page that could
 * not check.
 */
export function planStateFrom(
  mine: readonly MemberPlanRow[] | null,
  plans: readonly PlanRow[] | null,
  now: number,
): ProPlanState {
  if (mine == null || plans == null) return { kind: "unknown" };
  const own = mine
    .filter((r) => r.plan && !r.plan.is_default && inForce(r.effective_from, r.effective_to, now))
    .sort((a, b) => Date.parse(b.effective_from) - Date.parse(a.effective_from))[0];
  if (own?.plan) return { kind: "held", planName: own.plan.name, until: own.effective_to };
  const fallback = plans.find((p) => p.is_default && inForce(p.effective_from, p.effective_to, now));
  if (!fallback) return { kind: "unknown" };
  return { kind: "free", planName: fallback.name };
}

/** The server's clock for one request, read once (kept out of render for the purity rule). */
export function planClock(): number {
  return Date.now();
}

/**
 * The paid plans the database describes today: every plan in force that is
 * not the default and carries a monthly price, cheapest first, with its
 * granted promotion quotas and its known perks. A plan with no price, an
 * interval other than a month, or a read that failed is left out rather than
 * drawn with a guessed figure. A perk this page has no words for is skipped.
 */
export function paidPlansFrom(
  plans: readonly PlanRow[] | null,
  features: readonly PlanFeatureRow[] | null,
  now: number,
): PaidPlan[] {
  if (!plans) return [];
  return plans
    .filter(
      (p) =>
        !p.is_default &&
        inForce(p.effective_from, p.effective_to, now) &&
        typeof p.price_minor === "number" &&
        Number.isSafeInteger(p.price_minor) &&
        p.price_minor > 0 &&
        p.billing_interval === "month",
    )
    .sort((a, b) => (a.price_minor as number) - (b.price_minor as number))
    .map((p) => {
      const mine = (features ?? []).filter((f) => f.plan_id === p.id && f.granted);
      const quotas = PLAN_QUOTA_KEYS.flatMap((key) => {
        const row = mine.find((f) => f.feature_key === key);
        return row && typeof row.quota === "number" && row.quota > 0 ? [{ key, count: row.quota }] : [];
      });
      const perks = (p.perks ?? []).filter((k): k is PlanPerk => (PLAN_PERKS as readonly string[]).includes(k));
      return { key: p.plan_key, name: p.name, priceMinor: p.price_minor as number, interval: "month" as const, quotas, perks };
    });
}

/**
 * The free trial's length in whole days, from `subscription_settings`. Null
 * when the row could not be read or holds no usable number, and then the page
 * says nothing about a trial rather than a remembered figure.
 */
export function trialDaysFrom(row: unknown): number | null {
  if (!row || typeof row !== "object") return null;
  const days = (row as { trial_days?: unknown }).trial_days;
  return typeof days === "number" && Number.isInteger(days) && days > 0 && days <= 60 ? days : null;
}
