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
 * Proposed in the Session 3 C3 patch `rewards-money-copy.patch`. No product
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
 * THE PRODUCT'S SENTENCES, OR NULL UNTIL THEY EXIST IN `lib/money/copy.ts`.
 *
 * Null today: the REWARDS_* constants are proposed, not landed. Every product
 * route treats null exactly like a rewards read that is not live, because a
 * balance drawn without the sentence saying what it is (a debt, not money
 * held) is the misreading D51 exists to prevent. The follow-up patch
 * `rewards-money-wire.patch` sets this to the six constants once C2 lands them.
 */
export const REWARDS_MONEY_WORDS: RewardsMoneyWords | null = null;

/** Fill `{name}` placeholders. A placeholder with no value is left as written, so a gap shows in review rather than vanishing. */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}
