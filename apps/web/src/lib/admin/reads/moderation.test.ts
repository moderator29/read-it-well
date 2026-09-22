import { describe, expect, it } from "vitest";
import { perLagosDay, responseTimes } from "./moderation";

describe("moderation reads: the aggregation", () => {
  it("counts new reports per Lagos day, oldest first", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    const days = perLagosDay(
      ["2026-09-22T01:00:00Z", "2026-09-21T23:30:00Z", "2026-09-20T09:00:00Z", "2026-09-01T00:00:00Z"],
      3,
      now,
    );
    expect(days).toEqual([1, 0, 2]);
  });

  it("takes the median response this week and last", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    const times = responseTimes(
      [
        { createdAt: "2026-09-22T09:00:00Z", resolvedAt: "2026-09-22T10:00:00Z" },
        { createdAt: "2026-09-21T09:00:00Z", resolvedAt: "2026-09-21T12:00:00Z" },
        { createdAt: "2026-09-21T09:00:00Z", resolvedAt: "2026-09-21T14:00:00Z" },
        { createdAt: "2026-09-12T09:00:00Z", resolvedAt: "2026-09-12T09:30:00Z" },
        { createdAt: "2026-09-22T09:00:00Z", resolvedAt: "2026-09-22T08:00:00Z" },
      ],
      now,
    );
    expect(times.thisWeek).toBe(180);
    expect(times.closedThisWeek).toBe(3);
    expect(times.lastWeek).toBe(30);
  });

  it("has no median when nothing closed", () => {
    expect(responseTimes([], Date.now())).toEqual({ thisWeek: null, lastWeek: null, closedThisWeek: 0 });
  });
});
