import { describe, expect, it } from "vitest";
import { getDictionary } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";
import { cardFacts, cardUtility } from "./listing-card-model";

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
