import { describe, expect, it } from "vitest";
import { FEE_TERMS_VERSION, acceptFeeTermsArgs, needsFeeAcceptance, parseFeeTermsQuote } from "./fee-acceptance";

// D61's worked example: 1,800,000 naira, Vallo 2% + escrow protection 2%.
const ok = {
  status: "ok",
  listing_id: "l1",
  policy_version_id: 1,
  policy_version: "2026-10-06.1",
  protection_rate_id: 1,
  commission_bps: 200,
  protection_bps: 200,
  rent_minor: 180_000_000,
  commission_minor: 3_600_000,
  protection_minor: 3_600_000,
  fee_low_minor: 3_600_000,
  fee_high_minor: 7_200_000,
  receive_low_minor: 172_800_000,
  receive_high_minor: 176_400_000,
  cap_applied: false,
  accepted: true,
  accepted_terms_version: FEE_TERMS_VERSION,
  acceptance_id: "a1",
};

describe("parseFeeTermsQuote", () => {
  it("reads the worst-case-anchored range as given", () => {
    expect(parseFeeTermsQuote(ok)).toMatchObject({
      rentMinor: 180_000_000,
      feeLowMinor: 3_600_000,
      feeHighMinor: 7_200_000,
      receiveLowMinor: 172_800_000,
      receiveHighMinor: 176_400_000,
    });
  });

  it("refuses figures that do not add up, including the retired 96-percent figure", () => {
    expect(parseFeeTermsQuote({ ...ok, receive_high_minor: 172_800_000 })).toEqual({ refused: "unavailable" });
    expect(parseFeeTermsQuote({ ...ok, fee_high_minor: 3_600_000 })).toEqual({ refused: "unavailable" });
    expect(parseFeeTermsQuote({ ...ok, rent_minor: 0 })).toEqual({ refused: "unavailable" });
  });

  it("refuses a missing, negative or fractional figure", () => {
    expect(parseFeeTermsQuote({ ...ok, protection_bps: null })).toEqual({ refused: "unavailable" });
    expect(parseFeeTermsQuote({ ...ok, fee_low_minor: 1.5 })).toEqual({ refused: "unavailable" });
    expect(parseFeeTermsQuote({ ...ok, protection_minor: -1 })).toEqual({ refused: "unavailable" });
  });

  it("passes a known refusal through and maps an unknown one to unavailable", () => {
    expect(parseFeeTermsQuote({ status: "figures_mismatch" })).toEqual({ refused: "figures_mismatch" });
    expect(parseFeeTermsQuote({ status: "nope" })).toEqual({ refused: "unavailable" });
    expect(parseFeeTermsQuote(undefined)).toEqual({ refused: "unavailable" });
  });
});

describe("needsFeeAcceptance", () => {
  const q = parseFeeTermsQuote(ok);
  if ("refused" in q) throw new Error("fixture");
  it("is false only when the latest record covers these figures and this terms text", () => {
    expect(needsFeeAcceptance(q)).toBe(false);
    expect(needsFeeAcceptance({ ...q, accepted: false })).toBe(true);
    expect(needsFeeAcceptance(q, "2027-01-01")).toBe(true);
    expect(needsFeeAcceptance({ ...q, acceptedTermsVersion: null })).toBe(true);
  });

  it("sends back exactly the figures shown", () => {
    expect(acceptFeeTermsArgs(q)).toEqual({
      p_listing: "l1",
      p_terms_version: FEE_TERMS_VERSION,
      p_policy_version: 1,
      p_protection_rate: 1,
      p_rent_minor: 180_000_000,
      p_fee_low_minor: 3_600_000,
      p_fee_high_minor: 7_200_000,
      p_receive_low_minor: 172_800_000,
      p_receive_high_minor: 176_400_000,
    });
  });
});
