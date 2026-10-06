import { describe, expect, it } from "vitest";
import {
  acceptanceMatches,
  feeOf,
  keepMore,
  listerFeeFigures,
  parseListerFeePolicy,
  type ListerFeePolicy,
} from "./lister-fee";

/* A policy row as a test value. The rate is not a constant anywhere in the
   product; it is handed in, and this one is the founder's worked example. */
const policy: ListerFeePolicy = { rateVersion: "v-test", rail: "protected", feeBps: 400, capMinor: null };

describe("the lister's arithmetic (D51)", () => {
  it("reproduces the founder's figures to the kobo", () => {
    const figures = listerFeeFigures(1_800_000_00, policy);
    expect(figures).toEqual({
      priceMinor: 1_800_000_00,
      feeMinor: 72_000_00,
      receiveMinor: 1_728_000_00,
      feePercentText: "4",
      capped: false,
    });
  });

  it("rounds the fee down in kobo, the split's own rounding", () => {
    expect(feeOf(333, 400)).toBe(13); // 13.32 kobo
    expect(feeOf(1, 400)).toBe(0);
    expect(listerFeeFigures(333, policy)?.receiveMinor).toBe(320);
  });

  it("keeps every digit of a land price in the billions", () => {
    const figures = listerFeeFigures(8_000_000_000_00, { ...policy, feeBps: 200 });
    expect(figures?.feeMinor).toBe(160_000_000_00);
    expect(figures?.receiveMinor).toBe(7_840_000_000_00);
  });

  it("applies a cap when the rate would pass it, and says so", () => {
    const figures = listerFeeFigures(80_000_000_00, { ...policy, capMinor: 1_000_000_00 });
    expect(figures?.feeMinor).toBe(1_000_000_00);
    expect(figures?.capped).toBe(true);
  });

  it("draws nothing rather than a zero when there is no price or no policy", () => {
    expect(listerFeeFigures(null, policy)).toBeNull();
    expect(listerFeeFigures(0, policy)).toBeNull();
    expect(listerFeeFigures(1_000_00, null)).toBeNull();
    expect(listerFeeFigures(1.5, policy)).toBeNull();
  });

  it("refuses a policy that does not parse", () => {
    expect(listerFeeFigures(1_000_00, { ...policy, feeBps: 10_000 })).toBeNull();
    expect(listerFeeFigures(1_000_00, { ...policy, feeBps: 2.5 })).toBeNull();
    expect(listerFeeFigures(1_000_00, { ...policy, rateVersion: "" })).toBeNull();
  });
});

describe("the sales line: what the lister keeps against a 10 percent agent", () => {
  it("is 96 against 90 and 108,000 naira more on 1,800,000", () => {
    const figures = listerFeeFigures(1_800_000_00, policy)!;
    expect(keepMore(figures, policy)).toEqual({
      keepPercentText: "96",
      agentKeepPercentText: "90",
      agentPercentText: "10",
      moreMinor: 108_000_00,
    });
  });

  it("is not drawn when the cap set the fee, or the fee is not below the agent's", () => {
    const capped = { ...policy, capMinor: 10_000_00 };
    expect(keepMore(listerFeeFigures(1_800_000_00, capped)!, capped)).toBeNull();
    const dear = { ...policy, feeBps: 1_000 };
    expect(keepMore(listerFeeFigures(1_800_000_00, dear)!, dear)).toBeNull();
  });
});

describe("an acceptance holds only for the figures it was given", () => {
  const figures = listerFeeFigures(1_800_000_00, policy)!;
  const accepted = { rateVersion: "v-test", priceMinor: 1_800_000_00, feeMinor: 72_000_00, receiveMinor: 1_728_000_00 };

  it("matches the same price and rate version", () => {
    expect(acceptanceMatches(accepted, figures, policy)).toBe(true);
  });

  it("is voided by a price edit or a new rate version", () => {
    expect(acceptanceMatches(accepted, listerFeeFigures(1_900_000_00, policy), policy)).toBe(false);
    expect(acceptanceMatches(accepted, figures, { ...policy, rateVersion: "v-next" })).toBe(false);
    expect(acceptanceMatches(null, figures, policy)).toBe(false);
  });
});

describe("the policy read is parsed, never trusted", () => {
  it("reads a row and names the escrow rail in Vallo's word", () => {
    expect(parseListerFeePolicy([{ rate_version: 7, rail: "escrow", fee_bps: 400, cap_minor: null }])).toEqual({
      rateVersion: "7",
      rail: "protected",
      feeBps: 400,
      capMinor: null,
    });
  });

  it("answers null to anything unexpected", () => {
    expect(parseListerFeePolicy(null)).toBeNull();
    expect(parseListerFeePolicy({ rate_version: "a", rail: "payluk", fee_bps: 400 })).toBeNull();
    expect(parseListerFeePolicy({ rate_version: "a", rail: "direct", fee_bps: "400" })).toBeNull();
    expect(parseListerFeePolicy({ rate_version: "a", rail: "direct", fee_bps: 200, cap_minor: "x" })).toBeNull();
  });
});
