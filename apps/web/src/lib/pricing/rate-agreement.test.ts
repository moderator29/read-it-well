import { describe, expect, it } from "vitest";
import { isRateAgreementRefusal, parseRateQuote } from "./rate-agreement";

const ok = {
  status: "ok",
  listing_id: "l1",
  policy_version_id: 1,
  policy_version: "2026-10-06.1",
  amount_minor: 180_000_000,
  commission_bps: 200,
  commission_minor: 3_600_000,
  net_minor: 176_400_000,
  cap_applied: false,
  accepted: false,
};

describe("parseRateQuote", () => {
  it("reads the database's figures as given, computing nothing", () => {
    const q = parseRateQuote(ok);
    expect(q).toMatchObject({ amountMinor: 180_000_000, commissionMinor: 3_600_000, netMinor: 176_400_000, policyVersionId: 1 });
  });

  it("refuses figures that do not add up", () => {
    expect(parseRateQuote({ ...ok, net_minor: 1 })).toEqual({ refused: "unavailable" });
  });

  it("refuses a missing or fractional figure", () => {
    expect(parseRateQuote({ ...ok, commission_minor: 1.5 })).toEqual({ refused: "unavailable" });
    expect(parseRateQuote({ ...ok, policy_version_id: null })).toEqual({ refused: "unavailable" });
  });

  it("passes a known refusal through and maps an unknown one to unavailable", () => {
    expect(parseRateQuote({ status: "rate_changed" })).toEqual({ refused: "rate_changed" });
    expect(parseRateQuote({ status: "who_knows" })).toEqual({ refused: "unavailable" });
    expect(parseRateQuote(null)).toEqual({ refused: "unavailable" });
  });
});

describe("isRateAgreementRefusal", () => {
  it("recognises the publish gate and nothing else", () => {
    expect(isRateAgreementRefusal({ code: "42501", message: "rate_agreement_required: the lister has not accepted" })).toBe(true);
    expect(isRateAgreementRefusal({ code: "42501", message: "payment_gate: x" })).toBe(false);
    expect(isRateAgreementRefusal({ code: "23514", message: "rate_agreement_required" })).toBe(false);
    expect(isRateAgreementRefusal(null)).toBe(false);
  });
});
