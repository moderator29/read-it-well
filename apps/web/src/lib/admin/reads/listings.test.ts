import { describe, expect, it } from "vitest";
import { foldStatusCounts, latestRungs, reviewTimesFrom, roleOf } from "./listings";

const DAY = 86_400_000;

describe("listings reads: the aggregation", () => {
  it("keeps example listings apart from real ones", () => {
    const counts = foldStatusCounts([
      { status: "PUBLISHED", demo: true, count: 64 },
      { status: "PUBLISHED", demo: false, count: 0 },
      { status: "SUBMITTED", demo: false, count: 3 },
    ]);
    expect(counts.real.PUBLISHED).toBe(0);
    expect(counts.examples.PUBLISHED).toBe(64);
    expect(counts.real.SUBMITTED).toBe(3);
    expect(counts.real.DRAFT).toBe(0);
  });

  it("splits review times into this week and last, and drops resubmitted ones", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    const times = reviewTimesFrom(
      [
        { submittedAt: "2026-09-22T08:00:00Z", decidedAt: "2026-09-22T10:00:00Z" },
        { submittedAt: "2026-09-21T08:00:00Z", decidedAt: "2026-09-21T12:00:00Z" },
        { submittedAt: "2026-09-12T08:00:00Z", decidedAt: "2026-09-12T09:00:00Z" },
        /* resubmitted after the decision: not a negative time */
        { submittedAt: "2026-09-22T11:00:00Z", decidedAt: "2026-09-20T11:00:00Z" },
        { submittedAt: null, decidedAt: "2026-09-22T11:00:00Z" },
        { submittedAt: "2026-08-01T00:00:00Z", decidedAt: new Date(now - 20 * DAY).toISOString() },
      ],
      now,
    );
    expect(times.thisWeek.decisions).toBe(2);
    expect(times.thisWeek.medianMinutes).toBe(180);
    expect(times.lastWeek.decisions).toBe(1);
    expect(times.lastWeek.medianMinutes).toBe(60);
  });

  it("reports no median rather than zero when nothing was decided", () => {
    const times = reviewTimesFrom([], Date.now());
    expect(times.thisWeek).toEqual({ decisions: 0, medianMinutes: null, meanMinutes: null });
  });

  it("names the lister's role from the application, then the agent type", () => {
    expect(roleOf("owner", "business")).toBe("owner");
    expect(roleOf(null, "business")).toBe("firm");
    expect(roleOf(null, "individual")).toBe("agent");
    expect(roleOf("nonsense", null)).toBeNull();
  });

  it("keeps the latest result per rung, in ladder order", () => {
    const rungs = latestRungs([
      { kind: "payout", status: "pending", decided_at: "2026-09-01T00:00:00Z" },
      { kind: "payout", status: "passed", decided_at: "2026-09-02T00:00:00Z" },
      { kind: "identity", status: "passed", decided_at: "2026-09-01T00:00:00Z" },
      { kind: "mystery", status: "passed", decided_at: "2026-09-01T00:00:00Z" },
    ]);
    expect(rungs).toEqual([
      { kind: "identity", status: "passed" },
      { kind: "payout", status: "passed" },
    ]);
  });
});
