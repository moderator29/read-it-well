import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import type { Listing } from "./types";
import { cardGlance, isSafePhoto } from "./card-glance";
import { __clearHandoffs, handOff, handoffFor } from "./handoff";
import { isSearchHref, searchesFor } from "@/lib/search/memory";

const en = getDictionary("en");

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "1",
    slug: "a",
    title: "A flat",
    kind: "apartment",
    area: "Lekki",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 250_000_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 1,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: ["https://example.test/a.jpg"],
    hue: 0,
    ...over,
  };
}

describe("cardGlance (B2, B4)", () => {
  it("prints the card's own lead: the move-in total on a tenancy", () => {
    const g = cardGlance(
      listing({ pricePeriod: "year", intent: "rent", moveInCostMinor: 330_000_000 }),
      "en",
      en.catalogue.card,
    );
    expect(g.price).toMatch(/3\.3/);
    expect(g.priceNote).toBe(en.catalogue.card.moveIn);
    expect(g.place).toBe("Lekki, Lagos");
    expect(g.photo).toBe("https://example.test/a.jpg");
  });

  it("prints no price when the lister asked for offers, never a zero", () => {
    const g = cardGlance(listing({ priceMinor: 0 }), "en", en.catalogue.card);
    expect(g.price).toBeNull();
  });

  it("carries Example over Verified, and a place stated once", () => {
    expect(cardGlance(listing({ isDemo: true }), "en", en.catalogue.card).mark).toBe("example");
    expect(cardGlance(listing({ verified: true }), "en", en.catalogue.card).mark).toBe("verified");
    expect(cardGlance(listing({ area: "Lagos" }), "en", en.catalogue.card).place).toBe("Lagos");
  });

  it("only lets a safe photo URL back out of storage", () => {
    expect(isSafePhoto("https://x.test/p.jpg")).toBe(true);
    expect(isSafePhoto("/images/p.jpg")).toBe(true);
    expect(isSafePhoto("//evil.test/p.jpg")).toBe(false);
    expect(isSafePhoto("javascript:alert(1)")).toBe(false);
    expect(isSafePhoto(42)).toBe(false);
  });
});

describe("the handoff store (B4)", () => {
  it("keeps the last twelve taps and forgets the oldest", () => {
    __clearHandoffs();
    const base = cardGlance(listing(), "en", en.catalogue.card);
    for (let i = 0; i < 14; i += 1) handOff({ ...base, id: `l${i}` }, null);
    expect(handoffFor("l0")).toBeNull();
    expect(handoffFor("l13")?.id).toBe("l13");
    expect(handoffFor(null)).toBeNull();
  });
});

describe("recent searches per screen (B2)", () => {
  it("accepts the two search screens and nothing else", () => {
    expect(isSearchHref("/search?q=Yaba")).toBe(true);
    expect(isSearchHref("/stays/search?q=Lekki")).toBe(true);
    expect(isSearchHref("/searchx")).toBe(false);
    expect(isSearchHref("https://evil.test/search")).toBe(false);
  });

  it("splits the remembered searches by screen", () => {
    const all = [
      { label: "2 bed places in Yaba", href: "/search?q=Yaba&beds=2" },
      { label: "Stays in Lekki", href: "/stays/search?q=Lekki" },
    ];
    expect(searchesFor(all, "/search").map((e) => e.label)).toEqual(["2 bed places in Yaba"]);
    expect(searchesFor(all, "/stays/search").map((e) => e.label)).toEqual(["Stays in Lekki"]);
  });
});
