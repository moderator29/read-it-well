import { describe, expect, it } from "vitest";
import {
  areaDatasetJsonLd,
  areaPageRowFromRow,
  publicAskingRows,
  qualifyingPages,
  resolveAreaPage,
  rowAsShare,
  slugify,
  type AreaPageRow,
} from "./pages";
import { MINIMUM_COMPARABLES } from "../price-check/gate";
import type { AreaAskingRow } from "../price-check/types";

function page(overrides: Partial<AreaPageRow> = {}): AreaPageRow {
  return {
    stateCode: "LA",
    stateName: "Lagos",
    area: "Yaba",
    listingCount: 7,
    newestAt: "2026-09-01T10:00:00Z",
    ...overrides,
  };
}

const asking: AreaAskingRow = {
  scope: "area",
  propertyType: "apartment",
  bedrooms: 2,
  listingCount: 6,
  p25Minor: 180000000,
  medianMinor: 220000000,
  p75Minor: 260000000,
  sizedCount: 0,
  medianPerSqmMinor: null,
  oldestAt: "2026-03-02T00:00:00Z",
  newestAt: "2026-09-01T00:00:00Z",
};

describe("the gate: a page exists only where the Price Check floor is met", () => {
  it("is the Price Check minimum and not a number of its own", () => {
    expect(MINIMUM_COMPARABLES).toBe(5);
  });

  it("produces zero pages from zero real listings, which is today", () => {
    expect(qualifyingPages([])).toEqual([]);
  });

  it("refuses an area one listing short of the floor", () => {
    expect(qualifyingPages([page({ listingCount: MINIMUM_COMPARABLES - 1 })])).toEqual([]);
  });

  it("accepts an area at the floor, with a readable path", () => {
    const [yaba] = qualifyingPages([page({ listingCount: MINIMUM_COMPARABLES })]);
    expect(yaba?.path).toBe("/areas/lagos/yaba");
  });

  it("never builds a page titled with a street, an estate or a house number, whatever the count", () => {
    for (const area of ["14 Admiralty Way", "No. 3 Bode Thomas", "Admiralty Way", "Chevron Drive", "Lekki Gardens Estate", "Plot 12"]) {
      expect(qualifyingPages([page({ area, listingCount: 40 })]), area).toEqual([]);
    }
  });

  it("prints a type and bedroom count only with the Price Check minimum behind it", () => {
    const rows = [{ listingCount: 3 }, { listingCount: 4 }, { listingCount: 5 }, { listingCount: 9 }];
    expect(publicAskingRows(rows)).toEqual([{ listingCount: 5 }, { listingCount: 9 }]);
  });

  it("folds two spellings that slug alike into one page, keeping the first", () => {
    const pages = qualifyingPages([
      page({ area: "Lekki Phase 1", listingCount: 9 }),
      page({ area: "lekki phase 1", listingCount: 5 }),
    ]);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.area).toBe("Lekki Phase 1");
    expect(pages[0]?.path).toBe("/areas/lagos/lekki-phase-1");
  });

  it("resolves only a slug pair in the list, so anything else is a 404", () => {
    const pages = qualifyingPages([page()]);
    expect(resolveAreaPage("lagos", "yaba", pages)?.area).toBe("Yaba");
    expect(resolveAreaPage("LAGOS", "Yaba", pages)?.area).toBe("Yaba");
    expect(resolveAreaPage("lagos", "surulere", pages)).toBeNull();
    expect(resolveAreaPage("lagos", "yaba", [])).toBeNull();
  });
});

describe("reading the rows", () => {
  it("parses the database row, bigint counts arriving as strings", () => {
    expect(
      areaPageRowFromRow({
        state_code: "FC",
        state_name: "Federal Capital Territory",
        area: " Wuse 2 ",
        listing_count: "6",
        newest_at: "2026-09-01T00:00:00Z",
      }),
    ).toEqual({
      stateCode: "FC",
      stateName: "Federal Capital Territory",
      area: "Wuse 2",
      listingCount: 6,
      newestAt: "2026-09-01T00:00:00Z",
    });
    expect(areaPageRowFromRow({ state_code: "LA" })).toBeNull();
  });

  it("slugs what people type", () => {
    expect(slugify("Federal Capital Territory")).toBe("federal-capital-territory");
    expect(slugify("Victoria Island (VI)")).toBe("victoria-island-vi");
    expect(slugify("  Ọ̀yọ́ ")).toBe("oyo");
  });
});

describe("the structured data is a Dataset and never an Offer", () => {
  it("names the area, the range and the count, and nothing a crawler could sell", () => {
    const [yaba] = qualifyingPages([page()]);
    if (!yaba) throw new Error("expected a page");
    const node = areaDatasetJsonLd(yaba, [asking], "https://www.vallospaces.com/", "Asking rents.");
    expect(node["@type"]).toBe("Dataset");
    const text = JSON.stringify(node);
    expect(text).not.toContain("Offer");
    expect(text).not.toContain("geo");
    expect(node.url).toBe("https://www.vallospaces.com/areas/lagos/yaba");
    expect(node.temporalCoverage).toBe("2026-03-02/2026-09-01");
    expect(text).toContain("Interquartile range of 6 listings");
  });

  it("words an asking row with the share card's own shape", () => {
    const [yaba] = qualifyingPages([page()]);
    if (!yaba) throw new Error("expected a page");
    const share = rowAsShare(yaba, asking);
    expect(share).toMatchObject({
      area: "Yaba",
      bedrooms: 2,
      lowMinor: 180000000,
      highMinor: 260000000,
      listingCount: 6,
      listingIntent: "rent",
    });
  });
});
