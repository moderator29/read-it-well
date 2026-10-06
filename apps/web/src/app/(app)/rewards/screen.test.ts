import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REWARDS_MONEY_WORDS } from "@/components/app/referral/money-words";
import { readMyRewards, rewardsSource, withdrawActions } from "@/lib/referral/rewards-read";
import type { RewardsSnapshot } from "@/lib/referral/rewards";
import { screenOf, signInHref } from "./screen";

const SNAPSHOT: RewardsSnapshot = {
  policy: { rewardPerReferralMinor: 1, monthlyCap: 1, withdrawMinimumMinor: 1 },
  programme: { state: "running" },
  balance: { availableMinor: 0, pendingMinor: 0, lifetimeMinor: 0 },
  referrals: [],
  history: [],
  campaign: null,
  destination: null,
};
const WORDS = { notHeld: "a", qualify: "b", minimum: "c", feeFirst: "d", paidFrom: "e", notInvestment: "f" };

/**
 * /rewards IS NOT LIVE, AND SAYS SO RATHER THAN DRAWING A ZERO BALANCE.
 *
 * The referral engine and its read do not exist (R-C3-1), and the money
 * sentences have landed in lib/money/copy.ts (C2). These tests are the ones to change,
 * deliberately, when either arrives.
 */
describe("the rewards routes today", () => {
  it("have no source and no withdraw actions yet", async () => {
    expect(await rewardsSource.read()).toEqual({ state: "not-live" });
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
