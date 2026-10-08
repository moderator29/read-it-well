/**
 * FIXTURE DATA FOR THE REWARDS DECK. Development only (the preview layout
 * 404s everywhere else). Every figure, name and date here is invented so the
 * referral dashboard can be judged before Session 2's read exists (R-C3-1).
 *
 *   - The policy figures follow the founder's decisions (D85: 80 naira for
 *     each friend who signs up fully, 1,500 a month, a 7-day review; D51: a
 *     1,000 naira minimum). In the product they come only from the live
 *     campaign and `referral_policy` through the server read.
 *   - The withdrawal fee is invented for the layout. In the product the fee
 *     exists only once the payout provider has prepared the withdrawal and
 *     read it back; nothing ever computes one.
 *   - The money sentences are the product's own, from `lib/money/copy.ts`.
 */
import { REWARDS_MONEY_WORDS } from "@/components/app/referral/money-words";
import type { ReferralRow, RewardsSnapshot } from "@/lib/referral/rewards";

/** A referral row's empty fields, so each fixture row names only what it is. */
const FIXTURE_ROW: Omit<ReferralRow, "id" | "firstName" | "stage" | "joinedOn"> = {
  waitingOn: null,
  qualifiedOn: null,
  reviewUntil: null,
  rewardMinor: null,
  earnedState: null,
  notEligibleReason: null,
};

export const FIXTURE_INVITE = { code: "K7M2QX", url: "https://vallospaces.com/join/K7M2QX" };

/**
 * The product's own money sentences (`lib/money/copy.ts`), never a copy of
 * them. Null would mean a constant was withdrawn; the deck then refuses to
 * draw, exactly as the product route does.
 */
export const FIXTURE_MONEY_WORDS = REWARDS_MONEY_WORDS;

export const FIXTURE_DESTINATION = { bankName: "Fixture Bank", accountLast4: "4821", accountName: "Seyi Omojuni" };

export const FIXTURE_SNAPSHOT: RewardsSnapshot = {
  policy: {
    rewardPerReferralMinor: 8_000,
    monthlyCap: 1_500,
    withdrawMinimumMinor: 100_000,
    steps: ["email_verified", "onboarding_completed"],
    reviewDays: 7,
  },
  programme: { state: "running" },
  balance: { availableMinor: 420_000, pendingMinor: 70_000, lifetimeMinor: 630_000, paidOutMinor: 210_000 },
  referrals: [
    { ...FIXTURE_ROW, id: "r1", firstName: "Amaka", stage: "earned", joinedOn: "2026-09-02", qualifiedOn: "2026-09-09", rewardMinor: 8_000, earnedState: "paid" },
    { ...FIXTURE_ROW, id: "r2", firstName: "Bayo", stage: "earned", joinedOn: "2026-09-05", qualifiedOn: "2026-09-21", rewardMinor: 8_000, earnedState: "available" },
    { ...FIXTURE_ROW, id: "r3", firstName: "Chidi", stage: "in_review", joinedOn: "2026-10-02", qualifiedOn: "2026-10-03", reviewUntil: "2026-10-10", rewardMinor: 8_000 },
    { ...FIXTURE_ROW, id: "r4", firstName: "Halima", stage: "signing_up", joinedOn: "2026-10-05", waitingOn: "email" },
    { ...FIXTURE_ROW, id: "r5", firstName: null, stage: "signing_up", joinedOn: "2026-10-06", waitingOn: "setup" },
    { ...FIXTURE_ROW, id: "r6", firstName: "Tobi", stage: "not_eligible", joinedOn: "2026-10-06", notEligibleReason: "already_rewarded" },
  ],
  history: [
    { id: "h1", kind: "referral", amountMinor: 7_000, at: "2026-09-09T10:12:00+01:00", state: "done", firstName: "Amaka", withdrawal: null },
    { id: "h2", kind: "referral", amountMinor: 7_000, at: "2026-09-21T16:40:00+01:00", state: "done", firstName: "Bayo", withdrawal: null },
    {
      id: "h3",
      kind: "withdrawal",
      amountMinor: 210_000,
      at: "2026-09-30T09:05:00+01:00",
      state: "done",
      firstName: null,
      withdrawal: { feeMinor: 5_000, bankName: "Fixture Bank", accountLast4: "4821" },
    },
    { id: "h4", kind: "bonus", amountMinor: 50_000, at: "2026-10-02T12:00:00+01:00", state: "done", firstName: null, withdrawal: null },
    {
      id: "h5",
      kind: "withdrawal",
      amountMinor: 100_000,
      at: "2026-10-05T18:22:00+01:00",
      state: "processing",
      firstName: null,
      withdrawal: { feeMinor: 5_000, bankName: "Fixture Bank", accountLast4: "4821" },
    },
  ],
  campaign: { id: "c1", name: "October invites", target: 20, reached: 12, bonusMinor: 100_000, endsOn: "2026-10-31" },
  destination: FIXTURE_DESTINATION,
  payoutsEnabled: false,
};

/**
 * D64: the same member in a month whose platform budget is reached. Every
 * earned figure, row and withdrawal is the running fixture's, untouched,
 * because a pause never reaches backwards. The resume day is invented for the
 * layout; in the product it is drawn only when the server's read gives one.
 */
export const FIXTURE_PAUSED_SNAPSHOT: RewardsSnapshot = {
  ...FIXTURE_SNAPSHOT,
  programme: { state: "paused", resumesOn: "2026-11-01" },
};

/** The invented fee the deck's fixture withdrawal reads back. Never used by the product. */
export const FIXTURE_FEE_MINOR = 5_000;
