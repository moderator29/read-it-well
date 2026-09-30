import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { comparable, compareTable, forSelection, markLowest } from "./compare";

const en = getDictionary("en");
const cc = en.catalogue.compare;
const copy = {
  moveIn: cc.moveIn,
  rent: cc.rent,
  beds: cc.beds,
  baths: cc.baths,
  size: cc.size,
  parking: cc.parking,
  type: cc.type,
  power: cc.power,
  availableFrom: cc.availableFrom,
  from: cc.from,
};

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "a",
    slug: "a",
    title: "A flat",
    kind: "apartment",
    area: "Yaba",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 200_000_000,
    pricePeriod: "year",
    intent: "rent",
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

describe("markLowest", () => {
  it("marks the lowest of two or more stated figures", () => {
    expect(markLowest([300, 200, undefined])).toEqual([false, true, false]);
  });
  it("marks nothing for one figure or a tie", () => {
    expect(markLowest([300, undefined])).toEqual([false, false]);
    expect(markLowest([300, 300])).toEqual([false, false]);
  });
});

describe("compareTable and forSelection (B3)", () => {
  const table = compareTable(
    [
      listing({ id: "a", moveInCostMinor: 330_000_000, agencyFeeMinor: 20_000_000, sizeSqm: 120 }),
      listing({ id: "b", priceMinor: 180_000_000, moveInCostMinor: 290_000_000, moveInCostStated: false }),
      listing({ id: "c", isDemo: true }),
    ],
    "en",
    copy,
    en.moveIn,
  );

  it("says Not stated (null) rather than zero", () => {
    const view = forSelection(table, ["a", "b"]);
    const agency = view.rows.find((r) => r.key === "agency")!;
    expect(agency.cells[1]!.text).toBeNull();
    const size = view.rows.find((r) => r.key === "size")!;
    expect(size.cells[1]!.text).toBeNull();
  });

  it("marks the lowest among the chosen columns only", () => {
    const ab = forSelection(table, ["a", "b"]);
    const moveIn = ab.rows.find((r) => r.key === "moveIn")!;
    expect(moveIn.cells.map((c) => c.lowest)).toEqual([false, true]);
    expect(moveIn.cells[1]!.text).toMatch(/^from /);
    const rent = ab.rows.find((r) => r.key === "rent")!;
    expect(rent.cells.map((c) => c.lowest)).toEqual([false, true]);
  });

  it("keeps the chosen order and carries the Example mark", () => {
    const view = forSelection(table, ["c", "a"]);
    expect(view.columns.map((c) => c.id)).toEqual(["c", "a"]);
    expect(view.columns[0]!.mark).toBe("example");
  });

  it("drops a row nobody stated", () => {
    const view = forSelection(table, ["b", "c"]);
    expect(view.rows.some((r) => r.key === "size")).toBe(false);
  });

  it("offers properties, not stays", () => {
    expect(comparable({ kind: "apartment" })).toBe(true);
    expect(comparable({ kind: "hotel" })).toBe(false);
  });
});
