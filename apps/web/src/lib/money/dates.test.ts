import { describe, expect, it } from "vitest";
import { formatMoneyDate, formatMoneyTime } from "./dates";

const NOW = new Date("2026-09-23T10:00:00Z");

describe("formatMoneyDate", () => {
  it("prints a bare calendar day as weekday, day and month", () => {
    expect(formatMoneyDate("2026-10-16", "en", { now: NOW })).toBe("Fri 16 Oct");
  });

  it("never tips a bare day onto the day before", () => {
    expect(formatMoneyDate("2026-10-01", "en", { now: NOW })).toBe("Thu 1 Oct");
  });

  it("adds the Lagos hour when asked", () => {
    expect(formatMoneyDate("2026-10-14T14:00:00Z", "en", { withTime: true, now: NOW })).toBe("Wed 14 Oct, 3pm");
  });

  it("keeps minutes that exist", () => {
    expect(formatMoneyDate("2026-10-14T09:30:00Z", "en", { withTime: true, now: NOW })).toBe("Wed 14 Oct, 10:30am");
  });

  it("adds the year only across a year", () => {
    expect(formatMoneyDate("2027-01-04", "en", { now: NOW })).toBe("Mon 4 Jan 2027");
  });

  it("renders nothing for nothing", () => {
    expect(formatMoneyDate(null)).toBeNull();
    expect(formatMoneyDate("not a date")).toBeNull();
  });
});

describe("formatMoneyTime", () => {
  it("reads the Lagos clock, one hour ahead of UTC", () => {
    expect(formatMoneyTime(new Date("2026-10-14T22:59:59Z"))).toBe("11:59pm");
  });
});
