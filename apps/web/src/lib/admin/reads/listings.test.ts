import { describe, expect, it } from "vitest";
import { foldStatusCounts, latestRungs, mandateExpired, reviewTimesFrom, roleOf, toMandateRow } from "./listings";

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


describe("listings reads: mandates", () => {
  it("maps a mandate row and keeps the document as a yes or no", () => {
    const row = toMandateRow({
      id: "m1",
      listing_id: "l1",
      kind: "letting",
      principal_name: "Mrs Adeyemi",
      principal_phone: "+2348012345678",
      exclusive: null,
      signed_on: "2026-09-01",
      expires_on: "2027-09-01",
      document_id: null,
      review_status: "rejected",
      rejection_reason: "The letter names another address.",
      reviewed_at: "2026-09-20T10:00:00Z",
      created_at: "2026-09-19T10:00:00Z",
      listings: { title: "Three Bedroom Flat", reference: null },
    });
    expect(row.hasDocument).toBe(false);
    expect(row.exclusive).toBeNull();
    expect(row.listingTitle).toBe("Three Bedroom Flat");
    expect(row.rejectionReason).toBe("The letter names another address.");
  });

  it("knows an expired mandate by its own date", () => {
    expect(mandateExpired("2026-09-01", "2026-09-22")).toBe(true);
    expect(mandateExpired("2026-10-01", "2026-09-22")).toBe(false);
    expect(mandateExpired(null, "2026-09-22")).toBe(false);
  });
});
