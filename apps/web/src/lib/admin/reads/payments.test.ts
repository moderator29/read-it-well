import { describe, expect, it } from "vitest";
import { buildPayments, channelLabel, outcomeOf, type PaymentAttempt } from "./payments";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const DAY = 86_400_000;
const a = (id: string, outcome: PaymentAttempt["outcome"], daysAgo: number, over: Partial<PaymentAttempt> = {}): PaymentAttempt => ({
  id,
  kind: "checkout",
  reference: `ref-${id}`,
  channel: "card",
  provider: null,
  outcome,
  amountMinor: 100_000,
  bookingId: null,
  createdAt: new Date(NOW - daysAgo * DAY).toISOString(),
  ...over,
});

describe("outcomeOf", () => {
  it("names every status and splits pending by age", () => {
    expect(outcomeOf("SUCCESSFUL", "", NOW)).toBe("succeeded");
    expect(outcomeOf("COMPLETED", "", NOW)).toBe("succeeded");
    expect(outcomeOf("FAILED", "", NOW)).toBe("failed");
    expect(outcomeOf("REVERSED", "", NOW)).toBe("failed");
    expect(outcomeOf("REFUNDED", "", NOW)).toBe("refunded");
    expect(outcomeOf("PENDING", new Date(NOW - 3_600_000).toISOString(), NOW)).toBe("initialised");
    expect(outcomeOf("PENDING", new Date(NOW - 2 * DAY).toISOString(), NOW)).toBe("abandoned");
  });
});

describe("buildPayments", () => {
  const attempts = [
    a("1", "succeeded", 1),
    a("2", "failed", 2, { channel: "bank" }),
    a("3", "abandoned", 3),
    a("4", "succeeded", 9, { channel: null }),
    a("5", "succeeded", 40),
  ];
  const desk = buildPayments(attempts, { page: 1, pageSize: 10 }, NOW);

  it("tallies this week against last week by outcome", () => {
    expect(desk.week.thisWeek).toEqual({ started: 3, initialised: 0, succeeded: 1, failed: 1, abandoned: 1, refunded: 0 });
    expect(desk.week.lastWeek.started).toBe(1);
    expect(desk.week.lastWeek.succeeded).toBe(1);
  });
  it("keeps the thirty day window for the bar and the channels", () => {
    expect(desk.last30.succeeded).toBe(2);
    expect(desk.byChannel).toEqual([
      { channel: "card", attempts: 2, succeeded: 1, succeededMinor: 100_000 },
      { channel: "bank", attempts: 1, succeeded: 0, succeededMinor: 0 },
      { channel: "checkout, unrecorded", attempts: 1, succeeded: 1, succeededMinor: 100_000 },
    ]);
  });
  it("sums succeeded money per day over thirty days", () => {
    expect(desk.perDay).toHaveLength(30);
    expect(desk.perDay.reduce((s, d) => s + d.amountMinor, 0)).toBe(200_000);
  });
  it("filters by outcome and pages every attempt", () => {
    expect(buildPayments(attempts, { outcome: "succeeded", page: 1, pageSize: 10 }, NOW).table.total).toBe(3);
    expect(buildPayments(attempts, { page: 1, pageSize: 2 }, NOW).table.rows.map((r) => r.id)).toEqual(["1", "2"]);
  });
  it("never invents a channel", () => {
    expect(channelLabel({ kind: "checkout", channel: null })).toBe("checkout, unrecorded");
  });
});
