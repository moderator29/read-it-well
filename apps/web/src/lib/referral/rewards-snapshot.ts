import {
  REFERRAL_EARNED_STATES,
  REFERRAL_NOT_ELIGIBLE,
  REFERRAL_STAGES,
  REFERRAL_WAITING,
  newestFirst,
  type ReferralRow,
  type RewardsEntry,
  type RewardsSnapshot,
} from "./rewards";
import { isRequirementKey } from "./requirements";

/**
 * THE MEMBER'S REWARDS, ASSEMBLED FROM WHAT THE DATABASE SAID (D85). Pure, so
 * every rule is tested without a database (`rewards-snapshot.test.ts`).
 *
 * The four reads, each answering only for the signed-in member:
 *   summary   `public.my_rewards_summary()`: the live campaign (reward,
 *             per-member cap, requirement keys, review window), the
 *             programme (open or paused), Available, Pending, paid out, the
 *             withdrawal minimum and whether withdrawals are open
 *   progress  `public.my_referral_progress()`: one row per person invited,
 *             in member words
 *   ledger    `public.rewards_ledger`, the member's own rows (RLS): what
 *             entered and left the Rewards Balance
 *   payouts   `public.rewards_payouts`, the member's own rows (RLS): the
 *             state of each withdrawal
 *
 * NOTHING IS INVENTED. A figure the read did not give is never filled in: a
 * summary that is not an object is no snapshot at all (the screens draw
 * "could not be read"), and no reward or monthly count is drawn for a
 * programme with no live campaign (it reads as paused, which says nothing
 * about an amount).
 */

type Row = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const kobo = (v: unknown): number => Math.max(0, Math.trunc(num(v)));
const isObject = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;

/** YYYY-MM-DD in Lagos for a timestamp, or null. The day a member would name. */
export function lagosDay(at: unknown): string | null {
  if (typeof at !== "string" || at === "") return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** One row of `my_referral_progress`, or null when it is not one. */
export function referralRowFrom(raw: unknown): ReferralRow | null {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const stage = oneOf(REFERRAL_STAGES, raw.stage);
  const joinedOn = lagosDay(raw.joined_at);
  if (!stage || !joinedOn) return null;
  const first = typeof raw.first_name === "string" ? raw.first_name.trim().slice(0, 40) : "";
  const reward = raw.reward_minor === null || raw.reward_minor === undefined ? null : kobo(raw.reward_minor);
  return {
    id: raw.id,
    firstName: first === "" ? null : first,
    stage,
    waitingOn: stage === "signing_up" || stage === "counting" ? oneOf(REFERRAL_WAITING, raw.waiting_on) : null,
    joinedOn,
    qualifiedOn: lagosDay(raw.qualified_at),
    reviewUntil: stage === "in_review" ? lagosDay(raw.review_until) : null,
    rewardMinor: reward !== null && reward > 0 ? reward : null,
    earnedState: stage === "earned" ? oneOf(REFERRAL_EARNED_STATES, raw.earned_state) : null,
    notEligibleReason: stage === "not_eligible" ? (oneOf(REFERRAL_NOT_ELIGIBLE, raw.not_eligible_reason) ?? "reversed") : null,
  };
}

/**
 * The ledger and the payouts as a statement, newest first.
 *   reward_earned    a referral's reward entered the balance (after its window)
 *   reward_reversed  a reward taken back
 *   payout_hold      a withdrawal, in the state its payout is in
 * `payout_release` (a failed withdrawal's money coming back) is not a line of
 * its own: the withdrawal it belongs to already reads "did not go through",
 * and two lines would count the same money twice.
 * A withdrawal carries no fee or bank name here: the member's columns do not
 * include them, and nothing is drawn that was not read.
 */
export function historyFrom(ledger: readonly unknown[], payouts: readonly unknown[], names: ReadonlyMap<string, string | null>): RewardsEntry[] {
  const payoutState = new Map<string, RewardsEntry["state"]>();
  for (const p of payouts) {
    if (!isObject(p) || typeof p.id !== "string") continue;
    payoutState.set(p.id, p.status === "paid" ? "done" : p.status === "failed" ? "failed" : "processing");
  }
  const out: RewardsEntry[] = [];
  for (const e of ledger) {
    if (!isObject(e) || typeof e.id !== "string" || typeof e.created_at !== "string") continue;
    const amount = Math.abs(Math.trunc(num(e.amount_minor)));
    if (amount === 0) continue;
    const referralId = typeof e.referral_id === "string" ? e.referral_id : null;
    if (e.kind === "reward_earned") {
      out.push({ id: e.id, kind: "referral", amountMinor: amount, at: e.created_at, state: "done", firstName: referralId ? (names.get(referralId) ?? null) : null, withdrawal: null });
    } else if (e.kind === "reward_reversed") {
      out.push({ id: e.id, kind: "reversal", amountMinor: amount, at: e.created_at, state: "done", firstName: referralId ? (names.get(referralId) ?? null) : null, withdrawal: null });
    } else if (e.kind === "payout_hold") {
      const state = typeof e.payout_id === "string" ? (payoutState.get(e.payout_id) ?? "processing") : "processing";
      out.push({ id: e.id, kind: "withdrawal", amountMinor: amount, at: e.created_at, state, firstName: null, withdrawal: null });
    }
  }
  return newestFirst(out);
}

/** Everything ever earned: rewards that entered the balance, less any taken back. Never negative. */
export function lifetimeFrom(ledger: readonly unknown[]): number {
  let total = 0;
  for (const e of ledger) {
    if (!isObject(e)) continue;
    if (e.kind === "reward_earned" || e.kind === "reward_reversed") total += Math.trunc(num(e.amount_minor));
  }
  return Math.max(0, total);
}

export function snapshotFrom(input: {
  summary: unknown;
  progress: readonly unknown[];
  ledger: readonly unknown[];
  payouts: readonly unknown[];
}): RewardsSnapshot | null {
  const s = input.summary;
  if (!isObject(s)) return null;

  const camp = isObject(s.campaign) ? s.campaign : null;
  const reward = camp ? kobo(camp.reward_minor) : 0;
  const memberCap = camp ? kobo(camp.member_cap_minor) : 0;
  const steps = camp && Array.isArray(camp.requirement_keys) ? camp.requirement_keys.filter(isRequirementKey) : [];
  const windowHours = camp ? num(camp.review_window_hours) : 0;

  const programmeRaw = isObject(s.programme) ? s.programme : {};
  /* Open only when the database says open AND a live campaign names a
     reward: never invite on a promise nobody confirmed. */
  const running = programmeRaw.status === "open" && reward > 0;

  const referrals = input.progress.map(referralRowFrom).filter((r): r is ReferralRow => r !== null);
  const names = new Map(referrals.map((r) => [r.id, r.firstName] as const));

  const balanceMinor = num(s.balance_minor);
  return {
    policy: {
      rewardPerReferralMinor: reward,
      monthlyCap: reward > 0 ? Math.floor(memberCap / reward) : 0,
      withdrawMinimumMinor: kobo(s.withdrawal_min_minor),
      steps,
      reviewDays: windowHours > 0 ? Math.round(windowHours / 24) : null,
    },
    programme: running ? { state: "running" } : { state: "paused", resumesOn: null },
    balance: {
      /* What can be withdrawn never exceeds what the ledger says is owed. */
      availableMinor: Math.max(0, Math.min(kobo(s.available_minor), Math.max(0, balanceMinor))),
      pendingMinor: kobo(s.pending_minor),
      lifetimeMinor: lifetimeFrom(input.ledger),
      paidOutMinor: kobo(s.paid_minor),
    },
    referrals,
    history: historyFrom(input.ledger, input.payouts, names),
    campaign: null,
    destination: null,
    payoutsEnabled: s.payouts_enabled === true,
  };
}
