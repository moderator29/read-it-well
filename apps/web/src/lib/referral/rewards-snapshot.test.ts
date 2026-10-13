import { describe, expect, it } from "vitest";
import { inviteRewards } from "./rewards";
import { historyFrom, lagosDay, lifetimeFrom, referralRowFrom, snapshotFrom } from "./rewards-snapshot";

/**
 * D85: THE MEMBER'S REWARDS, AS THE DATABASE ANSWERS THEM. The shapes below are
 * what `my_rewards_summary()` (b4_referral_campaigns) and
 * `my_referral_progress()` (pending d85_referral_signup_80_invite_and_earn)
 * return; every figure on the dashboard is one of these, never a constant.
 */
const SUMMARY = {
  balance_minor: 16_000,
  available_minor: 16_000,
  pending_minor: 8_000,
  next_available_at: "2026-10-15T10:00:00Z",
  sent_minor: 0,
  paid_minor: 0,
  qualified_count: 3,
  invited_count: 2,
  campaign: {
    slug: "signup-80",
    reward_minor: 8000,
    member_cap_minor: 12_000_000,
    requirement_keys: ["email_verified", "onboarding_completed"],
    review_window_hours: 168,
  },
  programme: { status: "open" },
  withdrawal_min_minor: 100_000,
  payouts_enabled: false,
};

const PROGRESS = [
  { id: "a", stage: "signing_up", first_name: "Ada", reward_minor: null, joined_at: "2026-10-08T08:00:00Z", qualified_at: null, review_until: null, waiting_on: "email", earned_state: null, not_eligible_reason: null },
  { id: "b", stage: "signing_up", first_name: null, reward_minor: null, joined_at: "2026-10-08T09:00:00Z", qualified_at: null, review_until: null, waiting_on: "setup", earned_state: null, not_eligible_reason: null },
  { id: "c", stage: "in_review", first_name: "Chika", reward_minor: 8000, joined_at: "2026-10-07T09:00:00Z", qualified_at: "2026-10-07T10:00:00Z", review_until: "2026-10-14T10:00:00Z", waiting_on: null, earned_state: null, not_eligible_reason: null },
  { id: "d", stage: "earned", first_name: "Dayo", reward_minor: 8000, joined_at: "2026-09-20T09:00:00Z", qualified_at: "2026-09-21T09:00:00Z", review_until: null, waiting_on: null, earned_state: "available", not_eligible_reason: null },
  { id: "e", stage: "not_eligible", first_name: "Ade", reward_minor: null, joined_at: "2026-10-01T09:00:00Z", qualified_at: null, review_until: null, waiting_on: null, earned_state: null, not_eligible_reason: "already_rewarded" },
];

const LEDGER = [
  { id: "l1", kind: "reward_earned", amount_minor: 8000, referral_id: "d", payout_id: null, created_at: "2026-09-28T09:00:00Z" },
  { id: "l2", kind: "reward_earned", amount_minor: 8000, referral_id: "x", payout_id: null, created_at: "2026-09-29T09:00:00Z" },
];

describe("the snapshot is the database's answer, assembled", () => {
  it("takes the reward, the monthly count, the steps and the window from the live campaign", () => {
    const snap = snapshotFrom({ summary: SUMMARY, progress: PROGRESS, ledger: LEDGER, payouts: [] })!;
    expect(snap.policy).toEqual({
      rewardPerReferralMinor: 8000,
      monthlyCap: 1500,
      withdrawMinimumMinor: 100_000,
      steps: ["email_verified", "onboarding_completed"],
      reviewDays: 7,
    });
    expect(snap.programme).toEqual({ state: "running" });
    expect(snap.payoutsEnabled).toBe(false);
    expect(snap.balance).toEqual({ availableMinor: 16_000, pendingMinor: 8_000, lifetimeMinor: 16_000, paidOutMinor: 0 });
    expect(inviteRewards({ state: "ready", snapshot: snap }).state).toBe("running");
  });

  it("says where each person stands, in the member's words", () => {
    const snap = snapshotFrom({ summary: SUMMARY, progress: PROGRESS, ledger: [], payouts: [] })!;
    const by = Object.fromEntries(snap.referrals.map((r) => [r.id, r]));
    expect(by.a).toMatchObject({ stage: "signing_up", waitingOn: "email", firstName: "Ada", joinedOn: "2026-10-08" });
    expect(by.b).toMatchObject({ stage: "signing_up", waitingOn: "setup", firstName: null });
    expect(by.c).toMatchObject({ stage: "in_review", reviewUntil: "2026-10-14", rewardMinor: 8000 });
    expect(by.d).toMatchObject({ stage: "earned", earnedState: "available" });
    expect(by.e).toMatchObject({ stage: "not_eligible", notEligibleReason: "already_rewarded" });
  });

  it("reads a programme with no live campaign, or a paused one, as paused, and never invents a reward", () => {
    const noCampaign = snapshotFrom({ summary: { ...SUMMARY, campaign: null, programme: { status: "paused", reason: "no_campaign" } }, progress: [], ledger: [], payouts: [] })!;
    expect(noCampaign.programme).toEqual({ state: "paused", resumesOn: null });
    expect(noCampaign.policy.rewardPerReferralMinor).toBe(0);
    const budget = snapshotFrom({ summary: { ...SUMMARY, programme: { status: "paused", reason: "budget_reached" } }, progress: [], ledger: [], payouts: [] })!;
    expect(budget.programme.state).toBe("paused");
    /* An unreadable programme is never read as open. */
    expect(snapshotFrom({ summary: { ...SUMMARY, programme: null }, progress: [], ledger: [], payouts: [] })!.programme.state).toBe("paused");
  });

  it("is no snapshot at all when the summary is not an object (a failed read, never a zero balance)", () => {
    expect(snapshotFrom({ summary: null, progress: [], ledger: [], payouts: [] })).toBeNull();
    expect(snapshotFrom({ summary: [], progress: [], ledger: [], payouts: [] })).toBeNull();
  });

  it("never draws more as Available than the ledger owes", () => {
    const snap = snapshotFrom({ summary: { ...SUMMARY, available_minor: 50_000, balance_minor: 16_000 }, progress: [], ledger: [], payouts: [] })!;
    expect(snap.balance.availableMinor).toBe(16_000);
  });

  it("drops a row it cannot read rather than drawing a guess", () => {
    expect(referralRowFrom({ id: "z", stage: "made_up", joined_at: "2026-10-01T00:00:00Z" })).toBeNull();
    expect(referralRowFrom({ id: "z", stage: "earned", joined_at: "not a date" })).toBeNull();
    expect(referralRowFrom(null)).toBeNull();
  });
});

describe("the history and the lifetime figure come from the ledger", () => {
  it("lists rewards, reversals and withdrawals in the payout's own state, newest first, with no invented fee", () => {
    const history = historyFrom(
      [
        ...LEDGER,
        { id: "l3", kind: "payout_hold", amount_minor: -16_000, referral_id: null, payout_id: "p1", created_at: "2026-10-01T09:00:00Z" },
        { id: "l4", kind: "payout_release", amount_minor: 16_000, referral_id: null, payout_id: "p1", created_at: "2026-10-02T09:00:00Z" },
        { id: "l5", kind: "reward_reversed", amount_minor: -8000, referral_id: "x", payout_id: null, created_at: "2026-10-03T09:00:00Z" },
      ],
      [{ id: "p1", status: "failed" }],
      new Map([["d", "Dayo"]]),
    );
    expect(history.map((h) => [h.id, h.kind, h.state, h.amountMinor])).toEqual([
      ["l5", "reversal", "done", 8000],
      ["l3", "withdrawal", "failed", 16_000],
      ["l2", "referral", "done", 8000],
      ["l1", "referral", "done", 8000],
    ]);
    expect(history.find((h) => h.id === "l1")?.firstName).toBe("Dayo");
    expect(history.every((h) => h.withdrawal === null)).toBe(true);
  });

  it("counts everything earned less anything taken back, never below zero", () => {
    expect(lifetimeFrom(LEDGER)).toBe(16_000);
    expect(lifetimeFrom([...LEDGER, { kind: "reward_reversed", amount_minor: -8000 }])).toBe(8000);
    expect(lifetimeFrom([{ kind: "reward_reversed", amount_minor: -8000 }])).toBe(0);
    expect(lifetimeFrom([{ kind: "payout_hold", amount_minor: -16_000 }])).toBe(0);
  });

  it("names the day in Lagos", () => {
    expect(lagosDay("2026-10-07T23:30:00Z")).toBe("2026-10-08");
    expect(lagosDay("nope")).toBeNull();
  });
});
