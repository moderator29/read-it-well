import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import {
  STALE_AFTER_DAYS,
  isNewSince,
  lagosDaysBetween,
  listedAge,
  listedAgeText,
  staleMonthOptions,
} from "./listed-age";

const copy = getDictionary("en").shape.listed;
const NOW = new Date("2026-09-23T12:00:00Z");

describe("listed age (V-22)", () => {
  it("counts Lagos days, not UTC days", () => {
    /* 23:30 in Lagos on the 22nd is 22:30 UTC: yesterday in Lagos. */
    expect(lagosDaysBetween(new Date("2026-09-22T22:30:00Z"), NOW)).toBe(1);
    /* 23:30 UTC on the 22nd is 00:30 on the 23rd in Lagos: today. */
    expect(lagosDaysBetween(new Date("2026-09-22T23:30:00Z"), NOW)).toBe(0);
  });

  it("says today, yesterday and N days ago", () => {
    expect(listedAge("2026-09-23T08:00:00Z", NOW)).toEqual({ kind: "today" });
    expect(listedAge("2026-09-22T08:00:00Z", NOW)).toEqual({ kind: "yesterday" });
    expect(listedAge("2026-09-20T08:00:00Z", NOW)).toEqual({ kind: "days", days: 3 });
    expect(listedAgeText({ kind: "days", days: 3 }, copy, "")).toBe("Listed 3 days ago");
  });

  it("asks to be confirmed past sixty days, and says only what is known", () => {
    const exactly = new Date(NOW.getTime() - STALE_AFTER_DAYS * 86_400_000).toISOString();
    expect(listedAge(exactly, NOW)?.kind).toBe("days");
    const old = listedAge("2026-07-01T08:00:00Z", NOW);
    expect(old?.kind).toBe("stale");
    expect(listedAgeText(old!, copy, "July")).toBe("Listed in July, not confirmed since");
  });

  it("names the year only when it is not this year", () => {
    expect(staleMonthOptions(new Date("2026-07-01T08:00:00Z"), NOW).year).toBeUndefined();
    expect(staleMonthOptions(new Date("2025-07-01T08:00:00Z"), NOW).year).toBe("numeric");
  });

  it("has no answer for no date, a bad date or a date from the future", () => {
    expect(listedAge(undefined, NOW)).toBeNull();
    expect(listedAge("not a date", NOW)).toBeNull();
    expect(listedAge("2026-09-24T12:00:00Z", NOW)).toBeNull();
  });

  it("marks New only against a real previous visit", () => {
    const visit = Date.parse("2026-09-21T00:00:00Z");
    expect(isNewSince("2026-09-22T00:00:00Z", visit)).toBe(true);
    expect(isNewSince("2026-09-20T00:00:00Z", visit)).toBe(false);
    expect(isNewSince("2026-09-22T00:00:00Z", null)).toBe(false);
    expect(isNewSince(undefined, visit)).toBe(false);
  });
});
