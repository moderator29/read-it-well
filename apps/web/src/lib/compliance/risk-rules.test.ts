import { describe, expect, it } from "vitest";
import {
  REVIEW_CLOCK_DAYS,
  VOLUME_HIGH_MINOR,
  VOLUME_REPORTABLE_MINOR,
  classifyRisk,
  readRiskFactors,
  reviewDueAt,
  type RiskFactors,
} from "./risk-rules";

/** SCUML item 15: the rules, pinned. */
const quiet: RiskFactors = {
  pep: false,
  sanctionsHit: false,
  lister: false,
  identityRung: null,
  volume90dMinor: 0,
  openReports: 0,
  upheldFraud: 0,
};

describe("classifyRisk", () => {
  it("is low for a member with nothing against them", () => {
    expect(classifyRisk(quiet)).toEqual({ riskClass: "low", reasons: [] });
  });

  it("is low for a lister whose identity rung is passed", () => {
    expect(classifyRisk({ ...quiet, lister: true, identityRung: 1 }).riskClass).toBe("low");
    expect(classifyRisk({ ...quiet, lister: true, identityRung: 4 }).riskClass).toBe("low");
  });

  it("is high for a PEP, whatever else is true", () => {
    expect(classifyRisk({ ...quiet, pep: true, lister: true, identityRung: 4 })).toEqual({
      riskClass: "high",
      reasons: ["pep"],
    });
  });

  it("is high on a sanctions hit, and an unscreened person is not a hit", () => {
    expect(classifyRisk({ ...quiet, sanctionsHit: true }).reasons).toEqual(["sanctions_hit"]);
    expect(classifyRisk({ ...quiet, sanctionsHit: null }).riskClass).toBe("low");
  });

  it("is high on any upheld fraud", () => {
    expect(classifyRisk({ ...quiet, upheldFraud: 1 }).reasons).toEqual(["upheld_fraud"]);
  });

  it("is high at ₦50m in 90 days and medium at ₦5m", () => {
    expect(classifyRisk({ ...quiet, volume90dMinor: VOLUME_HIGH_MINOR }).reasons).toEqual(["volume_very_high"]);
    expect(classifyRisk({ ...quiet, volume90dMinor: VOLUME_HIGH_MINOR - 1 }).reasons).toEqual(["volume_reportable"]);
    expect(classifyRisk({ ...quiet, volume90dMinor: VOLUME_REPORTABLE_MINOR }).riskClass).toBe("medium");
    expect(classifyRisk({ ...quiet, volume90dMinor: VOLUME_REPORTABLE_MINOR - 1 }).riskClass).toBe("low");
  });

  it("is medium for an unverified lister and for an open report", () => {
    expect(classifyRisk({ ...quiet, lister: true, identityRung: 0 }).reasons).toEqual(["lister_unverified"]);
    expect(classifyRisk({ ...quiet, lister: true, identityRung: null }).reasons).toEqual(["lister_unverified"]);
    expect(classifyRisk({ ...quiet, openReports: 2 }).reasons).toEqual(["open_reports"]);
  });

  it("names every reason at the class it lands on", () => {
    expect(classifyRisk({ ...quiet, pep: true, upheldFraud: 2 }).reasons).toEqual(["pep", "upheld_fraud"]);
    expect(
      classifyRisk({ ...quiet, lister: true, identityRung: 0, openReports: 1, volume90dMinor: VOLUME_REPORTABLE_MINOR })
        .reasons,
    ).toEqual(["lister_unverified", "open_reports", "volume_reportable"]);
  });
});

describe("reviewDueAt", () => {
  it("reviews high every 90 days, medium yearly and low every three years", () => {
    const from = new Date("2026-09-24T00:00:00Z");
    expect(REVIEW_CLOCK_DAYS.medium).toBeGreaterThan(REVIEW_CLOCK_DAYS.high);
    expect(reviewDueAt("high", from).toISOString()).toBe("2026-12-23T00:00:00.000Z");
    expect(reviewDueAt("medium", from).toISOString()).toBe("2027-09-24T00:00:00.000Z");
    expect(reviewDueAt("low", from).toISOString()).toBe("2029-09-23T00:00:00.000Z");
  });
});

describe("readRiskFactors", () => {
  it("reads the database's jsonb", () => {
    expect(
      readRiskFactors({
        pep: true,
        sanctions_hit: null,
        lister: true,
        identity_rung: 2,
        volume_90d_minor: "750000000",
        open_reports: 1,
        upheld_fraud: 0,
      }),
    ).toEqual({
      pep: true,
      sanctionsHit: null,
      lister: true,
      identityRung: 2,
      volume90dMinor: 750000000,
      openReports: 1,
      upheldFraud: 0,
    });
  });

  it("refuses a failed or malformed read rather than calling it low", () => {
    expect(readRiskFactors(null)).toBeNull();
    expect(readRiskFactors([])).toBeNull();
    expect(readRiskFactors({ lister: true })).toBeNull();
  });
});
