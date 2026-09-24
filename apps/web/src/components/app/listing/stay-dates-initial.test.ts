import { describe, expect, it } from "vitest";
import { initialStayDates } from "./stay-dates-pick";

/**
 * A stay opened from a search keeps the dates in its address (THE_HUNDRED
 * walk: the pinned bar quoted "Total for 2 nights" under a five-night search),
 * and falls back to the next free weekend only when those dates cannot be
 * booked.
 */
const TODAY = "2026-09-24"; // a Thursday

describe("the dates a stay opens on", () => {
  it("takes the searched dates from the address", () => {
    expect(initialStayDates(TODAY, new Set(), { checkIn: "2026-10-10", checkOut: "2026-10-15" })).toEqual({
      checkIn: "2026-10-10",
      checkOut: "2026-10-15",
    });
  });

  it("falls back to the next weekend when there are none", () => {
    expect(initialStayDates(TODAY, new Set())).toEqual({ checkIn: "2026-09-25", checkOut: "2026-09-27" });
  });

  it("refuses dates in the past, reversed, too long, or over a sold night", () => {
    const weekend = { checkIn: "2026-09-25", checkOut: "2026-09-27" };
    expect(initialStayDates(TODAY, new Set(), { checkIn: "2026-09-01", checkOut: "2026-09-03" })).toEqual(weekend);
    expect(initialStayDates(TODAY, new Set(), { checkIn: "2026-10-15", checkOut: "2026-10-10" })).toEqual(weekend);
    expect(initialStayDates(TODAY, new Set(), { checkIn: "2026-10-01", checkOut: "2027-10-10" })).toEqual(weekend);
    expect(initialStayDates(TODAY, new Set(["2026-10-12"]), { checkIn: "2026-10-10", checkOut: "2026-10-15" })).toEqual(weekend);
  });
});
