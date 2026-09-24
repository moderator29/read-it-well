import { describe, expect, it } from "vitest";
import { agencySplit, stayCautionReleasesAt } from "./money-holds";

describe("agencySplit (V-56)", () => {
  it("pays the rest now and holds the agency fee until move-in plus 14 days", () => {
    expect(agencySplit({ totalMinor: 420_000_000, agencyMinor: 28_000_000, moveIn: "2026-11-01" })).toEqual({
      nowMinor: 392_000_000,
      heldMinor: 28_000_000,
      releasesOn: "2026-11-15",
    });
  });
  it("holds nothing without an agency fee, or when the fee is the whole charge", () => {
    expect(agencySplit({ totalMinor: 420_000_000, agencyMinor: null, moveIn: "2026-11-01" })).toBeNull();
    expect(agencySplit({ totalMinor: 100, agencyMinor: 100, moveIn: "2026-11-01" })).toBeNull();
  });
});

describe("stayCautionReleasesAt (V-92)", () => {
  it("releases 48 hours after the check-out hour, Lagos time", () => {
    expect(stayCautionReleasesAt("2026-10-17", 12)).toBe("2026-10-19T11:00:00.000Z");
  });
  it("refuses a malformed day and clamps a nonsense hour to noon", () => {
    expect(stayCautionReleasesAt("17/10/2026")).toBeNull();
    expect(stayCautionReleasesAt("2026-10-17", 99)).toBe("2026-10-19T11:00:00.000Z");
  });
});
