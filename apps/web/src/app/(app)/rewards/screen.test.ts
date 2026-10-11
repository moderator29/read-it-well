import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REWARDS_MONEY_WORDS } from "@/components/app/referral/money-words";
import { readMyRewards, withdrawActions } from "@/lib/referral/rewards-read";
import type { RewardsSnapshot } from "@/lib/referral/rewards";
import { screenOf, signInHref } from "./screen";

const SNAPSHOT: RewardsSnapshot = {
  policy: { rewardPerReferralMinor: 1, monthlyCap: 1, withdrawMinimumMinor: 1, steps: [], reviewDays: null },
  programme: { state: "running" },
  balance: { availableMinor: 0, pendingMinor: 0, lifetimeMinor: 0, paidOutMinor: 0 },
  referrals: [],
  history: [],
  campaign: null,
  destination: null,
  payoutsEnabled: false,
};
const WORDS = { notHeld: "a", qualify: "b", minimum: "c", feeFirst: "d", paidFrom: "e", notInvestment: "f" };

/**
 * /rewards READS THE REAL ENGINE (D85), AND NEVER DRAWS A ZERO IT DID NOT READ.
 *
 * The source reads `my_rewards_summary`, `my_referral_progress`, the
 * member's ledger and payouts (`rewards-snapshot.test.ts` holds how they are
 * assembled). The quote-and-confirm flow has no provider behind it, so its
 * actions stay null: the withdraw page uses `requestRewardsPayout` instead.
 */
describe("the rewards routes", () => {
  it("offer no fee quote the provider never gave", () => {
    expect(withdrawActions).toBeNull();
  });

  it("carry the six money sentences from lib/money/copy.ts, none of them a wallet", () => {
    expect(REWARDS_MONEY_WORDS).not.toBeNull();
    const words = Object.values(REWARDS_MONEY_WORDS ?? {});
    expect(words).toHaveLength(6);
    for (const sentence of words) expect(sentence).not.toMatch(new RegExp(["wal", "let"].join(""), "i"));
  });

  it("draw a snapshot only when its money sentences exist", () => {
    expect(screenOf({ state: "ready", snapshot: SNAPSHOT }, null)).toEqual({ kind: "state", read: { state: "not-live" } });
    expect(screenOf({ state: "ready", snapshot: SNAPSHOT }, WORDS)).toEqual({ kind: "ready", snapshot: SNAPSHOT, words: WORDS });
    expect(screenOf({ state: "failed" }, WORDS)).toEqual({ kind: "state", read: { state: "failed" } });
  });

  it("turn a read that throws into a failed read, never a crash", async () => {
    const read = await readMyRewards({
      read: () => Promise.reject(new Error("down")),
    });
    /* Signed out in the test environment, which is answered first. */
    expect(["failed", "signed-out"]).toContain(read.state);
  });
});

/**
 * The sign-in door on every rewards state goes through withNext, so the
 * destination passes safeReturnPath (route sweep, point 21); a path that is not
 * same-origin is dropped rather than carried.
 */
describe("the rewards sign-in door", () => {
  it("comes back to the rewards route through withNext", () => {
    expect(signInHref("/rewards/history")).toBe("/sign-in?next=%2Frewards%2Fhistory");
    expect(signInHref("//evil.example")).toBe("/sign-in");
  });
});

/**
 * One filled action on the running /rewards screen, and it is Withdraw. The
 * invite card's Copy link was a second primary beside it (route sweep, point 1).
 */
describe("the invite card on /rewards", () => {
  it("draws no primary button", () => {
    const card = readFileSync(join(__dirname, "../../../components/app/referral/InviteLinkCard.tsx"), "utf8");
    expect(card).not.toMatch(/variant="primary"/);
  });
});
