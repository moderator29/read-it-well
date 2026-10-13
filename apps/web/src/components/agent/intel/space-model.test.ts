import { describe, expect, it } from "vitest";
import {
  bucketsFor,
  countByListing,
  countRange,
  funnelTotals,
  lagosDayOf,
  parseRange,
  rangesFor,
  requestSeries,
  SPACE_METRICS,
  type CountContext,
  type RequestRow,
} from "./space-model";

/**
 * The period rules behind Space Analytics, proved against a fixed day. Each
 * test names the honesty rule it holds, because every one of them is the
 * difference between a true chart and a plausible one.
 */

const TODAY = "2026-10-06";
const ctx = (over: Partial<CountContext> = {}): CountContext => ({
  todayKey: TODAY,
  joinedKey: "2026-01-10",
  horizonKey: null,
  ...over,
});
const row = (createdAt: string, status = "PENDING", listingId = "a"): RequestRow => ({ listingId, status, createdAt });

describe("ranges", () => {
  it("offers a funnel metric only the seven days its source counts", () => {
    expect(rangesFor("seen")).toEqual(["7d"]);
    expect(rangesFor("requests")).toEqual(["7d", "30d", "90d", "all"]);
  });

  it("falls back to an offered period for a stale or foreign link", () => {
    expect(parseRange("30d", rangesFor("seen"))).toBe("7d");
    expect(parseRange(["90d"])).toBe("90d");
    expect(parseRange("forever")).toBe("7d");
  });

  it("lists eight counted metrics", () => {
    expect(SPACE_METRICS).toHaveLength(8);
  });
});

describe("Lagos days", () => {
  it("files a request made at 23:30 UTC under the next Lagos day", () => {
    expect(lagosDayOf("2026-10-05T23:30:00Z")).toBe("2026-10-06");
    expect(lagosDayOf("2026-10-05T22:59:00Z")).toBe("2026-10-05");
    expect(lagosDayOf("not a date")).toBeNull();
  });
});

describe("buckets", () => {
  it("draws seven and thirty days a bar a day, ending today", () => {
    const week = bucketsFor("7d", TODAY, null);
    expect(week).toHaveLength(7);
    expect(week[0]?.start).toBe("2026-09-30");
    expect(week[6]?.end).toBe(TODAY);
    expect(bucketsFor("30d", TODAY, null)).toHaveLength(30);
  });

  it("covers exactly ninety days in weeks, the oldest holding the six left over", () => {
    const weeks = bucketsFor("90d", TODAY, null);
    expect(weeks).toHaveLength(13);
    expect(weeks[0]?.start).toBe("2026-07-09");
    expect(weeks[0]?.end).toBe("2026-07-14");
    expect(weeks[12]?.end).toBe(TODAY);
    expect(weeks[12]?.start).toBe("2026-09-30");
  });

  it("draws all time a month a bar from the month they joined, this month ending today", () => {
    const months = bucketsFor("all", TODAY, "2026-08-20");
    expect(months.map((m) => m.key)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(months[2]?.end).toBe(TODAY);
    expect(months[1]?.end).toBe("2026-09-30");
  });
});

describe("counting", () => {
  const rows = [
    row("2026-10-06T09:00:00Z", "CONFIRMED"),
    row("2026-10-04T09:00:00Z"),
    row("2026-09-20T09:00:00Z", "CONFIRMED", "b"),
    row("2026-06-01T09:00:00Z", "CANCELLED"),
  ];

  it("counts the requests made in the range and how many of those are confirmed", () => {
    expect(countRange(rows, "7d", ctx())).toEqual({ requests: 2, confirmed: 1 });
    expect(countRange(rows, "30d", ctx())).toEqual({ requests: 3, confirmed: 2 });
    expect(countRange(rows, "all", ctx())).toEqual({ requests: 4, confirmed: 2 });
  });

  it("gives no total for a range that reaches past what was read", () => {
    const capped = ctx({ horizonKey: "2026-09-25" });
    expect(countRange(rows, "7d", capped)).toEqual({ requests: 2, confirmed: 1 });
    expect(countRange(rows, "30d", capped)).toBeNull();
    expect(countRange(rows, "all", capped)).toBeNull();
    expect(countByListing(rows, "90d", capped)).toBeNull();
  });

  it("draws a quiet day as a measured zero, never as missing", () => {
    const series = requestSeries(rows, "7d", ctx());
    expect(series.map((p) => p.value)).toEqual([0, 0, 0, 0, 1, 0, 1]);
  });

  it("hatches the days before the lister joined rather than calling them zero", () => {
    const series = requestSeries([row("2026-10-06T09:00:00Z")], "7d", ctx({ joinedKey: "2026-10-04" }));
    expect(series.map((p) => p.value)).toEqual([null, null, null, null, 0, 0, 1]);
  });

  it("hatches every period the read could not reach", () => {
    const series = requestSeries(rows, "7d", ctx({ horizonKey: "2026-10-02" }));
    /* The horizon day itself may have lost rows to the ceiling, so it is
       hatched along with everything before it. */
    expect(series.map((p) => p.value)).toEqual([null, null, null, 0, 1, 0, 1]);
  });

  it("counts confirmations as a cohort of the requests made in each period", () => {
    const series = requestSeries(rows, "30d", ctx(), "confirmed");
    expect(series.reduce((sum, p) => sum + (p.value ?? 0), 0)).toBe(2);
  });

  it("splits a range by listing, leaving out listings with nothing in it", () => {
    const split = countByListing(rows, "30d", ctx());
    expect(split?.get("a")).toEqual({ requests: 2, confirmed: 1 });
    expect(split?.get("b")).toEqual({ requests: 1, confirmed: 1 });
  });
});

describe("funnel totals", () => {
  it("sums each stage across the listings it was handed", () => {
    const funnel = (seen: number) => ({
      funnel: {
        compared: 0,
        rows: (["seen", "opened", "saved", "enquired", "booked", "viewed"] as const).map((stage) => ({
          stage,
          mine: stage === "seen" ? seen : 1,
          median: null,
        })),
      },
    });
    const totals = funnelTotals([funnel(4), funnel(6)]);
    expect(totals.seen).toBe(10);
    expect(totals.viewed).toBe(2);
  });
});
