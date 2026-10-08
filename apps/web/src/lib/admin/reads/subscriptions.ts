import "server-only";

import { requireAdmin } from "../guard";
import { UNAVAILABLE, type Read } from "./shared";

/**
 * THE PAYMENTS DESK'S SUBSCRIPTIONS: Vallo Pro and Vallo Business, read only.
 *
 * How many members are on a free trial, paying, past due, or cancelled and
 * running out (exact counts), and the latest rows. Read through the
 * operator's own client (`member_subscriptions_own` admits staff), with the
 * columns a member may read: never Paystack's management token or the email
 * hash. Nothing here moves a plan: that is Paystack's events, the member's own
 * cancel, and the sweep.
 */

export const LIVE_SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "non_renewing"] as const;
export type LiveSubscriptionStatus = (typeof LIVE_SUBSCRIPTION_STATUSES)[number];

export type AdminSubscriptionRow = {
  id: string;
  userId: string;
  planName: string;
  kind: "trial" | "paid";
  status: string;
  mode: string | null;
  amountMinor: number | null;
  /** The trial's end for a trial, the end of the period paid for otherwise. */
  endsAt: string | null;
  createdAt: string;
};

export type SubscriptionsDesk = {
  counts: Record<LiveSubscriptionStatus, number>;
  latest: AdminSubscriptionRow[];
};

export const SUBSCRIPTIONS_DESK_ROWS = 25;

type Row = {
  id: string;
  user_id: string;
  plan_key: string;
  kind: "trial" | "paid";
  status: string;
  mode: string | null;
  amount_minor: number | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  plan: { name: string } | null;
};

type Loose = {
  from: (table: string) => {
    select: (
      columns: string,
      options?: { count: "exact"; head: true },
    ) => {
      eq: (column: string, value: unknown) => PromiseLike<{ count: number | null; error: unknown }>;
      order: (column: string, options: { ascending: boolean }) => {
        limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
};

export async function getSubscriptionsDesk(): Promise<Read<SubscriptionsDesk>> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return UNAVAILABLE;
  const db = access.supabase as unknown as Loose;
  try {
    const [counts, latest] = await Promise.all([
      Promise.all(
        LIVE_SUBSCRIPTION_STATUSES.map((status) =>
          db.from("member_subscriptions").select("id", { count: "exact", head: true }).eq("status", status),
        ),
      ),
      db
        .from("member_subscriptions")
        .select(
          "id, user_id, plan_key, kind, status, mode, amount_minor, trial_ends_at, current_period_end, created_at, plan:entitlement_plans(name)",
        )
        .order("created_at", { ascending: false })
        .limit(SUBSCRIPTIONS_DESK_ROWS),
    ]);
    if (counts.some((c) => c.error || typeof c.count !== "number") || latest.error) return UNAVAILABLE;
    const tally = Object.fromEntries(LIVE_SUBSCRIPTION_STATUSES.map((s, i) => [s, counts[i]!.count as number])) as Record<
      LiveSubscriptionStatus,
      number
    >;
    const rows = ((latest.data as Row[] | null) ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      planName: r.plan?.name ?? r.plan_key,
      kind: r.kind,
      status: r.status,
      mode: r.mode,
      amountMinor: r.amount_minor,
      endsAt: r.kind === "trial" ? r.trial_ends_at : r.current_period_end,
      createdAt: r.created_at,
    }));
    return { state: "ok", data: { counts: tally, latest: rows } };
  } catch {
    return UNAVAILABLE;
  }
}
