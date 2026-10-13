import { describe, expect, it } from "vitest";
import { nearMeHref, quickChips } from "./quick-chips";
import { parseShelfQuery } from "./shelf-query";
import { readViewport } from "./map-viewport";
import { liveMatchCount, seeHomesLabel } from "@/components/app/filters/filter-count";
import { factsOf } from "@/lib/listings/filter";
import { getDictionary } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";

/** Every quick chip is an address the shelf already reads; nothing new is invented. */
describe("the quick chips map to the existing URL parameters", () => {
  it("'For you' is the published Recommended order, which carries no sort parameter", () => {
    const [forYou] = quickChips(parseShelfQuery({ sort: "newest", market: "rent", beds: "2" }));
    expect(forYou!.key).toBe("forYou");
    const params = new URL(forYou!.href, "https://x.test").searchParams;
    expect(params.get("sort")).toBeNull();
    /* Everything else in force is kept. */
    expect(params.get("market")).toBe("rent");
    expect(params.get("beds")).toBe("2");
    expect(parseShelfQuery(Object.fromEntries(params)).sort).toBe("recommended");
  });

  it("'New listed' is sort=newest and is on only when that is the order", () => {
    const off = quickChips(parseShelfQuery({}));
    const newListed = off.find((chip) => chip.key === "newListed")!;
    expect(new URL(newListed.href, "https://x.test").searchParams.get("sort")).toBe("newest");
    expect(newListed.on).toBe(false);
    expect(off.find((chip) => chip.key === "forYou")!.on).toBe(true);
    const on = quickChips(parseShelfQuery({ sort: "newest" }));
    expect(on.find((chip) => chip.key === "newListed")!.on).toBe(true);
    expect(on.find((chip) => chip.key === "forYou")!.on).toBe(false);
  });

  it("'Near me' is the map view at the position, in the map's own lat, lng and z", () => {
    const href = nearMeHref(parseShelfQuery({ q: "flat", market: "rent" }), { lat: 6.509512, lng: 3.371133 });
    const url = new URL(href, "https://x.test");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("view")).toBe("map");
    expect(url.searchParams.get("q")).toBe("flat");
    expect(url.searchParams.get("market")).toBe("rent");
    /* The map reads the position back with the reader it already has. */
    expect(readViewport(url.search)).toEqual({ lat: 6.5095, lng: 3.3711, zoom: 14 });
  });
});

describe("the filter sheet's live count", () => {
  const t = getDictionary("en");
  function home(id: string, over: Partial<Listing>): Listing {
    return {
      id, slug: id, title: id, kind: "rental", intent: "rent", pricePeriod: "year", area: "Yaba", city: "Lagos",
      state: "Lagos", priceMinor: 1, currency: "NGN", bedrooms: 1, bathrooms: 1, rating: 0, reviewCount: 0,
      verified: false, isDemo: false, instantBook: false, amenities: [], photos: [], hue: 0, ...over,
    };
  }
  const pool = [home("a", { bedrooms: 1 }), home("b", { bedrooms: 3 }), home("c", { bedrooms: 5 })].map(factsOf);

  it("counts what the shelf would return, by the same rule", () => {
    expect(liveMatchCount(pool, {})).toBe(3);
    expect(liveMatchCount(pool, { bedrooms: 3 })).toBe(2);
    expect(liveMatchCount(pool, { bedrooms: 5 })).toBe(1);
    expect(liveMatchCount(pool, { bedrooms: 6 })).toBe(0);
  });

  it("honours the commute limit the sheet can judge", () => {
    const banded = pool.map((fact, i) => ({ ...fact, commuteAmHigh: [30, 50, 70][i] }));
    expect(liveMatchCount(banded, {}, (high) => high !== undefined && high <= 45)).toBe(1);
  });

  it("says 'See N homes' through countOf, and the none line at zero", () => {
    expect(seeHomesLabel(12, "en", t.searchV2.filters)).toBe("See 12 homes");
    expect(seeHomesLabel(1, "en", t.searchV2.filters)).toBe("See 1 home");
    expect(seeHomesLabel(1234, "en", t.searchV2.filters)).toBe("See 1,234 homes");
    expect(seeHomesLabel(0, "en", t.searchV2.filters)).toBe(t.searchV2.filters.seeNone);
  });
});
