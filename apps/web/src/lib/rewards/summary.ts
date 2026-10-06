/**
 * The Rewards Balance summary as the screens use it (D62, architecture
 * section 6). Pure.
 *
 *   Available   what the member may withdraw now
 *   Pending     qualified rewards still inside their review window (review
 *               holds are shown here too, never as an accusation)
 *   Sent        payouts on their way: "sent" until the provider's webhook
 *               confirms, then they count as paid
 *
 * No projection is ever derived here ("earn up to" is never shown).
 */

import { countOf } from "@vallo/i18n/core";

import { requirementLines } from "../referral/requirements";

export type RewardsCampaign = {
  slug: string;
  rewardMinor: number;
  memberCapMinor: number;
  requirementKeys: string[];
  /** What the person you invite has to do, in order, as the member reads it. */
  requirementLines: string[];
  reviewWindowHours: number;
};

/**
 * Whether new referrals can qualify right now (D64). Paused when the month's
 * platform budget is reached, no campaign is running, or no cap is set.
 * Everything already qualified is still honoured and paid.
 */
export type ProgrammeStatus = { status: "open" } | { status: "paused"; reason: "budget_reached" | "no_campaign" | "no_budget" };

export type RewardsSummary = {
  programme: ProgrammeStatus;
  balanceMinor: number;
  availableMinor: number;
  pendingMinor: number;
  /** When the earliest pending reward leaves its review window, if any. */
  nextAvailableAt: string | null;
  sentMinor: number;
  paidMinor: number;
  qualifiedCount: number;
  invitedCount: number;
  campaign: RewardsCampaign | null;
  withdrawalMinMinor: number | null;
  /** Off until a separate marketing-float account exists (dated policy flag). */
  payoutsEnabled: boolean;
};

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v));

function toProgramme(raw: unknown): ProgrammeStatus {
  const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (p.status === "open") return { status: "open" };
  // Anything unreadable is treated as paused: never invite on a promise
  // nobody confirmed.
  const reason = p.reason === "budget_reached" || p.reason === "no_campaign" ? p.reason : "no_budget";
  return { status: "paused", reason };
}

function toCampaign(raw: unknown): RewardsCampaign | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.slug !== "string" || num(c.reward_minor) <= 0) return null;
  const keys = Array.isArray(c.requirement_keys) ? c.requirement_keys.filter((k): k is string => typeof k === "string") : [];
  return {
    slug: c.slug,
    rewardMinor: num(c.reward_minor),
    memberCapMinor: num(c.member_cap_minor),
    requirementKeys: keys,
    requirementLines: requirementLines(keys),
    reviewWindowHours: num(c.review_window_hours),
  };
}

export function toRewardsSummary(raw: unknown): RewardsSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const balance = num(r.balance_minor);
  return {
    programme: toProgramme(r.programme),
    balanceMinor: balance,
    // What can be withdrawn never exceeds what the ledger says is owed.
    availableMinor: Math.max(0, Math.min(num(r.available_minor), balance)),
    pendingMinor: Math.max(0, num(r.pending_minor)),
    nextAvailableAt: typeof r.next_available_at === "string" ? r.next_available_at : null,
    sentMinor: Math.max(0, num(r.sent_minor)),
    paidMinor: Math.max(0, num(r.paid_minor)),
    qualifiedCount: num(r.qualified_count),
    invitedCount: num(r.invited_count),
    campaign: toCampaign(r.campaign),
    withdrawalMinMinor: numOrNull(r.withdrawal_min_minor),
    payoutsEnabled: r.payouts_enabled === true,
  };
}

/**
 * The line at the top of Invite and Earn. While paused it says so plainly and
 * does not invite; rewards already earned are still paid.
 */
export function programmeLine(s: RewardsSummary): { inviting: boolean; text: string } {
  if (s.programme.status === "open") {
    return { inviting: true, text: "Bring people to Vallo and earn rewards when they become qualified users." };
  }
  const why =
    s.programme.reason === "budget_reached"
      ? "This month's referral rewards have all been given out."
      : "Referral rewards are not running at the moment.";
  return {
    inviting: false,
    text: `${why} New invites will not earn a reward until they start again. Rewards you have already earned are still paid.`,
  };
}

/** Whether the withdraw button may be offered. */
export function canWithdraw(s: RewardsSummary): boolean {
  return s.payoutsEnabled && s.withdrawalMinMinor !== null && s.availableMinor >= s.withdrawalMinMinor && s.sentMinor === 0;
}

/** The one line "Pending" explains itself with on tap. Never mysterious. */
export function pendingExplanation(s: RewardsSummary, now: Date = new Date()): string | null {
  if (s.pendingMinor <= 0) return null;
  if (!s.nextAvailableAt) return "These rewards become available to withdraw once their review window ends.";
  const days = Math.max(1, Math.ceil((new Date(s.nextAvailableAt).getTime() - now.getTime()) / 86_400_000));
  return `Qualified rewards wait a short review window before you can withdraw them. The next one is due in about ${countOf(days, "days")}.`;
}
