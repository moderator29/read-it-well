/**
 * THE REFERRAL LIFECYCLE, AS THE DATABASE ENFORCES IT (D51).
 *
 * The authority is `private.referral_transition_ok` in
 * `supabase/migrations/pending/b4_referral_rewards_engine.sql`; a trigger
 * refuses any other move. This file mirrors it for the server and the screens,
 * and `lifecycle.test.ts` reads the migration and fails if the two drift.
 *
 * NAMING. What a member accrues is a REWARDS BALANCE: money Vallo owes them
 * for referrals, paid out from Vallo's own marketing float. It is never a
 * wallet, because Vallo is not holding the member's money (D48, D51).
 */

export const REFERRAL_STATUSES = [
  "pending",
  "qualified",
  "under_review",
  "approved",
  "available",
  "processing",
  "paid",
  "reversed",
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_TRANSITIONS: readonly (readonly [ReferralStatus, ReferralStatus])[] = [
  ["pending", "qualified"],
  ["pending", "reversed"],
  ["qualified", "approved"],
  ["qualified", "under_review"],
  ["qualified", "reversed"],
  ["under_review", "approved"],
  ["under_review", "reversed"],
  ["approved", "available"],
  ["approved", "under_review"],
  ["approved", "reversed"],
  ["available", "processing"],
  ["available", "reversed"],
  ["available", "under_review"],
  ["processing", "paid"],
  ["processing", "available"],
  ["processing", "reversed"],
  ["paid", "reversed"],
];

export function isReferralStatus(value: unknown): value is ReferralStatus {
  return typeof value === "string" && (REFERRAL_STATUSES as readonly string[]).includes(value);
}

export function canMove(from: ReferralStatus, to: ReferralStatus): boolean {
  return from === to || REFERRAL_TRANSITIONS.some(([a, b]) => a === from && b === to);
}

/** The name of the thing, everywhere. Never "wallet". */
export const REWARDS_BALANCE_NAME = "Rewards Balance";

/**
 * WHAT COUNTS AS A REAL ACTION. A referral qualifies when the referred member
 * has BOTH confirmed a phone number AND had a payment settle: a
 * `public.transactions` row reaching SUCCESSFUL with a positive amount, paid
 * by them (as the booking's guest, or as a share payer). A sign-up, a profile,
 * a saved listing or a message never qualifies: each costs less than the
 * reward to fake. A refund or chargeback of that payment reverses it.
 */
export const QUALIFYING_ACTION = "settled_payment" as const;
