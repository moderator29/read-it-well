import { describe, expect, it } from "vitest";
import { dayHeading, dayKeyOf, dayStarts } from "./day";

const WORDS = { today: "Today", yesterday: "Yesterday" };
/* 6 October 2026, 14:00 in Lagos (13:00 UTC). */
const NOW = Date.parse("2026-10-06T13:00:00Z");

describe("day dividers on Lagos time", () => {
  it("keys a day by the Lagos calendar, not UTC", () => {
    /* 23:30 UTC on the 5th is 00:30 on the 6th in Lagos. */
    expect(dayKeyOf("2026-10-05T23:30:00Z")).toBe("2026-10-06");
    expect(dayKeyOf("not a date")).toBeNull();
  });
  it("says Today and Yesterday against the server's clock", () => {
    expect(dayHeading("2026-10-06T08:00:00Z", "en", WORDS, NOW)).toBe("Today");
    expect(dayHeading("2026-10-05T08:00:00Z", "en", WORDS, NOW)).toBe("Yesterday");
  });
  it("says a plain date otherwise, and never Today without a clock", () => {
    expect(dayHeading("2026-09-26T08:00:00Z", "en", WORDS, NOW)).toMatch(/26/);
    expect(dayHeading("2026-10-06T08:00:00Z", "en", WORDS)).not.toBe("Today");
    expect(dayHeading("2025-09-26T08:00:00Z", "en", WORDS, NOW)).toMatch(/2025/);
  });
  it("starts a day where the Lagos day changes", () => {
    const rows = [
      { createdAt: "2026-10-05T08:00:00Z" },
      { createdAt: "2026-10-05T09:00:00Z" },
      { createdAt: "2026-10-06T08:00:00Z" },
      { createdAt: undefined },
      { createdAt: "2026-10-06T10:00:00Z" },
    ];
    expect([...dayStarts(rows)]).toEqual([0, 2]);
  });
});
