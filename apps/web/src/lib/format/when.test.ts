import { describe, expect, it } from "vitest";
import { ago, agoShort, dateLabel, dateTimeLabel, dayLabel, timeLabel } from "./when";

/* Wednesday 30 Sep 2026, 10:00 in Lagos (09:00 UTC). */
const NOW = new Date("2026-09-30T09:00:00Z");

describe("dayLabel", () => {
  it("names today, tomorrow and yesterday by the Lagos calendar day", () => {
    /* 23:30 in Lagos is still today; 00:30 is tomorrow. */
    expect(dayLabel("2026-09-30T22:30:00Z", { now: NOW })).toBe("Today");
    expect(dayLabel("2026-09-30T23:30:00Z", { now: NOW })).toBe("Tomorrow");
    expect(dayLabel("2026-09-29T08:00:00Z", { now: NOW })).toBe("Yesterday");
  });

  it("writes other days as a short weekday and date", () => {
    expect(dayLabel("2026-10-06T12:00:00Z", { now: NOW })).toBe("Tue 6 Oct");
    expect(dayLabel("2026-09-12T12:00:00Z", { now: NOW })).toBe("Sat 12 Sep");
  });

  it("adds the year only when it is not this year", () => {
    expect(dateLabel("2025-10-06T12:00:00Z", { now: NOW })).toBe("6 Oct 2025");
  });

  it("is empty for nothing or nonsense", () => {
    expect(dayLabel(null)).toBe("");
    expect(dayLabel("not a date")).toBe("");
  });
});

describe("timeLabel and dateTimeLabel", () => {
  it("uses the 24-hour Lagos clock", () => {
    expect(timeLabel("2026-09-30T13:05:00Z")).toBe("14:05");
    expect(dateTimeLabel("2026-09-30T13:05:00Z", { now: NOW })).toBe("Today, 14:05");
    expect(dateTimeLabel("2026-10-06T13:05:00Z", { now: NOW })).toBe("Tue 6 Oct, 14:05");
  });
});

describe("ago", () => {
  const at = (ms: number) => new Date(NOW.getTime() - ms);
  it("steps from just now to minutes, hours and days", () => {
    expect(ago(at(20_000), { now: NOW })).toBe("just now");
    expect(ago(at(12 * 60_000), { now: NOW })).toBe("12 min ago");
    /* 55 minutes is not "just now" (the old boards said it was). */
    expect(ago(at(55 * 60_000), { now: NOW })).toBe("55 min ago");
    expect(ago(at(3 * 3_600_000), { now: NOW })).toBe("3 h ago");
    expect(ago(at(26 * 3_600_000), { now: NOW })).toBe("1 day ago");
    expect(ago(at(3 * 86_400_000), { now: NOW })).toBe("3 days ago");
  });

  it("gives the day itself past a week", () => {
    expect(ago("2026-09-12T12:00:00Z", { now: NOW })).toBe("Sat 12 Sep");
  });

  it("reads a future time forwards", () => {
    expect(ago(new Date(NOW.getTime() + 90 * 60_000), { now: NOW })).toBe("in 1 h");
  });
});

describe("agoShort", () => {
  it("is the dense form", () => {
    expect(agoShort(new Date(NOW.getTime() - 30_000), { now: NOW })).toBe("just now");
    expect(agoShort(new Date(NOW.getTime() - 12 * 60_000), { now: NOW })).toBe("12m ago");
    expect(agoShort(new Date(NOW.getTime() - 5 * 3_600_000), { now: NOW })).toBe("5h ago");
    expect(agoShort(new Date(NOW.getTime() - 2 * 86_400_000), { now: NOW })).toBe("2d ago");
    expect(agoShort("2026-09-01T12:00:00Z", { now: NOW })).toBe("1 Sep");
  });
});
