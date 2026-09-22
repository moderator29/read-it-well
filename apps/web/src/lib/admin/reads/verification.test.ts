import { describe, expect, it } from "vitest";
import { decisionTimes, lagosDay, supplyRoleOf } from "./verification";

describe("verification reads: the aggregation", () => {
  it("finds the start of the Lagos day", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    expect(lagosDay(now)).toBe("2026-09-21T23:00:00.000Z");
    expect(lagosDay(now, -1)).toBe("2026-09-20T23:00:00.000Z");
    /* 23:30 UTC is already tomorrow in Lagos. */
    expect(lagosDay(Date.parse("2026-09-22T23:30:00Z"))).toBe("2026-09-22T23:00:00.000Z");
  });

  it("takes the median upload-to-decision time per week", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    const times = decisionTimes(
      [
        { uploadedAt: "2026-09-22T08:00:00Z", reviewedAt: "2026-09-22T09:00:00Z" },
        { uploadedAt: "2026-09-22T08:00:00Z", reviewedAt: "2026-09-22T11:00:00Z" },
        { uploadedAt: "2026-09-13T08:00:00Z", reviewedAt: "2026-09-13T08:10:00Z" },
      ],
      now,
    );
    expect(times).toEqual({ thisWeek: 120, lastWeek: 10, count: 2 });
  });

  it("reads the supply role the same way the listings desk does", () => {
    expect(supplyRoleOf("firm", "individual")).toBe("firm");
    expect(supplyRoleOf(null, "business")).toBe("firm");
    expect(supplyRoleOf(null, null)).toBeNull();
  });
});
