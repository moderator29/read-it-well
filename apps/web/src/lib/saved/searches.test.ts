import { describe, expect, it } from "vitest";

import {
  SAVED_SEARCH_LABEL_MAX,
  canonicalSearch,
  describeSearch,
  readStoredSearch,
  storedSearchJson,
  summariseSearch,
} from "./searches";

/**
 * A SAVED SEARCH IS A STORED ADDRESS, and everything that can go wrong with
 * one is a spelling difference. Two people saving the same hunt from two
 * different links must produce one key; a hunt with rubbish in its address
 * must store nothing rubbish; and the words on the row must describe the
 * filters that are actually stored rather than the ones somebody meant.
 */

describe("canonicalSearch", () => {
  it("keeps only what the results page reads, in one fixed order", () => {
    const a = canonicalSearch({ beds: "2", type: "apartment", q: "Lekki" });
    const b = canonicalSearch({ q: "Lekki", beds: "2", type: "apartment" });
    expect(a.key).toBe(b.key);
    expect(a.key).toBe("q=Lekki&type=apartment&beds=2");
    expect(a.href).toBe("/search?q=Lekki&type=apartment&beds=2");
  });

  it("drops sort and view, because neither changes which places match", () => {
    const plain = canonicalSearch({ q: "Lekki" });
    const sorted = canonicalSearch({ q: "Lekki", sort: "price-asc", view: "map" });
    expect(sorted.key).toBe(plain.key);
  });

  it("drops rubbish rather than storing it", () => {
    const search = canonicalSearch({
      beds: "-4",
      guests: "2.5",
      type: "spaceship",
      water: "lemonade",
      unknown: "value",
      q: "Yaba",
    });
    expect(search.key).toBe("q=Yaba");
  });

  it("carries the market across the round trip", () => {
    const search = canonicalSearch({ market: "buy", type: "land" });
    expect(search.params.market).toBe("buy");
    expect(canonicalSearch(search.params).key).toBe(search.key);
  });

  it("says a search with nothing in it is empty, so nothing can subscribe to the whole catalogue", () => {
    expect(canonicalSearch({}).key).toBe("");
    expect(canonicalSearch({ sort: "top-rated" }).key).toBe("");
  });

  it("is stable when its own stored form is fed back in", () => {
    const first = canonicalSearch({
      q: "Ikoyi",
      beds: "3",
      max: "9000000",
      verified: "1",
      power: "backup,band-a",
      water: "mains,borehole",
      amenities: "pool,wifi",
    });
    const second = canonicalSearch(first.params);
    expect(second.key).toBe(first.key);
    expect(second.params).toEqual(first.params);
  });
});

describe("readStoredSearch", () => {
  it("reads what storedSearchJson wrote", () => {
    const canonical = canonicalSearch({ q: "Lekki", beds: "2" });
    const stored = storedSearchJson(canonical);
    expect(readStoredSearch(stored).key).toBe(canonical.key);
  });

  it("survives a column holding anything at all", () => {
    for (const value of [null, undefined, 42, "text", [], {}, { params: 7 }]) {
      expect(readStoredSearch(value).key).toBe("");
    }
  });

  it("throws away non-string values inside the stored params", () => {
    const search = readStoredSearch({ v: 1, params: { q: "Lekki", beds: 2, amenities: null } });
    expect(search.key).toBe("q=Lekki");
  });
});

describe("describeSearch", () => {
  it("names the category, the bedrooms, the place and the budget", () => {
    const label = describeSearch(
      canonicalSearch({ type: "apartment", beds: "2", q: "Lekki", max: "5000000" }).params,
    );
    expect(label).toContain("2 bed apartments");
    expect(label).toContain("in Lekki");
    expect(label).toContain("under");
  });

  it("speaks money through the formatter and never divides it by hand", () => {
    // 5,000,000 naira arrives as 500,000,000 kobo and must read as the naira.
    const label = describeSearch(canonicalSearch({ max: "5000000" }).params);
    expect(label).toContain("5,000,000");
    expect(label).not.toContain("500,000,000");
  });

  it("names the market", () => {
    expect(describeSearch(canonicalSearch({ market: "buy" }).params)).toContain("for sale");
    expect(describeSearch(canonicalSearch({ market: "rent" }).params)).toContain("to rent");
  });

  it("never exceeds the length a name is allowed to be", () => {
    const label = describeSearch(
      canonicalSearch({
        type: "apartment",
        beds: "5",
        q: "Victoria Island Lagos waterfront serviced",
        min: "1000000",
        max: "900000000",
        market: "rent",
      }).params,
    );
    expect(label.length).toBeLessThanOrEqual(SAVED_SEARCH_LABEL_MAX);
  });

  it("still says something for a search with one filter", () => {
    expect(describeSearch(canonicalSearch({ beds: "2" }).params)).toBe("2 bed places");
  });
});

describe("summariseSearch", () => {
  it("lists exactly what is stored and nothing that is not", () => {
    const chips = summariseSearch(
      canonicalSearch({
        q: "Yaba",
        type: "rental",
        beds: "2",
        verified: "1",
        power: "backup",
        water: "borehole",
      }).params,
    );
    expect(chips).toContain("Yaba");
    expect(chips).toContain("Rentals");
    expect(chips).toContain("2+ beds");
    expect(chips).toContain("Verified only");
    expect(chips).toContain("Backup power");
    expect(chips).toContain("Borehole");
    expect(chips).not.toContain("Band A feeder");
    expect(chips).not.toContain("Instant book");
  });

  it("has nothing to say about an empty search", () => {
    expect(summariseSearch({})).toEqual([]);
  });
});
