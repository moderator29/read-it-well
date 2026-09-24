import { describe, expect, it } from "vitest";
import { classifyRisk, readRiskFactors } from "../risk-rules";

/*
 * SCUML items 8 and 15. The database hook `private.sanctions_hit_for`
 * (migrations 20260924176600 and 176700) answers true only for a confirmed
 * match or an open exact one that is not on common names only; an open fuzzy
 * match, or an open match of any kind on common names only, answers false. These
 * are the answers as the risk job reads them (the SQL side is probed with
 * the migration chain).
 */
const factors = (sanctionsHit: boolean | null) =>
  readRiskFactors({ pep: false, sanctions_hit: sanctionsHit, lister: true, identity_rung: 2, volume_90d_minor: 0, open_reports: 0, upheld_fraud: 0 })!;

describe("the sanctions factor in risk classification (SCUML items 8, 15)", () => {
  it("an open common-name or fuzzy match (hook false) does not make a person high, so nothing is gated", () => {
    expect(classifyRisk(factors(false)).riskClass).toBe("low");
  });

  it("a confirmed match (hook true) makes a person high", () => {
    expect(classifyRisk(factors(true))).toEqual({ riskClass: "high", reasons: ["sanctions_hit"] });
  });

  it("once cleared (hook false again), the next run's class is no longer high", () => {
    expect(classifyRisk(factors(true)).riskClass).toBe("high");
    expect(classifyRisk(factors(false)).riskClass).not.toBe("high");
  });

  it("never screened (hook null) is unknown, never high", () => {
    expect(classifyRisk(factors(null)).riskClass).toBe("low");
  });
});
