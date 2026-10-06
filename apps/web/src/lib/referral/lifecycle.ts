/**
 * THE REFERRAL LIFECYCLE, AS THE DATABASE ENFORCES IT (D62,
 * docs/referral/REFERRAL_ARCHITECTURE.md section 2).
 *
 * The authority is `private.referral_transition_ok` in
 * `supabase/migrations/20261006154817_b4_referral_campaigns.sql`; a trigger
 * refuses any other move. This file mirrors it for the server and the screens,
 * and `lifecycle.test.ts` reads the migration and fails if the two drift.
 *
 * Three guardrails live in the database and are not configuration: a reward
 * never becomes available before its campaign's review window ends; a reward
 * is paid only after the provider's webhook; the amount is frozen at
 * qualification.
 *
 * NAMING. What a member accrues is a REWARDS BALANCE: money Vallo owes them
 * for referrals, paid out from Vallo's own marketing float. It is never called
 * a wallet, because Vallo is not holding the member's money (D48, D51).
 */

export const REFERRAL_STATUSES = [
  "attributed",
  "qualified",
  "pending",
  "under_review",
  "approved",
  "rejected",
  "available",
  "withdrawal_requested",
  "sent",
  "paid",
  "reversed",
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_TRANSITIONS: readonly (readonly [ReferralStatus, ReferralStatus])[] = [
  ["attributed", "qualified"],
  ["attributed", "reversed"],
  ["qualified", "pending"],
  ["qualified", "under_review"],
  ["qualified", "reversed"],
  ["pending", "available"],
  ["pending", "under_review"],
  ["pending", "reversed"],
  ["under_review", "approved"],
  ["under_review", "rejected"],
  ["under_review", "reversed"],
  ["approved", "available"],
  ["approved", "under_review"],
  ["approved", "reversed"],
  ["rejected", "reversed"],
  ["available", "withdrawal_requested"],
  ["available", "under_review"],
  ["available", "reversed"],
  ["withdrawal_requested", "sent"],
  ["withdrawal_requested", "available"],
  ["withdrawal_requested", "reversed"],
  ["sent", "paid"],
  ["sent", "available"],
  ["sent", "reversed"],
  ["paid", "reversed"],
];

export function isReferralStatus(value: unknown): value is ReferralStatus {
  return typeof value === "string" && (REFERRAL_STATUSES as readonly string[]).includes(value);
}

export function canMove(from: ReferralStatus, to: ReferralStatus): boolean {
  return from === to || REFERRAL_TRANSITIONS.some(([a, b]) => a === from && b === to);
}

/**
 * WHAT A MEMBER SEES. `public.my_referrals()` already answers in these words;
 * this mirrors its mapping. Under review is shown as pending (a held amount
 * with an honest line, never an accusation), and "sent" stays "sent" until the
 * webhook confirms the transfer.
 */
export const MEMBER_REFERRAL_STATUSES = ["invited", "pending", "available", "sent", "paid", "not_rewarded"] as const;
export type MemberReferralStatus = (typeof MEMBER_REFERRAL_STATUSES)[number];

export function isMemberReferralStatus(value: unknown): value is MemberReferralStatus {
  return typeof value === "string" && (MEMBER_REFERRAL_STATUSES as readonly string[]).includes(value);
}

export function memberStatusOf(status: ReferralStatus): MemberReferralStatus {
  switch (status) {
    case "attributed":
      return "invited";
    case "qualified":
    case "pending":
    case "approved":
    case "under_review":
      return "pending";
    case "available":
      return "available";
    case "withdrawal_requested":
    case "sent":
      return "sent";
    case "paid":
      return "paid";
    default:
      return "not_rewarded";
  }
}

/** The name of the thing, everywhere. Never "wallet". */
export const REWARDS_BALANCE_NAME = "Rewards Balance";
