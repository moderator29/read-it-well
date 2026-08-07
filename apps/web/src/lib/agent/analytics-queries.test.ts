import { describe, expect, it } from "vitest";
import {
  MAX_TREND_MONTHS,
  medianHours,
  settledSeries,
  summariseRequests,
  type RequestInput,
} from "./analytics-queries";
import type { EarningsMonth } from "./earnings-queries";

/**
 * The arithmetic behind /agent/analytics, proved against a fixed clock.
 *
 * Almost everything on this platform is proved by a Playwright spec against a
 * running server, and that stays the rule. These three functions are the
 * exception the vitest config was written for: their whole job is to decide
 * what a set of rows means, they take no database and no browser, and two of
 * the three answers depend on what time it is. A browser spec could only reach
 * them through a screen that needs a signed-in agent with a settled ledger, and
 * would then be unable to move the clock to the far side of the hold window,
 * which is exactly the boundary most worth pinning down.
 *
 * The point being defended here is honesty rather than correctness in the
 * ordinary sense. Every case below asks whether the function invents anything:
 * a gap month that never happened, a median that no request ever waited, a
 * lapsed request quietly counted as still waiting on somebody.
 */

const HOUR = 3_600_000;

/** A fixed instant, so "48 hours ago" means one thing in every assertion. */
const NOW = Date.parse("2026-08-07T12:00:00Z");

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * HOUR).toISOString();
}

function request(status: RequestInput["status"], hours: number): RequestInput {
  return { status, createdAt: hoursAgo(hours) };
}

function month(key: string, agentShareMinor: number): EarningsMonth {
  const [year, monthPart] = key.split("-");
  return {
    key,
    year: Number(year),
    month: Number(monthPart),
    grossMinor: agentShareMinor,
    agentShareMinor,
    platformShareMinor: 0,
    processorMinor: 0,
    netSettlementMinor: agentShareMinor,
    stays: 1,
  };
}

describe("medianHours", () => {
  it("has no answer for an empty set rather than a zero", () => {
    expect(medianHours([])).toBeNull();
  });

  it("returns the single observation when there is only one", () => {
    expect(medianHours([9])).toBe(9);
  });

  it("takes the middle value of an odd set", () => {
    expect(medianHours([40, 1, 6])).toBe(6);
  });

  it("takes the lower of the two middles rather than averaging them", () => {
    // The mean of 4 and 5 is 4.5, which no request ever waited. The lower
    // middle is a real observation, and that is the whole rule.
    expect(medianHours([1, 4, 5, 90])).toBe(4);
  });

  it("is not dragged by a single very slow answer", () => {
    expect(medianHours([1, 1, 2, 2, 500])).toBe(2);
  });
});

describe("summariseRequests", () => {
  it("counts nothing at all from nothing at all", () => {
    const summary = summariseRequests([], [], NOW);
    expect(summary).toEqual({
      received: 0,
      confirmed: 0,
      cancelled: 0,
      waiting: 0,
      lapsed: 0,
      answered: 0,
      medianAnswerHours: null,
      answerTimingReadable: true,
    });
  });

  it("puts every request in exactly one bucket", () => {
    const summary = summariseRequests(
      [
        request("CONFIRMED", 300),
        request("CONFIRMED", 10),
        request("CANCELLED", 100),
        request("PENDING", 2),
        request("PENDING", 200),
      ],
      [],
      NOW,
    );
    expect(summary.received).toBe(5);
    expect(summary.confirmed + summary.cancelled + summary.waiting + summary.lapsed).toBe(5);
    expect(summary.confirmed).toBe(2);
    expect(summary.cancelled).toBe(1);
    expect(summary.waiting).toBe(1);
    expect(summary.lapsed).toBe(1);
  });

  it("treats a request at exactly the hold window as lapsed, not as waiting", () => {
    // 48 hours is where private.release_stale_booking_holds would cancel it,
    // so the screen must not still be telling the host it is theirs to answer.
    expect(summariseRequests([request("PENDING", 48)], [], NOW).lapsed).toBe(1);
    expect(summariseRequests([request("PENDING", 47)], [], NOW).waiting).toBe(1);
  });

  it("never lets a cancelled or confirmed request lapse", () => {
    const summary = summariseRequests(
      [request("CONFIRMED", 5000), request("CANCELLED", 5000)],
      [],
      NOW,
    );
    expect(summary.lapsed).toBe(0);
  });

  it("reports the sample size behind the median alongside it", () => {
    const summary = summariseRequests([request("CONFIRMED", 10)], [2, 6, 30], NOW);
    expect(summary.answered).toBe(3);
    expect(summary.medianAnswerHours).toBe(6);
  });

  it("has no answer time when the host has answered nothing", () => {
    const summary = summariseRequests([request("PENDING", 1)], [], NOW);
    expect(summary.answered).toBe(0);
    expect(summary.medianAnswerHours).toBeNull();
    expect(summary.answerTimingReadable).toBe(true);
  });

  it("separates an unreadable history from a host who has answered nothing", () => {
    // Both come back with no median. Only the flag tells the screen which
    // sentence to print, and printing the wrong one accuses a host of
    // ignoring guests during an outage.
    const unreadable = summariseRequests([request("CONFIRMED", 10)], null, NOW);
    expect(unreadable.answerTimingReadable).toBe(false);
    expect(unreadable.medianAnswerHours).toBeNull();
    expect(unreadable.answered).toBe(0);

    // The rest of the buckets are unaffected: the bookings read succeeded.
    expect(unreadable.received).toBe(1);
    expect(unreadable.confirmed).toBe(1);
  });
});

describe("settledSeries", () => {
  it("draws nothing when nothing has settled", () => {
    expect(settledSeries([], "2026-08")).toEqual([]);
  });

  it("draws a quiet month at zero rather than dropping it", () => {
    // June settled, July settled nothing, August settled. Dropping July would
    // compress the axis and turn a flat stretch into a smooth climb.
    const series = settledSeries([month("2026-06", 500_000), month("2026-08", 900_000)], "2026-08");
    expect(series.map((point) => point.key)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(series.map((point) => point.agentShareMinor)).toEqual([500_000, 0, 900_000]);
  });

  it("never starts before the first month that actually settled", () => {
    // Padding backwards to fill the chart would claim this host was here and
    // earning nothing in months during which they had not joined.
    const series = settledSeries([month("2026-08", 100)], "2026-08");
    expect(series).toHaveLength(1);
    expect(series[0]?.key).toBe("2026-08");
  });

  it("runs forward to the current month so a dry spell is visible", () => {
    const series = settledSeries([month("2026-05", 100)], "2026-08");
    expect(series.map((point) => point.key)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(series.slice(1).every((point) => point.agentShareMinor === 0)).toBe(true);
  });

  it("crosses a year boundary without inventing a thirteenth month", () => {
    const series = settledSeries([month("2025-11", 100), month("2026-01", 200)], "2026-01");
    expect(series.map((point) => point.key)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("keeps the most recent months when the history is longer than the chart", () => {
    const series = settledSeries([month("2024-01", 100), month("2026-08", 200)], "2026-08");
    expect(series).toHaveLength(MAX_TREND_MONTHS);
    expect(series[series.length - 1]?.key).toBe("2026-08");
    expect(series[0]?.key).toBe("2025-09");
  });

  it("stops at the last settled month when the clock cannot be read", () => {
    const series = settledSeries([month("2026-06", 100)], "not-a-month");
    expect(series.map((point) => point.key)).toEqual(["2026-06"]);
  });
});
