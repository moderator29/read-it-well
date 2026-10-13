import "server-only";

import { REWARDS_MONEY_WORDS, type RewardsMoneyWords } from "@/components/app/referral/money-words";
import type { RewardsRead, RewardsSnapshot } from "@/lib/referral/rewards";
import { readMyRewards } from "@/lib/referral/rewards-read";
import { withNext } from "@/lib/auth/next-link";

/**
 * What a rewards route may draw: the snapshot together with the money
 * sentences that explain it, or a state. A snapshot without its sentences is
 * drawn as not live, never as bare figures (see `REWARDS_MONEY_WORDS`).
 */
export type RewardsScreen =
  | { kind: "ready"; snapshot: RewardsSnapshot; words: RewardsMoneyWords }
  | { kind: "state"; read: Exclude<RewardsRead, { state: "ready" }> };

export function screenOf(read: RewardsRead, words: RewardsMoneyWords | null): RewardsScreen {
  if (read.state !== "ready") return { kind: "state", read };
  if (!words) return { kind: "state", read: { state: "not-live" } };
  return { kind: "ready", snapshot: read.snapshot, words };
}

export async function rewardsScreen(): Promise<RewardsScreen> {
  return screenOf(await readMyRewards(), REWARDS_MONEY_WORDS);
}

export const REWARDS_HREFS = {
  referrals: "/rewards/referrals",
  history: "/rewards/history",
  withdraw: "/rewards/withdraw",
} as const;

/** Where the states send a member: sign-in coming back here, and the invite link that works today. */
export function signInHref(path: string): string {
  return withNext("/sign-in", path);
}
export const INVITE_HREF = "/settings/invite";
