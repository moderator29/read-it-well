/**
 * THE PUBLISHED FEE RULES, AS DATA (V-12).
 *
 * Kept like `lib/trust/cancellation.ts`: as data rather than as a paragraph,
 * so that the day a rule changes (the Lagos draft that would lower the agency
 * share to 5 per cent, for instance) one constant changes and every listing in
 * that state is measured against the new number in the same deploy.
 *
 * WHAT THE PRODUCT DOES WITH THESE, AND WHAT IT NEVER DOES. It prints the rule
 * beside the listing's own ratios, as a fact with its source, in the same ink
 * as the text around it. It never says a listing "breaks" a rule, never draws
 * a ratio in red, never badges a listing as fair or unfair, and never refuses
 * one. Vallo does not cap anybody's fee; it publishes it. The reader does the
 * comparison, which is the whole design. The founder has refused a cap
 * (THE_HUNDRED, "What we did not recommend", 10) and this is the reason the
 * rule is a sentence rather than a check.
 *
 * Percentages are integer basis points (PRODUCT.md: "percentages are integer
 * basis points"). 1,000 is 10.0 per cent.
 */

export type FeeRule = {
  /** `states.code`, as `listings.state_code` holds it. */
  stateCode: string;
  /** How the rule-maker names itself: "Lagos State". */
  stateName: string;
  /** The most the rule allows for the agency fee, in basis points of a year's rent. */
  agencyMaxBps: number;
  /** The most the rule allows for the legal fee, in basis points of a year's rent. */
  legalMaxBps: number;
  /** Where the rule is published, named so a reader can look it up. */
  source: string;
};

export const FEE_RULES: readonly FeeRule[] = [
  {
    stateCode: "LA",
    stateName: "Lagos State",
    agencyMaxBps: 1_000,
    legalMaxBps: 1_000,
    /*
     * THE CITATION AS THE ENTRY GIVES IT (docs/THE_HUNDRED.md, V-12). The
     * entry also said "restated May 2025" without naming who restated it or
     * where, so that part is not printed (review of batch 1): a date with no
     * instrument behind it is a claim nobody can check. The founder should
     * confirm the instrument and add its URL here before this reaches real
     * listings.
     */
    source: "Tenancy Law 2011",
  },
];

/** The rule for a state, or null where no rule is published. Null prints nothing. */
export function feeRuleFor(stateCode: string | null | undefined): FeeRule | null {
  if (!stateCode) return null;
  return FEE_RULES.find((rule) => rule.stateCode === stateCode) ?? null;
}
