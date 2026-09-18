import { describe, expect, it } from "vitest";

import {
  DEFAULT_RADIUS_KM,
  activeFilterCount,
  nightsBetween,
  parseStaysQuery,
  toStaysHref,
} from "./filters";

/**
 * The URL contract, proved without a database.
 *
 * `parseStaysQuery` takes an injected "today" so the past-date rule is a
 * fact and not a function of when the test runs.
 */
const TODAY = "2026-09-18";

describe("parseStaysQuery", () => {
  it("renders the unfiltered shelf for an empty address", () => {
    const q = parseStaysQuery({}, TODAY);
    expect(q).toEqual({
      q: undefined,
      near: undefined,
      radiusM: DEFAULT_RADIUS_KM * 1000,
      stateCode: undefined,
      city: undefined,
      area: undefined,
      checkIn: undefined,
      checkOut: undefined,
      rooms: 1,
      guests: undefined,
      minPriceMinor: undefined,
      maxPriceMinor: undefined,
      minRating: undefined,
      roomCategories: [],
      amenities: [],
      breakfast: false,
      freeCancellation: false,
      verified: false,
      sort: "recommended",
      page: 1,
    });
  });

  it("reads the twelve filters from one address", () => {
    const q = parseStaysQuery(
      {
        q: " Ikoyi ",
        near: "VI",
        radius: "3",
        state: "la",
        city: "Lagos",
        in: "2026-12-15",
        out: "2026-12-18",
        rooms: "2",
        guests: "3",
        min: "40000",
        max: "150000",
        rating: "4",
        room: "twin,suite,twin,castle",
        amenities: "pool, gym,Pool",
        ac: "1",
        parking: "true",
        wifi: "1",
        breakfast: "1",
        free_cancel: "1",
        verified: "1",
        sort: "price-asc",
        page: "2",
      },
      TODAY,
    );
    expect(q.q).toBe("Ikoyi");
    expect(q.near).toBe("VI");
    expect(q.radiusM).toBe(3000);
    expect(q.stateCode).toBe("LA");
    expect(q.checkIn).toBe("2026-12-15");
    expect(q.checkOut).toBe("2026-12-18");
    expect(q.rooms).toBe(2);
    expect(q.guests).toBe(3);
    // Naira at the boundary, kobo everywhere else.
    expect(q.minPriceMinor).toBe(4_000_000);
    expect(q.maxPriceMinor).toBe(15_000_000);
    expect(q.minRating).toBe(4);
    expect(q.roomCategories).toEqual(["twin", "suite"]);
    // The three named facilities fold into the amenity list, once each.
    expect(q.amenities).toEqual(["pool", "gym", "ac", "parking", "wifi"]);
    expect(q.breakfast).toBe(true);
    expect(q.freeCancellation).toBe(true);
    expect(q.verified).toBe(true);
    expect(q.sort).toBe("price-asc");
    expect(q.page).toBe(2);
  });

  it("drops rubbish rather than throwing", () => {
    const q = parseStaysQuery(
      {
        rooms: "2.5",
        guests: "-4",
        min: "1e3",
        rating: "9",
        state: "Lagos",
        sort: "cheapest",
        page: "0",
        radius: "500",
        room: "bunk",
        amenities: "Not A Code!",
        in: "2026-02-31",
        out: "2026-03-02",
      },
      TODAY,
    );
    expect(q.rooms).toBe(1);
    expect(q.guests).toBeUndefined();
    expect(q.minPriceMinor).toBeUndefined();
    expect(q.minRating).toBeUndefined();
    expect(q.stateCode).toBeUndefined();
    expect(q.sort).toBe("recommended");
    expect(q.page).toBe(1);
    expect(q.radiusM).toBe(DEFAULT_RADIUS_KM * 1000);
    expect(q.roomCategories).toEqual([]);
    expect(q.amenities).toEqual([]);
    expect(q.checkIn).toBeUndefined();
    expect(q.checkOut).toBeUndefined();
  });

  it("keeps dates only as a pair, in order, and not in the past", () => {
    expect(parseStaysQuery({ in: "2026-12-15" }, TODAY).checkIn).toBeUndefined();
    const reversed = parseStaysQuery({ in: "2026-12-18", out: "2026-12-15" }, TODAY);
    expect(reversed.checkIn).toBeUndefined();
    expect(reversed.checkOut).toBeUndefined();
    const same = parseStaysQuery({ in: "2026-12-15", out: "2026-12-15" }, TODAY);
    expect(same.checkIn).toBeUndefined();
    const past = parseStaysQuery({ in: "2026-09-01", out: "2026-09-03" }, TODAY);
    expect(past.checkIn).toBeUndefined();
    const today = parseStaysQuery({ in: TODAY, out: "2026-09-19" }, TODAY);
    expect(today.checkIn).toBe(TODAY);
  });

  it("drops a budget whose floor is above its ceiling", () => {
    const q = parseStaysQuery({ min: "500", max: "100" }, TODAY);
    expect(q.minPriceMinor).toBeUndefined();
    expect(q.maxPriceMinor).toBeUndefined();
  });

  it("only sorts by distance when there is a place to measure from", () => {
    expect(parseStaysQuery({ sort: "distance" }, TODAY).sort).toBe("recommended");
    expect(parseStaysQuery({ sort: "distance", near: "airport" }, TODAY).sort).toBe("distance");
  });

  it("takes the first value of a repeated parameter", () => {
    expect(parseStaysQuery({ city: ["Abuja", "Lagos"] }, TODAY).city).toBe("Abuja");
  });
});

describe("toStaysHref", () => {
  it("round-trips a query and leaves defaults out", () => {
    const q = parseStaysQuery(
      {
        near: "VI",
        in: "2026-12-15",
        out: "2026-12-18",
        rooms: "2",
        min: "40000",
        room: "twin",
        amenities: "pool",
        ac: "1",
        breakfast: "1",
        sort: "top-rated",
        page: "3",
      },
      TODAY,
    );
    const href = toStaysHref(q);
    expect(href).toBe(
      "/stays?near=VI&in=2026-12-15&out=2026-12-18&rooms=2&min=40000&room=twin&amenities=pool&ac=1&breakfast=1&sort=top-rated&page=3",
    );
    const again = parseStaysQuery(Object.fromEntries(new URL(`https://x${href}`).searchParams), TODAY);
    expect(again).toEqual(q);
  });

  it("is the bare path for the unfiltered shelf", () => {
    expect(toStaysHref(parseStaysQuery({}, TODAY))).toBe("/stays");
  });
});

describe("nightsBetween", () => {
  it("counts whole nights across a month end", () => {
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(nightsBetween("2026-12-15", "2026-12-16")).toBe(1);
  });
});

describe("activeFilterCount", () => {
  it("counts the twelve filters, price once and the three named facilities each", () => {
    expect(activeFilterCount(parseStaysQuery({}, TODAY))).toBe(0);
    const all = parseStaysQuery(
      {
        min: "1",
        max: "2",
        rating: "3",
        city: "Lagos",
        room: "twin",
        amenities: "pool",
        breakfast: "1",
        ac: "1",
        parking: "1",
        wifi: "1",
        verified: "1",
        free_cancel: "1",
        near: "VI",
      },
      TODAY,
    );
    expect(activeFilterCount(all)).toBe(12);
  });
});
