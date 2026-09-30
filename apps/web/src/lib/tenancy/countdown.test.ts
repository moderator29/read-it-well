import { describe, expect, it } from "vitest";
import { rentCountdown, wholeMonthsBetween } from "./countdown";

describe("rent countdown (B10)", () => {
  it("counts the days and spreads the rent over the whole months left", () => {
    const c = rentCountdown({ today: "2026-09-30", endsOn: "2027-05-02", rentMinor: 250_000_000 })!;
    expect(c.daysLeft).toBe(214);
    expect(c.monthsLeft).toBe(7);
    /* 2,500,000 / 7 = 357,142.86, rounded up to the next thousand. */
    expect(c.perMonthMinor).toBe(35_800_000);
    expect(c.fromOffer).toBe(false);
  });

  it("switches to the lister's renewal offer when there is one", () => {
    const c = rentCountdown({ today: "2026-09-30", endsOn: "2027-09-30", rentMinor: 250_000_000, offerRentMinor: 300_000_000 })!;
    expect(c.dueMinor).toBe(300_000_000);
    expect(c.fromOffer).toBe(true);
    expect(c.perMonthMinor).toBe(25_000_000);
  });

  it("gives no monthly figure with fewer than two whole months", () => {
    const c = rentCountdown({ today: "2026-09-30", endsOn: "2026-11-20", rentMinor: 250_000_000 })!;
    expect(c.monthsLeft).toBe(1);
    expect(c.perMonthMinor).toBeNull();
  });

  it("has no countdown once ended, or with no figure", () => {
    expect(rentCountdown({ today: "2026-09-30", endsOn: "2026-09-29", rentMinor: 1 })).toBeNull();
    expect(rentCountdown({ today: "2026-09-30", endsOn: "2027-09-30", rentMinor: null })).toBeNull();
    expect(rentCountdown({ today: "2026-09-30", endsOn: "2027-09-30", rentMinor: 0 })).toBeNull();
    expect(rentCountdown({ today: "bad", endsOn: "2027-09-30", rentMinor: 1 })).toBeNull();
  });

  it("counts due day itself as zero days", () => {
    expect(rentCountdown({ today: "2026-09-30", endsOn: "2026-09-30", rentMinor: 1 })?.daysLeft).toBe(0);
  });

  it("counts whole calendar months", () => {
    expect(wholeMonthsBetween("2026-01-31", "2026-02-28")).toBe(0);
    expect(wholeMonthsBetween("2026-01-15", "2026-03-15")).toBe(2);
    expect(wholeMonthsBetween("2026-03-15", "2026-01-15")).toBe(0);
  });
});
