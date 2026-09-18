import { describe, expect, it } from "vitest";
import {
  nightsBetween,
  parseGuests,
  parseIsoDate,
  readStayDates,
  stayTotalMinor,
  toStaysSearchHref,
} from "./model";
import type { Listing } from "@/lib/listings/types";

describe("stay dates", () => {
  it("accepts only real ISO dates", () => {
    expect(parseIsoDate("2026-12-15")).toBe("2026-12-15");
    expect(parseIsoDate("2026-02-30")).toBeUndefined();
    expect(parseIsoDate("15/12/2026")).toBeUndefined();
    expect(parseIsoDate(["2026-12-15"])).toBeUndefined();
  });

  it("counts nights and refuses a non-stay", () => {
    expect(nightsBetween("2026-12-15", "2026-12-18")).toBe(3);
    expect(nightsBetween("2026-12-18", "2026-12-15")).toBeNull();
    expect(nightsBetween("2026-12-15", "2026-12-15")).toBeNull();
    expect(nightsBetween("2026-12-15", undefined)).toBeNull();
  });

  it("bounds guests and defaults to two", () => {
    expect(parseGuests("4")).toBe(4);
    expect(parseGuests("0")).toBe(2);
    expect(parseGuests("40")).toBe(2);
    expect(parseGuests(undefined)).toBe(2);
  });

  it("drops half a date range rather than guessing", () => {
    const dates = readStayDates({ checkIn: "2026-12-15", guests: "3" });
    expect(dates.nights).toBeNull();
    expect(dates.checkIn).toBeUndefined();
    expect(dates.guests).toBe(3);
  });
});

describe("the total is the headline", () => {
  const base = {
    id: "x",
    slug: "x",
    title: "x",
    kind: "hotel",
    area: "a",
    city: "c",
    state: "s",
    currency: "NGN",
    photos: [],
  } as unknown as Listing;

  it("adds the once-per-stay charges to nights times the rate, in kobo", () => {
    const listing = { ...base, pricePeriod: "night", priceMinor: 4_500_000, cleaningMinor: 500_000, serviceMinor: 0 } as Listing;
    expect(stayTotalMinor(listing, 3)).toBe(14_000_000);
  });

  it("has no total for a listing with no nightly price", () => {
    const listing = { ...base, pricePeriod: "year", priceMinor: 4_500_000 } as Listing;
    expect(stayTotalMinor(listing, 3)).toBeNull();
  });
});

describe("the stays search href", () => {
  it("carries dates only as a pair and guests only when not the default", () => {
    expect(toStaysSearchHref({ type: "hotel", checkIn: "2026-12-15", guests: 2 })).toBe(
      "/stays/search?type=hotel",
    );
    expect(
      toStaysSearchHref({ q: "Lekki", checkIn: "2026-12-15", checkOut: "2026-12-18", guests: 3 }),
    ).toBe("/stays/search?q=Lekki&checkIn=2026-12-15&checkOut=2026-12-18&guests=3");
  });
});
