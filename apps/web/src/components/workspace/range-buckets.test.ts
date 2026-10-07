import { describe, expect, it } from "vitest";
import { bucketByRange, rangeFloor } from "./range-buckets";

/* 7 October 2026, 14:30 in Lagos (13:30 UTC). */
const NOW = new Date("2026-10-07T13:30:00Z");

describe("the dashboard figure's buckets", () => {
  it("draws today by the hour up to now, and the last 7 and 30 days by the day, today last", () => {
    const { day, week, month } = bucketByRange([], NOW, "en");
    expect(day).toHaveLength(15);
    expect(day[0]?.label).toBe("00:00");
    expect(day[14]?.label).toBe("14:00");
    expect(week).toHaveLength(7);
    expect(month).toHaveLength(30);
    expect(week[6]?.label).toBe("Wed");
    expect(month[29]?.label).toMatch(/7 Oct/);
  });

  it("counts each row once in every range it falls in, in Lagos time, and nothing invented", () => {
    const rows = [
      { at: "2026-10-07T13:10:00Z" }, // today 14:10 Lagos
      { at: "2026-10-06T23:30:00Z" }, // today 00:30 Lagos, though the 6th in UTC
      { at: "2026-10-06T22:30:00Z" }, // yesterday 23:30 Lagos
      { at: "2026-09-20T10:00:00Z" }, // 17 days ago: month only
      { at: "2026-08-01T10:00:00Z" }, // outside every range
      { at: "2026-10-07T20:00:00Z" }, // in the future: refused
      { at: "not a date" },
    ];
    const { day, week, month } = bucketByRange(rows, NOW, "en");
    const sum = (list: { value: number }[]) => list.reduce((total, bucket) => total + bucket.value, 0);
    expect(sum(day)).toBe(2);
    expect(day[0]?.value).toBe(1);
    expect(day[14]?.value).toBe(1);
    expect(sum(week)).toBe(3);
    expect(week[6]?.value).toBe(2);
    expect(week[5]?.value).toBe(1);
    expect(sum(month)).toBe(4);
    expect(month[29 - 17]?.value).toBe(1);
  });

  it("sums values when the rows carry money", () => {
    const { week } = bucketByRange([{ at: "2026-10-07T09:00:00Z", value: 250_000_00 }], NOW, "en");
    expect(week[6]?.value).toBe(250_000_00);
  });

  it("reads from Lagos midnight 29 days back, so the month range is exactly thirty days", () => {
    expect(rangeFloor(NOW)).toBe("2026-09-07T23:00:00.000Z");
  });
});
