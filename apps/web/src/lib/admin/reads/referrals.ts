import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../supabase/admin";
import { requireAdmin } from "../guard";
import { UNAVAILABLE, type Read } from "./shared";
import {
  REFERRAL_STATUSES,
  asPayoutStatus,
  asReferralStatus,
  emptyStatusCounts,
  intervalParts,
  isUuid,
  reasonList,
  type GraphEdge,
  type PayoutStatus,
  type ReferralStatus,
  type StatusCounts,
} from "./referrals-model";

/**
 * THE REFERRAL DESK'S READS.
 *
 * TWO DOORS, AND WHY. The seven admin functions (`admin_referral_liability`,
 * `_clusters`, `_cluster_exposure`, `_graph`, and the two deciders) check
 * `private.is_staff()` against `auth.uid()` and are granted to `authenticated`
 * only, so they are called on the operator's OWN client: there is no
 * service-role path to them and no way to ask them as somebody else.
 *
 * The queues are a different matter. `referrals`, `rewards_payouts`,
 * `referral_campaigns`, `referral_budget_periods` and `rewards_ledger` are
 * readable by `service_role` alone (the b4 migrations revoke every other role,
 * so that members can never read a risk score or an account key), and there is
 * no admin function that lists the rows waiting on a person. So the lists are
 * read on the service client, and ONLY after `requireAdmin()` has passed in the
 * same function, exactly as `lib/admin/queries.ts` does for its counts. A staff
 * member with a scope is not enough: the deciding functions need an admin
 * role, so the whole desk is admin only.
 *
 * LEAST PRIVILEGE IN WHAT IS READ. A person is a display name and an id. No
 * email, no phone, no full account number (the last four and the name the bank
 * returned), no recipient code, no network address or full device fingerprint
 * (the cluster signals are masked in the model).
 *
 * AN UNAVAILABLE READ IS NEVER ZERO. Every function answers data or
 * `unavailable`; a queue that cannot be read is drawn as not readable, never
 * as clear.
 */

type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
type Db = SupabaseClient;

/** The operator's client and a service client, once the operator is proved an admin. */
async function doors(): Promise<{ operator: { rpc: Rpc }; service: Db } | null> {
  const access = await requireAdmin();
  if (access.state !== "admin" || access.isStaff) return null;
  try {
    return {
      operator: { rpc: access.userClient.rpc.bind(access.userClient) as unknown as Rpc },
      service: createAdminClient() as unknown as Db,
    };
  } catch {
    return null;
  }
}

function integer(value: unknown): number {
  const n = typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : 0;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((r): r is Record<string, unknown> => record(r) !== null) : [];
}

/** Display names for a set of ids. A person with none reads as absent, and the desk names them by id. */
export async function displayNames(db: Db, ids: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = [...new Set(ids.filter(isUuid))];
  for (let i = 0; i < wanted.length; i += 200) {
    const { data } = await db.from("profiles").select("id, display_name").in("id", wanted.slice(i, i + 200));
    for (const row of (data ?? []) as { id: string; display_name: string | null }[]) {
      const name = (row.display_name ?? "").trim();
      if (name) out.set(row.id, name);
    }
  }
  return out;
}

/* ------------------------------------------------------------------- desk */

export type Liability = {
  /** The Rewards Balance in total: what Vallo owes members, the sum of the ledger. */
  owedMinor: number;
  /** Rewards on referrals that have not been earned yet (attributed, qualified, pending, approved, under review). */
  pendingMinor: number;
  paidMinor: number;
  reversedAfterPaidMinor: number;
  /** The Lagos month the budget figures are for, `YYYY-MM-DD` (the first of the month). */
  month: string | null;
  budgetCapMinor: number | null;
  budgetCommittedMinor: number | null;
  byCampaign: { slug: string; status: string; committedMinor: number }[];
  /** Why invited people are not counting yet: reason to how many. */
  blockedOn: Record<string, number>;
  referralsUnderReview: number;
  payoutsUnderReview: number;
  payoutsUnknown: number;
  payoutsStuck: number;
  transferIncidents: number;
  payoutsEnabled: boolean;
};

export type CampaignView = {
  slug: string;
  kind: string;
  title: string;
  status: "draft" | "active" | "paused" | "ended";
  rewardMinor: number;
  memberCapMinor: number;
  reviewDays: number | null;
  reviewHours: number | null;
  requirementKeys: string[];
  startsAt: string;
  endsAt: string | null;
  reason: string;
};

export type BudgetPeriodView = {
  month: string;
  capMinor: number;
  committedMinor: number;
  reason: string;
};

export type ReferralDesk = {
  liability: Liability;
  /** open, or paused with the reason (no_campaign, no_budget, budget_reached). */
  programme: { open: boolean; reason: string | null };
  live: CampaignView | null;
  /** The campaigns that are not live, newest first: what ran before, and what is only a draft. */
  others: CampaignView[];
  budgets: BudgetPeriodView[];
  counts: StatusCounts;
};

export function parseLiability(value: unknown): Liability | null {
  const d = record(value);
  if (!d) return null;
  const blocked: Record<string, number> = {};
  for (const [k, v] of Object.entries(record(d.blocked_on) ?? {})) blocked[k] = integer(v);
  const cap = d.budget_cap_minor;
  const committed = d.budget_committed_minor;
  return {
    owedMinor: integer(d.owed_minor),
    pendingMinor: integer(d.pending_minor),
    paidMinor: integer(d.paid_minor),
    reversedAfterPaidMinor: integer(d.reversed_after_paid_minor),
    month: text(d.month),
    budgetCapMinor: cap === null || cap === undefined ? null : integer(cap),
    budgetCommittedMinor: committed === null || committed === undefined ? null : integer(committed),
    byCampaign: rows(d.by_campaign).map((c) => ({
      slug: text(c.slug) ?? "",
      status: text(c.status) ?? "",
      committedMinor: integer(c.committed_minor),
    })),
    blockedOn: blocked,
    referralsUnderReview: integer(d.under_review),
    payoutsUnderReview: integer(d.payouts_under_review),
    payoutsUnknown: integer(d.payouts_unknown),
    payoutsStuck: integer(d.payouts_stuck),
    transferIncidents: integer(d.transfer_incidents),
    payoutsEnabled: d.payouts_enabled === true,
  };
}

function parseCampaign(row: Record<string, unknown>): CampaignView | null {
  const status = row.status;
  if (status !== "draft" && status !== "active" && status !== "paused" && status !== "ended") return null;
  const slug = text(row.slug);
  const startsAt = text(row.starts_at);
  if (!slug || !startsAt) return null;
  const window = intervalParts(row.review_window);
  return {
    slug,
    kind: text(row.kind) ?? "consumer",
    title: text(row.title) ?? slug,
    status,
    rewardMinor: integer(row.reward_minor),
    memberCapMinor: integer(row.member_cap_minor),
    reviewDays: window?.days ?? null,
    reviewHours: window?.hours ?? null,
    requirementKeys: Array.isArray(row.requirement_keys) ? row.requirement_keys.filter((k): k is string => typeof k === "string") : [],
    startsAt,
    endsAt: text(row.ends_at),
    reason: text(row.reason) ?? "",
  };
}

/** Is a campaign live right now: active, started, and not past its end. */
export function isLive(c: CampaignView, now: number): boolean {
  return c.status === "active" && Date.parse(c.startsAt) <= now && (c.endsAt === null || Date.parse(c.endsAt) > now);
}

async function statusCounts(db: Db): Promise<StatusCounts | null> {
  const counts = emptyStatusCounts();
  const reads = await Promise.all(
    REFERRAL_STATUSES.map((status) => db.from("referrals").select("id", { count: "exact", head: true }).eq("status", status)),
  );
  for (let i = 0; i < REFERRAL_STATUSES.length; i += 1) {
    const read = reads[i]!;
    if (read.error) return null;
    counts[REFERRAL_STATUSES[i]!] = read.count ?? 0;
  }
  return counts;
}

/** The top of the desk: liability, the programme's state, the live campaign, the budget and the counts. */
export async function getReferralDesk(now: number = Date.now()): Promise<Read<ReferralDesk>> {
  const door = await doors();
  if (!door) return UNAVAILABLE;
  try {
    const [liabilityRead, programmeRead, campaignRead, budgetRead, counts] = await Promise.all([
      door.operator.rpc("admin_referral_liability"),
      door.operator.rpc("referral_programme_status"),
      door.service
        .from("referral_campaigns")
        .select("slug, kind, title, status, reward_minor, member_cap_minor, review_window, requirement_keys, starts_at, ends_at, reason")
        .order("starts_at", { ascending: false })
        .limit(20),
      door.service
        .from("referral_budget_periods")
        .select("period_month, cap_minor, committed_minor, reason")
        .order("period_month", { ascending: false })
        .limit(6),
      statusCounts(door.service),
    ]);

    const liability = liabilityRead.error ? null : parseLiability(liabilityRead.data);
    if (!liability || campaignRead.error || budgetRead.error || !counts) return UNAVAILABLE;

    const campaigns = (campaignRead.data ?? [])
      .map((r) => parseCampaign(r as Record<string, unknown>))
      .filter((c): c is CampaignView => c !== null);
    const live = campaigns.find((c) => isLive(c, now)) ?? null;
    const others = campaigns.filter((c) => c !== live);

    const status = record(programmeRead.error ? null : programmeRead.data);
    const programme = {
      open: status?.status === "open",
      reason: status?.status === "open" ? null : (text(status?.reason) ?? null),
    };

    const budgets: BudgetPeriodView[] = ((budgetRead.data ?? []) as Record<string, unknown>[]).flatMap((b) => {
      const month = text(b.period_month);
      return month ? [{ month, capMinor: integer(b.cap_minor), committedMinor: integer(b.committed_minor), reason: text(b.reason) ?? "" }] : [];
    });

    return { state: "ok", data: { liability, programme, live, others, budgets, counts } };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------------ review queue */

export type ReviewItem = {
  id: string;
  referrerId: string;
  referrerName: string | null;
  referredId: string;
  referredName: string | null;
  campaign: string | null;
  rewardMinor: number | null;
  riskScore: number;
  riskReasons: string[];
  /** Why it was routed to a person ("cluster flagged for review"). */
  reviewReason: string | null;
  qualifiedAt: string | null;
  attributedAt: string;
  /** The referrer's group score from `admin_referral_cluster_exposure`, when they have one. */
  cluster: { score: number; nonNetwork: boolean; reasons: string[]; exposureMinor: number; members: number } | null;
};

export const QUEUE_LIMIT = 100;

/** The referrals waiting on a decision, oldest first, with the signals the functions return. */
export async function getReviewQueue(): Promise<Read<{ items: ReviewItem[]; total: number }>> {
  const door = await doors();
  if (!door) return UNAVAILABLE;
  try {
    const [list, exposure] = await Promise.all([
      door.service
        .from("referrals")
        .select(
          "id, referrer_id, referred_id, campaign_id, reward_minor, risk_score, risk_reasons, review_reason, qualified_at, attributed_at",
          { count: "exact" },
        )
        .eq("status", "under_review")
        .order("qualified_at", { ascending: true, nullsFirst: false })
        .limit(QUEUE_LIMIT),
      door.operator.rpc("admin_referral_cluster_exposure", { p_limit: 500 }),
    ]);
    if (list.error || exposure.error) return UNAVAILABLE;

    const byReferrer = new Map<string, ReviewItem["cluster"]>();
    for (const e of rows(exposure.data)) {
      const id = text(e.referrer_id);
      if (id) {
        byReferrer.set(id, {
          score: integer(e.score),
          nonNetwork: e.non_network === true,
          reasons: reasonList(e.reasons),
          exposureMinor: integer(e.exposure_minor),
          members: integer(e.members),
        });
      }
    }

    const found = (list.data ?? []) as Record<string, unknown>[];
    const campaignIds = [...new Set(found.map((r) => text(r.campaign_id)).filter((x): x is string => x !== null))];
    const slugs = new Map<string, string>();
    if (campaignIds.length > 0) {
      const { data } = await door.service.from("referral_campaigns").select("id, slug").in("id", campaignIds);
      for (const c of (data ?? []) as { id: string; slug: string }[]) slugs.set(c.id, c.slug);
    }
    const names = await displayNames(door.service, found.flatMap((r) => [String(r.referrer_id), String(r.referred_id)]));

    const items: ReviewItem[] = found.map((r) => {
      const referrerId = String(r.referrer_id);
      const referredId = String(r.referred_id);
      const campaignId = text(r.campaign_id);
      return {
        id: String(r.id),
        referrerId,
        referrerName: names.get(referrerId) ?? null,
        referredId,
        referredName: names.get(referredId) ?? null,
        campaign: campaignId ? (slugs.get(campaignId) ?? null) : null,
        rewardMinor: r.reward_minor === null || r.reward_minor === undefined ? null : integer(r.reward_minor),
        riskScore: integer(r.risk_score),
        riskReasons: reasonList(r.risk_reasons),
        reviewReason: text(r.review_reason),
        qualifiedAt: text(r.qualified_at),
        attributedAt: text(r.attributed_at) ?? "",
        cluster: byReferrer.get(referrerId) ?? null,
      };
    });
    return { state: "ok", data: { items, total: list.count ?? items.length } };
  } catch {
    return UNAVAILABLE;
  }
}

/* -------------------------------------------------------------- fraud view */

export type ClusterGroup = {
  referrerId: string;
  referrerName: string | null;
  score: number;
  nonNetwork: boolean;
  reasons: string[];
  exposureMinor: number;
  members: number;
  /** Signals shared by several of their invited people: what is shared, and by how many. */
  signals: { signal: string; sharedBy: number; referredIds: string[] }[];
};

/** Groups ranked by naira exposure, each with the signals its people share. */
export async function getFraudView(): Promise<Read<{ groups: ClusterGroup[] }>> {
  const door = await doors();
  if (!door) return UNAVAILABLE;
  try {
    const [exposure, clusters] = await Promise.all([
      door.operator.rpc("admin_referral_cluster_exposure", { p_limit: 100 }),
      door.operator.rpc("admin_referral_clusters", { p_min_size: 3 }),
    ]);
    if (exposure.error || clusters.error) return UNAVAILABLE;

    const signals = new Map<string, ClusterGroup["signals"]>();
    for (const c of rows(clusters.data)) {
      const referrerId = text(c.referrer_id);
      const signal = text(c.signal);
      if (!referrerId || !signal) continue;
      const list = signals.get(referrerId) ?? [];
      list.push({
        signal,
        sharedBy: integer(c.shared_by),
        referredIds: Array.isArray(c.referred_ids) ? c.referred_ids.filter(isUuid) : [],
      });
      signals.set(referrerId, list);
    }

    const base = rows(exposure.data).flatMap((e) => {
      const referrerId = text(e.referrer_id);
      return referrerId ? [{ e, referrerId }] : [];
    });
    /* A referrer with a shared signal but no score still belongs in the view: the signal is the finding. */
    const known = new Set(base.map((b) => b.referrerId));
    const signalOnly = [...signals.keys()].filter((id) => !known.has(id));
    const names = await displayNames(door.service, [...base.map((b) => b.referrerId), ...signalOnly]);

    const groups: ClusterGroup[] = [
      ...base.map(({ e, referrerId }) => ({
        referrerId,
        referrerName: names.get(referrerId) ?? null,
        score: integer(e.score),
        nonNetwork: e.non_network === true,
        reasons: reasonList(e.reasons),
        exposureMinor: integer(e.exposure_minor),
        members: integer(e.members),
        signals: (signals.get(referrerId) ?? []).sort((a, b) => b.sharedBy - a.sharedBy),
      })),
      ...signalOnly.map((referrerId) => ({
        referrerId,
        referrerName: names.get(referrerId) ?? null,
        score: 0,
        nonNetwork: false,
        reasons: [],
        exposureMinor: 0,
        members: (signals.get(referrerId) ?? []).reduce((n, s) => Math.max(n, s.sharedBy), 0),
        signals: (signals.get(referrerId) ?? []).sort((a, b) => b.sharedBy - a.sharedBy),
      })),
    ];
    return { state: "ok", data: { groups } };
  } catch {
    return UNAVAILABLE;
  }
}

export type GraphRead = {
  edges: GraphEdge[];
  names: Record<string, string>;
};

/** Who invited whom around one member, two invitations out. */
export async function getReferralGraph(member: string, depth = 2): Promise<Read<GraphRead>> {
  if (!isUuid(member)) return UNAVAILABLE;
  const door = await doors();
  if (!door) return UNAVAILABLE;
  try {
    const read = await door.operator.rpc("admin_referral_graph", { p_member: member, p_depth: depth });
    if (read.error) return UNAVAILABLE;
    const edges: GraphEdge[] = rows(read.data).flatMap((r) => {
      const referrerId = text(r.referrer_id);
      const referredId = text(r.referred_id);
      if (!referrerId || !referredId) return [];
      return [
        {
          referrerId,
          referredId,
          status: asReferralStatus(r.status) ?? "unknown",
          riskScore: integer(r.risk_score),
          riskReasons: reasonList(r.risk_reasons),
          depth: Math.max(1, integer(r.depth)),
        },
      ];
    });
    const names = await displayNames(door.service, edges.flatMap((e) => [e.referrerId, e.referredId]));
    return { state: "ok", data: { edges, names: Object.fromEntries(names) } };
  } catch {
    return UNAVAILABLE;
  }
}

/* ----------------------------------------------------------------- payouts */

export type PayoutItem = {
  id: string;
  memberId: string;
  memberName: string | null;
  amountMinor: number;
  reference: string;
  status: PayoutStatus;
  /** The name the bank returned for the account, and its last four digits. Never the full number. */
  accountName: string;
  accountLast4: string;
  riskScore: number;
  riskReasons: string[];
  failureReason: string | null;
  createdAt: string;
  /** The payout partner has been handed the transfer. */
  transferInitiated: boolean;
  /** A recipient exists with the payout partner, which a release needs. */
  hasRecipient: boolean;
};

/** Payouts waiting on a person, and the ones in flight with the provider. */
export async function getPayoutQueue(): Promise<Read<{ waiting: PayoutItem[]; inFlight: PayoutItem[] }>> {
  const door = await doors();
  if (!door) return UNAVAILABLE;
  try {
    const read = await door.service
      .from("rewards_payouts")
      .select(
        "id, member_id, amount_minor, reference, status, account_name, account_last4, risk_score, risk_reasons, failure_reason, created_at, transfer_initiated_at, recipient_code",
      )
      .in("status", ["under_review", "processing", "sent", "unknown"])
      .order("created_at", { ascending: true })
      .limit(200);
    if (read.error) return UNAVAILABLE;
    const found = (read.data ?? []) as Record<string, unknown>[];
    const names = await displayNames(door.service, found.map((r) => String(r.member_id)));
    const items: PayoutItem[] = found.flatMap((r) => {
      const status = asPayoutStatus(r.status);
      if (!status) return [];
      const memberId = String(r.member_id);
      return [
        {
          id: String(r.id),
          memberId,
          memberName: names.get(memberId) ?? null,
          amountMinor: integer(r.amount_minor),
          reference: String(r.reference),
          status,
          accountName: text(r.account_name) ?? "",
          accountLast4: text(r.account_last4) ?? "",
          riskScore: integer(r.risk_score),
          riskReasons: reasonList(r.risk_reasons),
          failureReason: text(r.failure_reason),
          createdAt: String(r.created_at),
          transferInitiated: text(r.transfer_initiated_at) !== null,
          hasRecipient: text(r.recipient_code) !== null,
        },
      ];
    });
    return {
      state: "ok",
      data: {
        waiting: items.filter((i) => i.status === "under_review"),
        inFlight: items.filter((i) => i.status !== "under_review"),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------------- nav badges */

/** The two figures the rail badges: referrals and payouts waiting on a decision. Null when they cannot be read. */
export async function countReferralWork(db: Db): Promise<{ referrals: number; payouts: number } | null> {
  try {
    const [referrals, payouts] = await Promise.all([
      db.from("referrals").select("id", { count: "exact", head: true }).eq("status", "under_review"),
      db.from("rewards_payouts").select("id", { count: "exact", head: true }).eq("status", "under_review"),
    ]);
    if (referrals.error || payouts.error) return null;
    return { referrals: referrals.count ?? 0, payouts: payouts.count ?? 0 };
  } catch {
    return null;
  }
}

export type { ReferralStatus };
