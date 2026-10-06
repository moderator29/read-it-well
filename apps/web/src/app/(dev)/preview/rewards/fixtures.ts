/**
 * FIXTURE DATA FOR THE REWARDS DECK. Development only (the preview layout
 * 404s everywhere else). Every figure, name and date here is invented so the
 * referral dashboard can be judged before Session 2's read exists (R-C3-1).
 *
 *   - The three policy figures are the founder's D51 decisions (70 naira per
 *     qualified referral, 1,500 a month, 1,000 naira minimum). In the product
 *     they come only from `money_policy` through the server read.
 *   - The withdrawal fee is invented for the layout. In the product the fee
 *     exists only once the payout provider has prepared the withdrawal and
 *     read it back; nothing ever computes one.
 *   - MONEY_WORDS are the sentences PROPOSED to C2 for `lib/money/copy.ts` in
 *     the patch `rewards-money-copy.patch`, copied here so the deck shows the
 *     words in place. The product route never reads this file; once C2 lands
 *     the constants, this object is replaced by them.
 */
import type { RewardsMoneyWords } from "@/components/app/referral/money-words";
import type { RewardsSnapshot } from "@/lib/referral/rewards";

export const FIXTURE_INVITE = { code: "K7M2QX", url: "https://vallospaces.com/join/K7M2QX" };

export const FIXTURE_MONEY_WORDS: RewardsMoneyWords = {
  notHeld:
    "Your Rewards Balance is what Vallo owes you for referrals that qualified. It is not money held for you, and it does not expire.",
  qualify:
    "Each referral that qualifies adds {reward} to your Rewards Balance, for up to {cap} qualified referrals a month. Signing up alone does not qualify: the person must confirm their phone number and use Vallo for real.",
  minimum: "You can withdraw once your available balance reaches {minimum}.",
  feeFirst:
    "The processing fee is set by our payout partner when your withdrawal is prepared. You see it, and what you will receive, before you confirm.",
  paidFrom: "Rewards are paid from Vallo's own funds to the bank account you choose, through Paystack.",
  notInvestment:
    "Rewards are not an investment. There is nothing to pay in, and only the people you invite yourself are counted.",
};

export const FIXTURE_DESTINATION = { bankName: "Fixture Bank", accountLast4: "4821", accountName: "Seyi Omojuni" };

export const FIXTURE_SNAPSHOT: RewardsSnapshot = {
  policy: { rewardPerReferralMinor: 7_000, monthlyCap: 1_500, withdrawMinimumMinor: 100_000 },
  balance: { availableMinor: 420_000, pendingMinor: 70_000, lifetimeMinor: 630_000 },
  referrals: [
    { id: "r1", firstName: "Amaka", status: "qualified", joinedOn: "2026-09-02", qualifiedOn: "2026-09-09" },
    { id: "r2", firstName: "Bayo", status: "qualified", joinedOn: "2026-09-05", qualifiedOn: "2026-09-21" },
    { id: "r3", firstName: "Chidi", status: "under_review", joinedOn: "2026-09-28", qualifiedOn: null },
    { id: "r4", firstName: "Halima", status: "pending", joinedOn: "2026-10-01", qualifiedOn: null },
    { id: "r5", firstName: null, status: "joined", joinedOn: "2026-10-05", qualifiedOn: null },
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
};

/** The invented fee the deck's fixture withdrawal reads back. Never used by the product. */
export const FIXTURE_FEE_MINOR = 5_000;
