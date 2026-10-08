/**
 * THE REWARDS BALANCE, AS THE MEMBER'S SCREENS ARE ALLOWED TO KNOW IT
 * (founder directive D51, docs/payments/VALLO_PRICING.md section 4).
 *
 * Client safe and pure. This is the SHAPE the referral dashboard reads, written
 * down so Session 2 has one interface to fill (request R-C3-1 in
 * Session 3 C3's Round 3 report), and the small rules the screens apply
 * to it. Nothing here counts, credits or pays anything.
 *
 * WHAT IT IS, AND THE WORD THAT IS NEVER USED FOR IT. A Rewards Balance is
 * Vallo owing a member money for referrals that qualified. It is a debt, not
 * custody, so it is never called a wallet and nothing here holds a member's
 * own money. It is paid from Vallo's marketing float through Paystack
 * transfers, never from customer funds.
 *
 * WHAT IS DELIBERATELY ABSENT, so no screen can draw it:
 *   - no risk reason, fraud signal, score or check name on a referral. A
 *     referral under review says only that it is under review;
 *   - no second level: a row is a person this member invited, never anybody
 *     that person invited. There is no tree, no downline and no level;
 *   - no rate in code. Every figure (the reward, the monthly cap, the
 *     withdrawal minimum) arrives in `policy`, read from `money_policy` on the
 *     server, so changing a price is a row and never a deploy;
 *   - no fee table. A withdrawal's fee exists only once the payout provider has
 *     prepared the withdrawal and said what it costs (`WithdrawQuote`).
 *
 * Money is integer kobo throughout.
 */

/**
 * The terms in force (D51, D62, D85). Never a constant in the client: the
 * reward, the monthly count, the steps and the review window come from the
 * live campaign (`referral_campaigns`), the minimum from `referral_policy`,
 * both through `my_rewards_summary()`.
 */
export type RewardsPolicy = {
  /** Kobo added for one referral that qualifies. */
  rewardPerReferralMinor: number;
  /** Qualified referrals counted for one member in one calendar month. */
  monthlyCap: number;
  /** Kobo: the smallest withdrawal. */
  withdrawMinimumMinor: number;
  /**
   * What the invited person has to do for the referral to count: the live
   * campaign's requirement keys in its order (`lib/referral/requirements.ts`
   * says each in words). Empty when the read did not say.
   */
  steps: readonly string[];
  /** Days a qualified reward waits in review before it is Available; null when the read did not say. */
  reviewDays: number | null;
};

/**
 * Three figures, never mixed: what can be withdrawn, what is pending, and
 * everything ever earned. PENDING IS ALREADY QUALIFIED (D62's lifecycle,
 * REFERRAL_ARCHITECTURE section 2: QUALIFIED, then REWARD PENDING through the
 * campaign's review window, then AVAILABLE). It is earned and waits only to
 * become withdrawable, so a budget pause (D64) never touches it. A referral
 * that has not qualified adds nothing to any of these figures.
 */
export type RewardsBalance = {
  availableMinor: number;
  pendingMinor: number;
  lifetimeMinor: number;
  /** Kobo paid out to the member's bank and confirmed by the provider. */
  paidOutMinor: number;
};

/**
 * WHERE ONE REFERRAL STANDS (D85), in the order a referral moves through
 * them, as `public.my_referral_progress()` answers it:
 *
 *   signing_up    signed up with the link, with a step of signing up still
 *                 to do (`waitingOn` says which)
 *   counting      signed up fully and being counted, or waiting for the
 *                 month's rewards to open again (`waitingOn`)
 *   in_review     earned and frozen at its amount, inside the review window
 *                 (`reviewUntil`), or being checked by a person at Vallo
 *                 (`reviewUntil` null). Why is never said
 *   earned        Available, on its way to the bank, or paid (`earnedState`)
 *   not_eligible  will not earn, with a plain reason (`notEligibleReason`)
 */
export const REFERRAL_STAGES = ["signing_up", "counting", "in_review", "earned", "not_eligible"] as const;
export type ReferralStage = (typeof REFERRAL_STAGES)[number];

export const REFERRAL_WAITING = ["email", "setup", "phone", "other_step", "rewards_paused", "monthly_limit"] as const;
export type ReferralWaiting = (typeof REFERRAL_WAITING)[number];

export const REFERRAL_EARNED_STATES = ["available", "on_its_way", "paid"] as const;
export type ReferralEarnedState = (typeof REFERRAL_EARNED_STATES)[number];

export const REFERRAL_NOT_ELIGIBLE = ["already_rewarded", "not_approved", "reversed"] as const;
export type ReferralNotEligible = (typeof REFERRAL_NOT_ELIGIBLE)[number];

/** One person this member invited. First name at most, as the invite door already allows. */
export type ReferralRow = {
  id: string;
  /** Null when the person gave none. */
  firstName: string | null;
  stage: ReferralStage;
  /** For signing_up and counting: what it waits on. Null otherwise, and while it is being counted. */
  waitingOn: ReferralWaiting | null;
  /** YYYY-MM-DD, the day they signed up with the link. */
  joinedOn: string;
  /** YYYY-MM-DD, the day it qualified, or null. */
  qualifiedOn: string | null;
  /** YYYY-MM-DD, the end of the review window while one runs, else null. */
  reviewUntil: string | null;
  /** Kobo, frozen when it qualified; null before. */
  rewardMinor: number | null;
  earnedState: ReferralEarnedState | null;
  notEligibleReason: ReferralNotEligible | null;
};

export const REWARDS_ENTRY_KINDS = ["referral", "bonus", "withdrawal", "reversal"] as const;
export type RewardsEntryKind = (typeof REWARDS_ENTRY_KINDS)[number];

/**
 * One line of the rewards history: a transaction, read like a bank statement.
 * `amountMinor` is always positive; the kind says which way it moved.
 */
export type RewardsEntry = {
  id: string;
  kind: RewardsEntryKind;
  amountMinor: number;
  /** ISO timestamp. */
  at: string;
  /** A withdrawal is processing until the provider confirms it; nothing else is ever processing. */
  state: "done" | "processing" | "failed";
  /** For a referral line, the person's first name; null otherwise or when unknown. */
  firstName: string | null;
  /** For a withdrawal: the fee the provider read back, and where it went. */
  withdrawal: { feeMinor: number; bankName: string; accountLast4: string } | null;
};

/** A campaign bonus, when one is running: progress toward a target, never a tree. */
export type CampaignProgress = {
  id: string;
  name: string;
  /** Qualified referrals needed. */
  target: number;
  /** Qualified referrals counted toward it so far. */
  reached: number;
  bonusMinor: number;
  /** YYYY-MM-DD, a real end date, or null. Drawn as a date, never a countdown. */
  endsOn: string | null;
};

/** Where a withdrawal is paid to. */
export type PayoutDestination = { bankName: string; accountLast4: string; accountName: string };

/**
 * WHETHER NEW REFERRALS CAN QUALIFY THIS MONTH (D64, REFERRAL_ARCHITECTURE
 * section 10). The programme has one platform-wide budget a month. When the
 * rewards that qualified this month reach it, new qualification PAUSES; it
 * never refuses a referral with a reason.
 *
 *   running  as normal
 *   paused   no new referral qualifies until the budget opens again. Nothing
 *            already earned changes: a pause never reaches backwards, so the
 *            balance, the history and withdrawals are drawn exactly as before.
 *            While paused, no screen offers the invite link under a reward.
 *
 * `resumesOn` is YYYY-MM-DD only when the read itself says when new
 * qualification opens again; null when it does not. The client never works a
 * date out (not even "the first of next month"), because the founder can
 * raise the cap mid-month or wind a campaign down instead.
 */
export type RewardsProgramme = { state: "running" } | { state: "paused"; resumesOn: string | null };
export type PausedProgramme = Extract<RewardsProgramme, { state: "paused" }>;

export type RewardsSnapshot = {
  policy: RewardsPolicy;
  /** D64. Requested of Session 2 as R-R1-1. */
  programme: RewardsProgramme;
  balance: RewardsBalance;
  referrals: ReferralRow[];
  history: RewardsEntry[];
  campaign: CampaignProgress | null;
  destination: PayoutDestination | null;
  /**
   * Whether withdrawals are open (`referral_policy.payouts_enabled`, a dated
   * row). Off until Vallo's separate marketing-float account exists.
   */
  payoutsEnabled: boolean;
};

/**
 * What the server read returns.
 *
 *   not-live    the referral engine and its read do not exist yet, so there is
 *               no balance to show and the screens say so
 *   signed-out  nobody to read for
 *   failed      the read exists and did not answer
 *   ready       the snapshot
 */
export type RewardsRead =
  | { state: "not-live" }
  | { state: "signed-out" }
  | { state: "failed" }
  | { state: "ready"; snapshot: RewardsSnapshot };

/* ------------------------------------------------------------- withdrawal */

/**
 * A withdrawal the payout provider has PREPARED and priced. The fee is the
 * provider's figure read back plus Vallo's band, fixed when it was prepared;
 * the screen shows exactly these three figures and nothing computed.
 */
export type WithdrawQuote = {
  quoteId: string;
  amountMinor: number;
  feeMinor: number;
  receiveMinor: number;
  destination: PayoutDestination;
};

export type QuoteRefusal = "below-minimum" | "above-available" | "no-destination" | "unavailable";
export type QuoteResult = { ok: true; quote: WithdrawQuote } | { ok: false; reason: QuoteRefusal };

/** Confirmed means handed to the provider, which is "processing", never "paid". */
export type ConfirmResult = { ok: true } | { ok: false; reason: "expired" | "unavailable" };

/** The two calls the withdraw flow makes, provided by Session 2 (R-C3-2). */
export type WithdrawActions = {
  quote(amountMinor: number): Promise<QuoteResult>;
  confirm(quoteId: string): Promise<ConfirmResult>;
};

/* ---------------------------------------------------------------- rules */

function isKobo(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Whether an amount may be sent to be priced. Checked before the provider is
 * asked, so a member is told the minimum before anything is prepared.
 */
export type AmountCheck = "empty" | "below-minimum" | "above-available" | "ok";

export function checkWithdrawAmount(amountMinor: number | null, availableMinor: number, minimumMinor: number): AmountCheck {
  if (amountMinor === null || !isKobo(amountMinor) || amountMinor === 0) return "empty";
  if (amountMinor < minimumMinor) return "below-minimum";
  if (amountMinor > availableMinor) return "above-available";
  return "ok";
}

/** Whether a withdrawal can be started at all: the available figure reaches the minimum. */
export function canWithdraw(balance: RewardsBalance, policy: RewardsPolicy): boolean {
  return isKobo(balance.availableMinor) && isKobo(policy.withdrawMinimumMinor) && balance.availableMinor >= policy.withdrawMinimumMinor;
}

/**
 * A quote is shown only if its arithmetic is exactly what it claims: whole
 * kobo, a fee that is not negative, and the amount minus the fee equal to what
 * arrives. A quote that fails this is never drawn as a total, because a
 * figure that does not add up is an estimate dressed as a total.
 */
export function quoteAddsUp(quote: WithdrawQuote, requestedMinor: number): boolean {
  return (
    isKobo(quote.amountMinor) &&
    isKobo(quote.feeMinor) &&
    isKobo(quote.receiveMinor) &&
    quote.amountMinor === requestedMinor &&
    quote.receiveMinor > 0 &&
    quote.amountMinor - quote.feeMinor === quote.receiveMinor
  );
}

/** "1500" or "1500.5" (what `NairaField` keeps) to kobo; null when it is not a figure. */
export function nairaToKobo(plain: string): number | null {
  const match = /^(\d{1,13})(?:\.(\d{1,2}))?$/.exec(plain.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * 100 + fraction;
}

/** Counts per stage, for the referral list's summary. Every stage present, zero when none. */
export function countByStage(rows: readonly ReferralRow[]): Record<ReferralStage, number> {
  const counts = { signing_up: 0, counting: 0, in_review: 0, earned: 0, not_eligible: 0 } satisfies Record<ReferralStage, number>;
  for (const row of rows) counts[row.stage] += 1;
  return counts;
}

/** Which way an entry moved the balance. A withdrawal and a reversal take away; the rest add. */
export function entryDirection(kind: RewardsEntryKind): "in" | "out" {
  return kind === "withdrawal" || kind === "reversal" ? "out" : "in";
}

/** Newest first, and stable for entries at the same moment. */
export function newestFirst(entries: readonly RewardsEntry[]): RewardsEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry.at === b.entry.at ? a.index - b.index : a.entry.at < b.entry.at ? 1 : -1))
    .map(({ entry }) => entry);
}

/** A campaign's progress, clamped: never more reached than the target, never below zero. */
export function campaignReached(campaign: CampaignProgress): number {
  return Math.max(0, Math.min(campaign.reached, campaign.target));
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The paused programme a read carries, or null when it is running, or when
 * there is no snapshot at all (not live, signed out, failed). A `resumesOn`
 * that is not a plain day is dropped rather than drawn, so a malformed date
 * can never become a promise on screen.
 */
export function pausedProgramme(read: RewardsRead): PausedProgramme | null {
  if (read.state !== "ready") return null;
  const programme = read.snapshot.programme;
  if (programme?.state !== "paused") return null;
  return { state: "paused", resumesOn: programme.resumesOn && DAY_RE.test(programme.resumesOn) ? programme.resumesOn : null };
}

/**
 * WHAT THE INVITE HUB, HOW INVITES WORK AND THE INVITE'S FIRST RUN MAY SAY
 * ABOUT A REWARD. The gate is the one every rewards surface already uses, the
 * rewards read: there is no feature flag for rewards (no `feature_flags` key
 * names one), and a second gate would let the two disagree.
 *
 *   not-live  there is no programme: "There is no reward for inviting", as before
 *   running   the reward, written from the read's own policy figures
 *   paused    D64: the pause notice, and no invite
 *   unknown   signed out, the read failed, or a snapshot that does not say
 *             "running" with whole figures. Nothing either way: neither a
 *             reward promised nor "no reward" said about a programme that may
 *             exist.
 *
 * The four never mix: a surface draws exactly one.
 */
export type InviteRewards =
  | { state: "not-live" }
  | { state: "running"; policy: RewardsPolicy }
  | { state: "paused"; programme: PausedProgramme }
  | { state: "unknown" };

export function inviteRewards(read: RewardsRead): InviteRewards {
  if (read.state === "not-live") return { state: "not-live" };
  const paused = pausedProgramme(read);
  if (paused) return { state: "paused", programme: paused };
  if (read.state !== "ready" || read.snapshot.programme?.state !== "running") return { state: "unknown" };
  const policy = read.snapshot.policy;
  const whole =
    policy &&
    isKobo(policy.rewardPerReferralMinor) &&
    policy.rewardPerReferralMinor > 0 &&
    Number.isInteger(policy.monthlyCap) &&
    policy.monthlyCap > 0 &&
    isKobo(policy.withdrawMinimumMinor);
  return whole ? { state: "running", policy } : { state: "unknown" };
}

/**
 * Whether the withdraw screen may offer the payout form, and if not, which
 * honest state it draws instead. Order matters: withdrawals that are not open
 * (`payouts_enabled` off) are said first, because nothing the member does
 * would help; then the minimum. The bank account is asked for in the form and
 * named by the bank, never typed (`requestRewardsPayout`).
 */
export type WithdrawGate = "not-open" | "below-minimum" | "open";

export function withdrawGate(snapshot: RewardsSnapshot): WithdrawGate {
  if (!snapshot.payoutsEnabled) return "not-open";
  if (!canWithdraw(snapshot.balance, snapshot.policy)) return "below-minimum";
  return "open";
}
