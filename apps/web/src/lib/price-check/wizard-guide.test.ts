import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { bpText, feeNormLine, guideFromRows, guideLines, guideRefusalFor, type GuideSubject } from "./wizard-guide";
import type { AreaAskingRow } from "./types";
import { REGULATED_WORDS } from "./regulated-words";

const copy = getDictionary("en").frontDoor.guide;

const subject: GuideSubject = {
  stateCode: "LA",
  city: "Lagos",
  area: "Yaba",
  propertyType: "apartment",
  intent: "rent",
  rentPeriod: "year",
  bedrooms: 2,
};

function row(overrides: Partial<AreaAskingRow> = {}): AreaAskingRow {
  return {
    scope: "area",
    propertyType: "apartment",
    bedrooms: 2,
    listingCount: 9,
    p25Minor: 130_000_000,
    medianMinor: 150_000_000,
    p75Minor: 180_000_000,
    sizedCount: 0,
    medianPerSqmMinor: null,
    oldestAt: "2026-03-01T00:00:00Z",
    newestAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("the wizard's asking range", () => {
  it("prints the middle half of similar listings in the area, as asking prices", () => {
    const guide = guideFromRows(subject, [row(), row({ bedrooms: 3, p25Minor: 1 })], 4);
    const lines = guideLines(subject, guide, copy, "en");
    expect(lines.headline).toBe("Similar 2 bedroom flats in this area are advertised at ₦1,300,000 to ₦1,800,000 a year.");
    expect(lines.basis).toMatch(/^9 listings on Vallo, asking prices/);
  });

  it("refuses below five similar listings and says how many it did find", () => {
    const guide = guideFromRows(subject, [row({ listingCount: 3 })], 4);
    expect(guide).toEqual({ kind: "refused", code: "too_few", count: 3 });
    expect(guideLines(subject, guide, copy, "en").basis).toMatch(/^We found 3, and a range needs at least five/);
  });

  it("never reads a failed read as too few", () => {
    expect(guideFromRows(subject, null)).toEqual({ kind: "unreachable" });
  });

  it("refuses what cannot be compared before asking anything", () => {
    expect(guideRefusalFor({ ...subject, propertyType: "land" })).toBe("unsupported_type");
    expect(guideRefusalFor({ ...subject, rentPeriod: "month" })).toBe("yearly_only");
    expect(guideRefusalFor({ ...subject, area: " " })).toBe("no_area");
    expect(guideRefusalFor({ ...subject, intent: "sale", rentPeriod: null })).toBeNull();
  });

  it("never uses a regulated word in any sentence it can print", () => {
    const text = JSON.stringify(copy).toLowerCase();
    for (const word of REGULATED_WORDS) expect(text).not.toMatch(new RegExp(`\\b${word}\\b`));
  });
});

describe("the fee lines", () => {
  const norms = { listingCount: 12, agencyCount: 12, agencyListers: 4, agencyBp: 1000, legalCount: 4, legalListers: 3, legalBp: 500, similarListers: 4 };
  it("shows the usual share only where five listings stated the fee", () => {
    expect(feeNormLine("agency", norms, copy)).toBe("Agency fees in this area are usually 10% of the yearly rent (12 listings).");
    expect(feeNormLine("legal", norms, copy)).toBeNull();
    expect(feeNormLine("agency", null, copy)).toBeNull();
  });
});

describe("review: listers and basis points", () => {
  it("refuses a range held by fewer than three listers, or when it could not count them", () => {
    expect(guideFromRows(subject, [row()], 2)).toEqual({ kind: "refused", code: "too_few", count: 9 });
    expect(guideFromRows(subject, [row()], null).kind).toBe("refused");
  });
  it("prints basis points by integer arithmetic", () => {
    expect(bpText(1000)).toBe("10");
    expect(bpText(1250)).toBe("12.5");
    expect(bpText(1255)).toBe("12.55");
    expect(bpText(505)).toBe("5.05");
  });
});
