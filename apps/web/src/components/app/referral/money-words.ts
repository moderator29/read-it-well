import {
  REWARDS_FEE_SHOWN_FIRST,
  REWARDS_NOT_HELD,
  REWARDS_NOT_INVESTMENT,
  REWARDS_PAID_FROM,
  REWARDS_QUALIFY,
  REWARDS_WITHDRAW_MINIMUM,
} from "@/lib/money/copy";

/**
 * THE MONEY SENTENCES THE REWARDS SCREENS PLACE, AS A CONTRACT.
 *
 * Every sentence that says how rewards money moves lives in
 * `lib/money/copy.ts` (Session 2's file, C2's this round), never in a
 * component. The screens take them as this object so the product route can
 * pass the constants straight through:
 *
 *   notHeld        REWARDS_NOT_HELD
 *   qualify        REWARDS_QUALIFY            `{reward}` money, `{cap}` a number
 *   minimum        REWARDS_WITHDRAW_MINIMUM   `{minimum}` money
 *   feeFirst       REWARDS_FEE_SHOWN_FIRST
 *   paidFrom       REWARDS_PAID_FROM
 *   notInvestment  REWARDS_NOT_INVESTMENT
 *
 * Landed in `lib/money/copy.ts` from the C3 patch `rewards-money-copy.patch`. No product
 * route renders a screen that needs them until the rewards read is live.
 */
export type RewardsMoneyWords = {
  notHeld: string;
  qualify: string;
  minimum: string;
  feeFirst: string;
  paidFrom: string;
  notInvestment: string;
};

/**
 * THE PRODUCT'S SENTENCES, from `lib/money/copy.ts` (landed by C2, Round 3).
 *
 * Typed as possibly null on purpose: every product route treats null exactly
 * like a rewards read that is not live, because a balance drawn without the
 * sentence saying what it is (a debt, not money held) is the misreading D51
 * exists to prevent. If a constant is ever withdrawn, set this to null rather
 * than drawing figures without their words.
 */
export const REWARDS_MONEY_WORDS: RewardsMoneyWords | null = {
  notHeld: REWARDS_NOT_HELD,
  qualify: REWARDS_QUALIFY,
  minimum: REWARDS_WITHDRAW_MINIMUM,
  feeFirst: REWARDS_FEE_SHOWN_FIRST,
  paidFrom: REWARDS_PAID_FROM,
  notInvestment: REWARDS_NOT_INVESTMENT,
};

/** Fill `{name}` placeholders. A placeholder with no value is left as written, so a gap shows in review rather than vanishing. */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}
