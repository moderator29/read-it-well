import { describe, expect, it } from "vitest";
import {
  ageShort,
  dailySeries,
  donutArcs,
  formatDuration,
  lagosTodayStart,
  mean,
  median,
  minutesBetween,
  pagerPages,
  percentChange,
  share,
  sparkPath,
} from "./metrics";

describe("review desk metrics", () => {
  it("takes a median and refuses an empty list", () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([1, 2, 3, 10])).toBe(2.5);
    expect(mean([])).toBeNull();
    expect(mean([2, 4])).toBe(3);
  });

  it("never invents a delta", () => {
    expect(percentChange(10, null)).toBeNull();
    expect(percentChange(null, 10)).toBeNull();
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(12, 10)).toBe(20);
    expect(percentChange(5, 10)).toBe(-50);
  });

  it("prints durations the way the console does", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(36)).toBe("36m");
    expect(formatDuration(504)).toBe("8h 24m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(60 * 51)).toBe("2d 3h");
  });

  it("prints ages and refuses the future", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    expect(ageShort("2026-09-22T11:59:40Z", now)).toBe("just now");
    expect(ageShort("2026-09-22T11:48:00Z", now)).toBe("12m ago");
    expect(ageShort("2026-09-22T10:00:00Z", now)).toBe("2h ago");
    expect(ageShort("2026-09-19T12:00:00Z", now)).toBe("3d ago");
    expect(ageShort("2026-09-23T12:00:00Z", now)).toBeNull();
    expect(ageShort(null, now)).toBeNull();
  });

  it("measures minutes only forwards", () => {
    expect(minutesBetween("2026-09-22T10:00:00Z", "2026-09-22T12:30:00Z")).toBe(150);
    expect(minutesBetween("2026-09-22T12:00:00Z", "2026-09-22T10:00:00Z")).toBeNull();
    expect(minutesBetween(null, "2026-09-22T10:00:00Z")).toBeNull();
  });

  it("draws no arcs for an empty donut and drops zero slices", () => {
    expect(donutArcs([{ key: "a", value: 0 }])).toEqual([]);
    const arcs = donutArcs([
      { key: "a", value: 1 },
      { key: "b", value: 0 },
      { key: "c", value: 3 },
    ]);
    expect(arcs.map((arc) => arc.key)).toEqual(["a", "c"]);
    expect(arcs[0]?.end).toBeCloseTo(0.25);
    expect(arcs[1]?.end).toBeCloseTo(1);
    expect(share(1, 4)).toBe(25);
    expect(share(1, 0)).toBeNull();
  });

  it("needs two points for a sparkline", () => {
    expect(sparkPath([3], 100, 20)).toBeNull();
    expect(sparkPath([0, 10], 100, 20)).toBe("M0 20 L100 0");
  });

  it("buckets stamps by Lagos day", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    const series = dailySeries(
      ["2026-09-22T09:00:00Z", "2026-09-21T23:30:00Z", "2026-09-21T10:00:00Z", null, "2026-09-10T10:00:00Z"],
      3,
      now,
    );
    /* 23:30 UTC on the 21st is 00:30 on the 22nd in Lagos. */
    expect(series).toEqual([0, 1, 2]);
    expect(lagosTodayStart(now)).toBe("2026-09-21T23:00:00.000Z");
  });

  it("pages with gaps", () => {
    expect(pagerPages(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pagerPages(1, 12)).toEqual([1, 2, 3, 4, 5, "gap", 12]);
    expect(pagerPages(8, 12)).toEqual([1, "gap", 7, 8, 9, "gap", 12]);
    expect(pagerPages(10, 12)).toEqual([1, "gap", 8, 9, 10, 11, 12]);
    expect(pagerPages(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
  });
});
