import type { MoneyRail } from "./copy";
import { bpsAsPercentText } from "./percent";

/**
 * THE LISTER'S ARITHMETIC (D51, the agreement gate), as pure integer maths.
 *
 *   Rent you set            1,800,000
 *   Platform fee (4%)          72,000
 *   You receive             1,728,000
 *
 * The rate is POLICY DATA, read on the server and handed in (`ListerFeePolicy`),
 * never a constant here: changing a price is a row, not a deploy. The fee is
 * the split's own rounding, `floor(amount * bps / 10000)` in integer kobo,
 * exactly as `payment_split_for_booking` computes the commission leg, so the
 * figure the lister accepts is the figure the split takes. BigInt, so a land
 * price in the billions of kobo cannot lose a digit.
 *
 * Client-safe and pure.
 */

/** The rate in force, as the server read it. Vallo vocabulary only. */
export type ListerFeePolicy = {
  /** The policy row's version, recorded with the acceptance (D51 rule 2). */
  rateVersion: string;
  /** The rail this listing's payments open on. */
  rail: MoneyRail;
  /** The whole platform fee the lister bears, in basis points. */
  feeBps: number;
  /** An absolute cap on the fee in kobo, for the sale and land rows (D51), or null. */
  capMinor: number | null;
};

export type ListerFeeFigures = {
  priceMinor: number;
  feeMinor: number;
  receiveMinor: number;
  /** The fee as a percentage a person reads ("4", "2.5"). */
  feePercentText: string;
  /** True when the cap, not the rate, set the fee. */
  capped: boolean;
};

/** floor(amount * bps / 10000) in integer kobo. */
export function feeOf(amountMinor: number, bps: number): number {
  return Number((BigInt(amountMinor) * BigInt(bps)) / BigInt(10_000));
}

function validPolicy(policy: ListerFeePolicy): boolean {
  return (
    Number.isInteger(policy.feeBps) &&
    policy.feeBps >= 0 &&
    policy.feeBps < 10_000 &&
    (policy.capMinor === null || (Number.isInteger(policy.capMinor) && policy.capMinor >= 0)) &&
    policy.rateVersion.length > 0
  );
}

/**
 * The three figures for one price, or null when there is nothing honest to
 * show: no price yet, a price that is not whole kobo, or a policy that does
 * not parse. Null is drawn as a sentence, never as a zero.
 */
export function listerFeeFigures(priceMinor: number | null, policy: ListerFeePolicy | null): ListerFeeFigures | null {
  if (policy === null || !validPolicy(policy)) return null;
  if (priceMinor === null || !Number.isSafeInteger(priceMinor) || priceMinor <= 0) return null;
  const byRate = feeOf(priceMinor, policy.feeBps);
  const capped = policy.capMinor !== null && byRate > policy.capMinor;
  const feeMinor = capped ? (policy.capMinor as number) : byRate;
  return {
    priceMinor,
    feeMinor,
    receiveMinor: priceMinor - feeMinor,
    feePercentText: bpsAsPercentText(policy.feeBps),
    capped,
  };
}

/**
 * The market comparison in the sales line: a Nigerian agent's 10 percent,
 * paid by the renter (VALLO_PRICING.md section 8). A reference point about the
 * market, never a Vallo rate.
 */
export const AGENT_COMPARISON_BPS = 1_000;

export type KeepMore = {
  /** What the lister keeps with Vallo, as a percentage ("96"). */
  keepPercentText: string;
  /** What they keep against the agent ("90"). */
  agentKeepPercentText: string;
  agentPercentText: string;
  /** How much more they keep, in kobo. */
  moreMinor: number;
};

/**
 * "You keep 96 percent instead of 90: 108,000 more on 1,800,000." Only when
 * it is true: a capped fee keeps the rate's percentage out of the sentence,
 * and a fee at or above the agent's draws no comparison at all.
 */
export function keepMore(figures: ListerFeeFigures, policy: ListerFeePolicy): KeepMore | null {
  if (figures.capped || policy.feeBps >= AGENT_COMPARISON_BPS) return null;
  const agentFee = feeOf(figures.priceMinor, AGENT_COMPARISON_BPS);
  const moreMinor = agentFee - figures.feeMinor;
  if (moreMinor <= 0) return null;
  return {
    keepPercentText: bpsAsPercentText(10_000 - policy.feeBps),
    agentKeepPercentText: bpsAsPercentText(10_000 - AGENT_COMPARISON_BPS),
    agentPercentText: bpsAsPercentText(AGENT_COMPARISON_BPS),
    moreMinor,
  };
}

/**
 * What the lister accepted, exactly as they saw it. Sent with the publish
 * request; the server (Session 2) re-derives the figures from the rate version
 * and refuses a mismatch, then records member, timestamp and rate version.
 */
export type ListerFeeAcceptance = {
  rateVersion: string;
  priceMinor: number;
  feeMinor: number;
  receiveMinor: number;
};

/** Whether an acceptance still matches the figures on screen (a price edit voids it). */
export function acceptanceMatches(acceptance: ListerFeeAcceptance | null, figures: ListerFeeFigures | null, policy: ListerFeePolicy | null): boolean {
  if (!acceptance || !figures || !policy) return false;
  return (
    acceptance.rateVersion === policy.rateVersion &&
    acceptance.priceMinor === figures.priceMinor &&
    acceptance.feeMinor === figures.feeMinor &&
    acceptance.receiveMinor === figures.receiveMinor
  );
}

/** Parse the server's answer for the policy. Anything unexpected is null: the gate never guesses a rate. */
export function parseListerFeePolicy(value: unknown): ListerFeePolicy | null {
  const row = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | null | undefined;
  if (!row || typeof row !== "object") return null;
  /* The database says `escrow`; a member never reads that word (D50). */
  const rail: MoneyRail | null = row.rail === "escrow" ? "protected" : row.rail === "direct" ? "direct" : null;
  if (rail === null) return null;
  const capRaw = row.cap_minor;
  let capMinor: number | null = null;
  if (capRaw !== null && capRaw !== undefined) {
    const cap = Number(capRaw);
    if (!Number.isFinite(cap)) return null;
    capMinor = cap;
  }
  const version = row.rate_version;
  const policy: ListerFeePolicy = {
    rateVersion: typeof version === "string" || typeof version === "number" ? String(version) : "",
    rail,
    feeBps: typeof row.fee_bps === "number" ? row.fee_bps : Number.NaN,
    capMinor,
  };
  return validPolicy(policy) ? policy : null;
}
