import { countOf, intlTag, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import {
  REWARDS_MONTHLY_BUDGET,
  REWARDS_PENDING_THEN_AVAILABLE,
  REWARDS_QUALIFY,
  REWARDS_REVIEW_WINDOW,
} from "@/lib/money/copy";
import type { RewardsPolicy } from "@/lib/referral/rewards";
import { signedUpFullySentence } from "@/lib/referral/requirements";
import { money } from "./format";
import { fill } from "./money-words";

/**
 * WHAT INVITING MEANS WHILE THE REWARDS PROGRAMME RUNS, said the same way on
 * the invite hub, How invites work and the invite's first run.
 *
 *   they get  the invite door's own claim about what Vallo does for the person
 *             invited (`publicDoors.invite.doorBody`); there is no reward for
 *             them, so none is implied
 *   earn      `REWARDS_QUALIFY`, with the reward and the monthly count from the
 *             live campaign, then what "signs up fully" means under that
 *             campaign, from its own requirement keys (D85). Never a figure
 *             or a step typed in
 *   pending   `REWARDS_REVIEW_WINDOW` with the campaign's window when the read
 *             gives it, else `REWARDS_PENDING_THEN_AVAILABLE` (D62's lifecycle)
 *   budget    `REWARDS_MONTHLY_BUDGET` (D64, one line)
 *
 * Every sentence about money is Session 2's, from `lib/money/copy.ts`; only the
 * titles are dictionary words. Called only for a running programme
 * (`inviteRewards(...).state === "running"`). Client safe and pure.
 */
export type InviteRewardLine = {
  key: "they-get" | "earn" | "pending" | "budget";
  icon: UiIconName;
  title: string;
  body: string;
};

/** The qualify sentence, filled from the policy, then what signing up fully means. */
export function qualifySentence(policy: RewardsPolicy, locale: Locale): string {
  const earn = fill(REWARDS_QUALIFY, {
    reward: money(policy.rewardPerReferralMinor, locale),
    cap: new Intl.NumberFormat(intlTag[locale]).format(policy.monthlyCap),
  });
  const fully = signedUpFullySentence(policy.steps ?? []);
  return fully ? `${earn} ${fully}` : earn;
}

/** When a reward becomes Available: the campaign's window when the read gives it. */
export function pendingSentence(policy: RewardsPolicy, locale: Locale): string {
  return policy.reviewDays && policy.reviewDays > 0
    ? fill(REWARDS_REVIEW_WINDOW, { days: countOf(policy.reviewDays, "days", locale) })
    : REWARDS_PENDING_THEN_AVAILABLE;
}

export function runningInviteLines(policy: RewardsPolicy, t: Dictionary, locale: Locale): InviteRewardLine[] {
  const c = t.experienceRewards.inviteHub;
  return [
    { key: "they-get", icon: "users", title: c.theyGetTitle, body: t.publicDoors.invite.doorBody },
    {
      key: "earn",
      icon: "hand-coins",
      title: fill(c.earnTitleAmount, { amount: money(policy.rewardPerReferralMinor, locale) }),
      body: qualifySentence(policy, locale),
    },
    { key: "pending", icon: "hourglass", title: c.pendingTitle, body: pendingSentence(policy, locale) },
    { key: "budget", icon: "calendar-clock", title: c.budgetTitle, body: REWARDS_MONTHLY_BUDGET },
  ];
}
