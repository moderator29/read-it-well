import { describe, expect, it } from "vitest";
import { asShelfItem, mergeShelf, SHELF_CAP, shelfFromListing, type ShelfItem } from "./shelf";
import { getDictionary } from "@vallo/i18n";

const SHORT = getDictionary("en").experienceLabels.periodShort;
import type { Listing } from "@/lib/listings/types";

const T0 = Date.parse("2026-09-20T13:02:00Z");
const T1 = Date.parse("2026-09-24T09:00:00Z");

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "3653d202-e498-4db0-ab71-882649f7f446",
    slug: "x",
    title: "Two bedroom flat",
    kind: "property",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos State",
    priceMinor: 240_000_000,
    currency: "NGN",
    pricePeriod: "year",
    intent: "rent",
    moveInCostMinor: 360_000_000,
    moveInCostStated: true,
    bedrooms: 2,
    bathrooms: 2,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    ...over,
  } as unknown as Listing;
}

describe("shelfFromListing", () => {
  it("keeps the card's own figures and no address", () => {
    const item = shelfFromListing(listing(), T0, SHORT);
    expect(item.lead).toBe("moveIn");
    expect(item.minor).toBe(360_000_000);
    expect(item.rentMinor).toBe(240_000_000);
    /* The rent's "/yr", in the reader's words; English byte for byte as before. */
    expect(item.suffix).toBe("/yr");
    expect(item.place).toBe("Yaba, Lagos State");
    expect(item.isDemo).toBe(false);
    for (const banned of ["title", "address", "lat", "lng", "phone", "photos"]) expect(Object.keys(item)).not.toContain(banned);
  });
  it("round-trips through storage", () => {
    const item = shelfFromListing(listing(), T0, SHORT);
    expect(asShelfItem(JSON.parse(JSON.stringify(item)))).toEqual(item);
    expect(asShelfItem({ ...item, version: 1 })).toBeNull();
    expect(shelfFromListing(listing({ isDemo: true }), T0, SHORT).isDemo).toBe(true);
  });
});

describe("mergeShelf", () => {
  const first = shelfFromListing(listing(), T0, SHORT);

  it("reports a rent that moved since the phone first kept it, with that date", () => {
    const now = shelfFromListing(listing({ priceMinor: 260_000_000, moveInCostMinor: 380_000_000 }), T1, SHORT);
    const { items, changes } = mergeShelf([first], [now]);
    expect(items[0]?.firstRentMinor).toBe(240_000_000);
    expect(items[0]?.firstStoredAt).toBe(first.storedAt);
    expect(changes).toEqual([
      { id: first.id, place: first.place, bedrooms: 2, field: "moveIn", wasMinor: 360_000_000, nowMinor: 380_000_000, since: first.storedAt },
      { id: first.id, place: first.place, bedrooms: 2, field: "rent", wasMinor: 240_000_000, nowMinor: 260_000_000, since: first.storedAt },
    ]);
  });
  it("reports nothing when nothing moved", () => {
    expect(mergeShelf([first], [shelfFromListing(listing(), T1, SHORT)]).changes).toEqual([]);
  });
  it("drops what is no longer saved: the account's list is the membership", () => {
    expect(mergeShelf([first], []).items).toEqual([]);
  });
  it("does not call a change of market a change of price", () => {
    const sale = shelfFromListing(listing({ intent: "sale", pricePeriod: undefined, priceMinor: 9_000_000_000 }), T1, SHORT);
    const { items, changes } = mergeShelf([first], [sale]);
    expect(changes).toEqual([]);
    expect(items[0]?.firstMinor).toBe(9_000_000_000);
    expect(sale.suffix).toBe("");
  });
  it("keeps fifty at most", () => {
    const many: ShelfItem[] = Array.from({ length: 60 }, (_, i) => ({
      ...first,
      id: `3653d202-e498-4db0-ab71-${String(i).padStart(12, "0")}`,
    }));
    expect(mergeShelf([], many).items).toHaveLength(SHELF_CAP);
  });
});
