/**
 * THE REFERRAL HUB'S READS: A MARKED STUB, BECAUSE THE DATA DOES NOT EXIST YET.
 *
 * What the database holds today (`20260930084741_a5_invite_codes_a_member_can_share`):
 * the member's own code (`public.referral_codes`, readable by its owner), a
 * way to look a code up (`referral_door`) and an admin-only count by code
 * (`admin_referral_counts`). There is NO function a member can call to see who
 * joined with their code, where a referral stands, or what it earned, and there
 * is no reward or ledger table at all.
 *
 * So this file returns null for everything, on purpose, and the screens draw
 * the honest state for null: no figure, no list, no invented count. The
 * contract (D19, section 2) says a screen needing new data writes the shape it
 * needs and moves on, and never invents a query. The shapes below are that
 * request, numbered R-W6-1 and R-W6-2 in the W6 report. When Session 2 lands
 * the functions, only these two bodies change; nothing in the screens does.
 */

export type ReferralStage = "joined" | "confirmed" | "qualified" | "rewarded" | "reversed";

export type ReferralRow = {
  id: string;
  /** The first word of their display name, only if they chose to be named. */
  firstName: string | null;
  /** ISO timestamp the sign-up was recorded. */
  joinedAt: string;
  stage: ReferralStage;
  /** Kobo, only once a reward exists for this referral. */
  rewardMinor: number | null;
  /** What Vallo recorded about why it stands where it does. */
  note: string | null;
};

export type ReferralSummary = {
  /** Kobo earned to date, or null when no reward has ever been recorded. */
  earnedMinor: number | null;
  /** Progress to the next reward, or null when there is none to progress to. */
  progress: { done: number; total: number } | null;
  referrals: ReferralRow[];
};

/** R-W6-1: `my_referral_summary()`. Null today. */
export async function readReferralSummary(): Promise<ReferralSummary | null> {
  return null;
}

/** R-W6-2: `my_referral(p_id uuid)`. Null today. */
export async function readReferral(_id: string): Promise<ReferralRow | null> {
  return null;
}
