import { describe, expect, it } from "vitest";
import { LISTER_FEE_TERMS_VERSION } from "./copy";
import {
  acceptanceMatches,
  acceptanceOf,
  feeGateHoldsSend,
  feeOf,
  listerFeeFigures,
  parseListerFeePolicy,
  type ListerFeePolicy,
} from "./lister-fee";

/* Policy rows as test values. No rate is a constant anywhere in the product;
   it is handed in. These are D61's worked example: Vallo 2 percent and escrow
   protection 2 percent (VALLO_PRICING.md section 2). `noProcessor` is the
   policy D61's table assumes (the lister bears nothing else on a direct
   payment); `paystackBearer` is what the split builds today, the lister as
   the processor fee's bearer, at the 2,000 naira cap that document names. */
const noProcessor: ListerFeePolicy = {
  rateVersion: "v-test",
  valloBps: 200,
  escrowProtectionBps: 200,
  directProcessorFeeCapMinor: 0,
  capMinor: null,
};
const paystackBearer: ListerFeePolicy = { ...noProcessor, directProcessorFeeCapMinor: 2_000_00 };

describe("the lister's range, anchored on the worst case (D61)", () => {
  it("reproduces D61's screen for 1,800,000 to the kobo", () => {
    expect(listerFeeFigures(1_800_000_00, noProcessor)).toEqual({
      priceMinor: 1_800_000_00,
      valloMinor: 36_000_00,
      valloPercentText: "2",
      valloCapped: false,
      escrowProtectionMinor: 36_000_00,
      escrowProtectionPercentText: "2",
      processorUpToMinor: 0,
      platformFeeLowMinor: 36_000_00,
      platformFeeHighMinor: 72_000_00,
      receiveLowMinor: 1_728_000_00,
      receiveHighMinor: 1_764_000_00,
      escrowIsLowest: true,
    });
  });

  it("takes the processor's capped fee off the top of the range when the lister bears it", () => {
    const figures = listerFeeFigures(1_800_000_00, paystackBearer)!;
    expect(figures.receiveLowMinor).toBe(1_728_000_00);
    expect(figures.processorUpToMinor).toBe(2_000_00);
    expect(figures.receiveHighMinor).toBe(1_762_000_00);
    expect(figures.platformFeeHighMinor).toBe(72_000_00);
  });

  it("holds for 250,000", () => {
    const figures = listerFeeFigures(250_000_00, paystackBearer)!;
    expect([figures.valloMinor, figures.escrowProtectionMinor]).toEqual([5_000_00, 5_000_00]);
    expect([figures.platformFeeLowMinor, figures.platformFeeHighMinor]).toEqual([5_000_00, 10_000_00]);
    expect([figures.receiveLowMinor, figures.receiveHighMinor]).toEqual([240_000_00, 243_000_00]);
  });

  it("rounds each fee down in kobo on an amount with a remainder, and the figures still add up", () => {
    /* 333,333.33 naira: 2 percent is 666,666.66 kobo, floored to 666,666. */
    const figures = listerFeeFigures(33_333_333, paystackBearer)!;
    expect(figures.valloMinor).toBe(666_666);
    expect(figures.escrowProtectionMinor).toBe(666_666);
    expect(figures.receiveLowMinor).toBe(32_000_001);
    expect(figures.receiveHighMinor).toBe(32_466_667);
    expect(figures.receiveLowMinor + figures.valloMinor + figures.escrowProtectionMinor).toBe(33_333_333);
    expect(feeOf(333, 200)).toBe(6); // 6.66 kobo
  });

  it("names the direct rail as the worst case when a small price makes the processor's cap the larger cost", () => {
    const figures = listerFeeFigures(50_000_00, paystackBearer)!;
    expect(figures.escrowIsLowest).toBe(false);
    expect([figures.receiveLowMinor, figures.receiveHighMinor]).toEqual([47_000_00, 48_000_00]);
  });

  it("keeps every digit of a land price in the billions, and caps Vallo's share only", () => {
    const figures = listerFeeFigures(8_000_000_000_00, { ...paystackBearer, capMinor: 1_000_000_00 })!;
    expect(figures.valloMinor).toBe(1_000_000_00);
    expect(figures.valloCapped).toBe(true);
    expect(figures.escrowProtectionMinor).toBe(160_000_000_00);
    expect(figures.receiveLowMinor).toBe(8_000_000_000_00 - 1_000_000_00 - 160_000_000_00);
  });

  it("draws nothing rather than a zero when there is no price or no policy", () => {
    expect(listerFeeFigures(null, noProcessor)).toBeNull();
    expect(listerFeeFigures(0, noProcessor)).toBeNull();
    expect(listerFeeFigures(1_000_00, null)).toBeNull();
    expect(listerFeeFigures(1.5, noProcessor)).toBeNull();
  });

  it("refuses a policy that does not parse", () => {
    expect(listerFeeFigures(1_000_00, { ...noProcessor, valloBps: 10_000 })).toBeNull();
    expect(listerFeeFigures(1_000_00, { ...noProcessor, escrowProtectionBps: 2.5 })).toBeNull();
    expect(listerFeeFigures(1_000_00, { ...noProcessor, directProcessorFeeCapMinor: Number.NaN })).toBeNull();
    expect(listerFeeFigures(1_000_00, { ...noProcessor, rateVersion: "" })).toBeNull();
  });
});

describe("Send for review waits on the gate only when the blocking flag is on (D60)", () => {
  it("never waits with the flag off, accepted or not", () => {
    expect(feeGateHoldsSend(false, false)).toBe(false);
    expect(feeGateHoldsSend(false, true)).toBe(false);
  });

  it("waits with the flag on until the figures are accepted", () => {
    expect(feeGateHoldsSend(true, false)).toBe(true);
    expect(feeGateHoldsSend(true, true)).toBe(false);
  });
});

describe("an acceptance is a record of exactly what was shown", () => {
  const figures = listerFeeFigures(1_800_000_00, paystackBearer)!;
  const accepted = acceptanceOf(figures, paystackBearer);

  it("carries the terms version, both rates as numbers and every figure, including the rent entered", () => {
    expect(accepted).toEqual({
      termsVersion: LISTER_FEE_TERMS_VERSION,
      rateVersion: "v-test",
      valloBps: 200,
      escrowProtectionBps: 200,
      directProcessorFeeCapMinor: 2_000_00,
      capMinor: null,
      priceMinor: 1_800_000_00,
      valloMinor: 36_000_00,
      escrowProtectionMinor: 36_000_00,
      processorUpToMinor: 2_000_00,
      receiveLowMinor: 1_728_000_00,
      receiveHighMinor: 1_762_000_00,
    });
  });

  it("matches the same price and rate version, and is voided by a price edit, a new rate or new terms", () => {
    expect(acceptanceMatches(accepted, figures, paystackBearer)).toBe(true);
    expect(acceptanceMatches(accepted, listerFeeFigures(1_900_000_00, paystackBearer), paystackBearer)).toBe(false);
    expect(acceptanceMatches(accepted, figures, { ...paystackBearer, rateVersion: "v-next" })).toBe(false);
    expect(acceptanceMatches({ ...accepted, termsVersion: "older" }, figures, paystackBearer)).toBe(false);
    expect(acceptanceMatches(null, figures, paystackBearer)).toBe(false);
  });
});

describe("the policy read is parsed, never trusted", () => {
  it("reads both rates and the processor's cap as numbers", () => {
    expect(
      parseListerFeePolicy([
        { rate_version: 7, commission_bps: 200, escrow_protection_bps: 200, direct_processor_fee_cap_minor: "200000", cap_minor: null },
      ]),
    ).toEqual({ rateVersion: "7", valloBps: 200, escrowProtectionBps: 200, directProcessorFeeCapMinor: 2_000_00, capMinor: null });
  });

  it("answers null to anything unexpected, including the old single-rate row", () => {
    expect(parseListerFeePolicy(null)).toBeNull();
    expect(parseListerFeePolicy({ rate_version: "a", rail: "escrow", fee_bps: 400, cap_minor: null })).toBeNull();
    expect(
      parseListerFeePolicy({ rate_version: "a", commission_bps: "200", escrow_protection_bps: 200, direct_processor_fee_cap_minor: 0 }),
    ).toBeNull();
    expect(
      parseListerFeePolicy({ rate_version: "a", commission_bps: 200, escrow_protection_bps: 200, direct_processor_fee_cap_minor: null }),
    ).toBeNull();
    expect(
      parseListerFeePolicy({ rate_version: "a", commission_bps: 200, escrow_protection_bps: 200, direct_processor_fee_cap_minor: 0, cap_minor: "x" }),
    ).toBeNull();
  });
});
