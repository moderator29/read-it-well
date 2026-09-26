import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { cardFacts, cardMarket, cardMessageHref, cardPrice, cardUtility } from "./listing-card-model";

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
    priceMinor: 9_500_000,
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 1,
    rating: 0,
    reviewCount: 0,
    verified: false,
    /*
     * Required rather than optional on the domain type, on purpose: "is this a
     * real property" is not a question a reader of a listing should be allowed
     * to leave unanswered, so a new construction site has to decide. A fixture
     * says false because the thing it is standing in for is real inventory.
     */
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

describe("cardFacts", () => {
  it("keeps a fixed order so a grid reads down a column", () => {
    const facts = cardFacts(listing({ instantBook: true }), en);
    expect(facts.map((f) => f.key)).toEqual(["beds", "baths", "kind", "instant"]);
  });

  it("never prints a zero count, because zero bedrooms is not a fact", () => {
    const facts = cardFacts(listing({ kind: "restaurant", bedrooms: 0, bathrooms: 0 }), en);
    expect(facts.map((f) => f.key)).toEqual(["kind"]);
  });

  it("uses the singular for one", () => {
    expect(cardFacts(listing({ bedrooms: 1, bathrooms: 1 }), en)[0]?.label).toBe("1 bed");
    expect(cardFacts(listing({ bedrooms: 1, bathrooms: 1 }), en)[1]?.label).toBe("1 bath");
  });

  it("uses the plural for more than one", () => {
    expect(cardFacts(listing({ bedrooms: 3 }), en)[0]?.label).toBe("3 beds");
  });

  /* The units are English text in these three languages until translated,
     and English text takes English's grammar: Yoruba's one category printed
     "1 beds · 1 baths" on every one-bedroom card. */
  it("keeps the singular for one in Yoruba, Hausa and Igbo too", () => {
    for (const locale of ["yo", "ha", "ig"] as const) {
      const facts = cardFacts(listing({ bedrooms: 1, bathrooms: 1 }), getDictionary(locale), locale);
      expect(facts.slice(0, 2).map((fact) => fact.label), locale).toEqual(["1 bed", "1 bath"]);
    }
  });

  /*
   * A rental is arranged with the agent and inspected before money moves, so an
   * "Instant" mark on one would be a promise the product refuses to keep.
   */
  it("refuses instant booking on a yearly rental even when the flag is set", () => {
    const facts = cardFacts(listing({ kind: "rental", pricePeriod: "year", instantBook: true }), en);
    expect(facts.map((f) => f.key)).not.toContain("instant");
  });

  it("caps the row at four", () => {
    const facts = cardFacts(listing({ bedrooms: 4, bathrooms: 3, instantBook: true }), en);
    expect(facts.length).toBeLessThanOrEqual(4);
  });

  it("names land as land rather than as a property type", () => {
    const facts = cardFacts(listing({ kind: "land", bedrooms: 0, bathrooms: 0 }), en);
    expect(facts[0]?.label).toBe("Land");
  });
});

describe("cardUtility", () => {
  it("is null when the host answered nothing, because silence is not good news", () => {
    expect(cardUtility(listing())).toBeNull();
    expect(cardUtility(listing({ utilities: { hasEstateAccess: false } }))).toBeNull();
  });

  it("composes the band and the backup into one phrase", () => {
    const value = cardUtility(
      listing({ utilities: { powerGrid: "BAND_A", powerBackup: "GENERATOR", hasEstateAccess: false } }),
    );
    expect(value).toBe("Band A, generator");
  });

  it("states the band alone when there is no backup answer", () => {
    expect(
      cardUtility(listing({ utilities: { powerGrid: "PATCHY", hasEstateAccess: false } })),
    ).toBe("Patchy light");
  });

  it("states the backup alone when there is no band answer", () => {
    expect(
      cardUtility(listing({ utilities: { powerBackup: "SOLAR", hasEstateAccess: false } })),
    ).toBe("Backup solar");
  });

  it("treats a declared absence of backup as an answer, not as silence", () => {
    expect(
      cardUtility(listing({ utilities: { powerGrid: "NONE", powerBackup: "NONE", hasEstateAccess: false } })),
    ).toBe("No grid supply");
  });

  /* Water, prepaid metering and estate access are deliberately not here. */
  it("says nothing about water or the gate", () => {
    const value = cardUtility(
      listing({
        utilities: {
          powerGrid: "BAND_A",
          waterSupply: "BOREHOLE",
          prepaidMeter: true,
          hasEstateAccess: true,
        },
      }),
    );
    expect(value).toBe("Band A");
  });
});

describe("cardMarket", () => {
  it("separates a sale from a tenancy, which the card could not say at all", () => {
    expect(cardMarket(listing({ intent: "sale", pricePeriod: undefined }))).toBe("sale");
    expect(cardMarket(listing({ pricePeriod: "year" }))).toBe("rent");
  });

  /* Two enum values, four markets. The period is what tells them apart. */
  it("reads the period, because listing_intent cannot name four markets", () => {
    expect(cardMarket(listing({ pricePeriod: "night" }))).toBe("night");
    expect(cardMarket(listing({ pricePeriod: "guest" }))).toBe("head");
    expect(cardMarket(listing({ pricePeriod: "month" }))).toBe("rent");
  });

  it("answers a key the dictionary holds in every locale", () => {
    expect(Object.keys(en.landing.card.market).sort()).toEqual(
      ["head", "night", "rent", "sale"],
    );
  });
});

describe("cardPrice", () => {
  /*
   * The product rule, as a test. `PRODUCT.md` section 5: "the card leads with
   * the total move-in cost and the rent is the secondary line". Before this
   * existed the card printed the rent and never read `moveInCostMinor` at all.
   */
  it("leads a tenancy with the move-in total and keeps the rent beneath it", () => {
    const price = cardPrice(
      listing({
        pricePeriod: "year",
        priceMinor: 450_000_000,
        moveInCostMinor: 675_000_000,
        moveInCostStated: true,
      }),
    );
    expect(price).toEqual({
      lead: "moveIn",
      minor: 675_000_000,
      approximate: false,
      rentMinor: 450_000_000,
      rentSuffix: "/yr",
    });
  });

  it("marks a total summed from the named parts as a floor", () => {
    const price = cardPrice(
      listing({
        pricePeriod: "year",
        priceMinor: 450_000_000,
        moveInCostMinor: 500_000_000,
        moveInCostStated: false,
      }),
    );
    expect(price.lead === "moveIn" && price.approximate).toBe(true);
  });

  it("keeps the rent as the lead when the lister named nothing", () => {
    const price = cardPrice(listing({ pricePeriod: "year", priceMinor: 450_000_000 }));
    expect(price).toEqual({ lead: "headline", minor: 450_000_000, suffix: "/yr" });
  });

  /* Nobody pays an agency fee for two nights, so a rate is never a move-in. */
  it("never leads a nightly rate with a move-in total", () => {
    const price = cardPrice(
      listing({ pricePeriod: "night", priceMinor: 9_500_000, moveInCostMinor: 40_000_000 }),
    );
    expect(price).toEqual({ lead: "headline", minor: 9_500_000, suffix: "/night" });
  });

  it("leads a sale with its asking price and no period suffix", () => {
    const price = cardPrice(
      listing({ intent: "sale", priceMinor: 52_000_000_000, pricePeriod: undefined }),
    );
    expect(price).toEqual({ lead: "headline", minor: 52_000_000_000, suffix: "" });
  });

  it("answers none rather than zero when the row states no figure at all", () => {
    expect(cardPrice(listing({ priceMinor: 0, pricePeriod: "year" }))).toEqual({ lead: "none" });
  });
});

describe("Message agent on the card (V-26)", () => {
  const base = {
    id: "abc",
    isDemo: false,
    intent: "rent",
    pricePeriod: "year",
  } as unknown as Parameters<typeof cardMessageHref>[0];

  it("a real tenancy carries it, to the bridge every Message agent uses", () => {
    expect(cardMessageHref(base)).toBe("/messages/new?listing=abc");
    expect(cardMessageHref({ ...base, pricePeriod: "month" })).toBe("/messages/new?listing=abc");
  });

  it("an example never does: there is nobody behind it to message", () => {
    expect(cardMessageHref({ ...base, isDemo: true })).toBeNull();
  });

  it("a stay, a table and a sale do not: their next step is elsewhere", () => {
    expect(cardMessageHref({ ...base, pricePeriod: "night" })).toBeNull();
    expect(cardMessageHref({ ...base, pricePeriod: "guest" })).toBeNull();
    expect(cardMessageHref({ ...base, intent: "sale", pricePeriod: undefined })).toBeNull();
  });
});
