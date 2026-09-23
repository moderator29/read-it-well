import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { shareFromRow } from "./mapping";
import { shareHref, shareLines, shareMonth } from "./share-card";
import { shareAreaSchema } from "./schema";
import { SHARE_CARD_FOOTER } from "./disclaimer";
import type { AreaShare } from "./types";
import type { ShareCardCopy } from "./share-card";

/**
 * THE WORDS ON THE ONE ARTEFACT THAT LEAVES THIS PRODUCT.
 *
 * A share card is forwarded far past the circle it was sent into, which is the
 * premise the whole share rule rests on. It is therefore the piece of this
 * feature least likely to be looked at again by anybody who could tell that it
 * was wrong, and the piece most likely to be read by somebody who never saw
 * the screen it came from. That is what these tests are for.
 *
 * THEY TEST THE SHAPE OF THE RULE AND NOT ONLY THE SHAPE OF THE STRINGS. The
 * database is the real enforcement - two enum labels, four absent columns, a
 * check constraint - and `scripts/probes/price_check_share_cannot_carry_an_address.sql`
 * reads all of it back from the live estate. What a unit test can add is the
 * PRODUCT SIDE of the same rule: that no module in this folder has a field, a
 * parameter or a code path that could carry an address to the database in the
 * first place. A constraint refusing something the client never sends is a
 * belt over braces, and this is the braces.
 */

const COPY: ShareCardCopy = {
  headline: "{bedrooms} bedroom {type} in {area}",
  headlineNoBedrooms: "{type} in {area}",
  headlineStudio: "Studio {type} in {area}",
  range: "Asking {low} to {high} {period}",
  perYear: "a year",
  perProperty: "for a property like this",
  basis: "Based on {count} Vallo listings, {month}",
  basisNoDate: "Based on {count} Vallo listings",
  typeNames: {
    apartment: "flats",
    home: "houses",
    shop: "shops",
    office: "offices",
    any: "Properties",
  },
};

function share(over: Partial<AreaShare> = {}): AreaShare {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    scope: "area_and_type",
    stateCode: "LA",
    lgaCode: null,
    area: "Lekki Phase 1",
    propertyType: "apartment",
    listingIntent: "rent",
    bedrooms: 3,
    lowMinor: 750_000_000,
    midMinor: 820_000_000,
    highMinor: 900_000_000,
    listingCount: 9,
    oldestAt: "2026-02-04T00:00:00Z",
    newestAt: "2026-09-02T00:00:00Z",
    createdAt: "2026-09-23T00:00:00Z",
    ...over,
  };
}

describe("a card says an area and a type and never an address", () => {
  it("names the area, the type and the bedroom count", () => {
    const lines = shareLines(share(), COPY, "en", "Lagos");
    expect(lines.headline).toBe("3 bedroom flats in Lekki Phase 1");
  });

  it("says the state when the card has no area, rather than inventing one", () => {
    const lines = shareLines(share({ area: null, scope: "area", propertyType: null, bedrooms: null }), COPY, "en", "Lagos");
    expect(lines.headline).toBe("Properties in Lagos");
  });

  it("calls a zero bedroom card a studio rather than a nought bedroom flat", () => {
    const lines = shareLines(share({ bedrooms: 0 }), COPY, "en", "Lagos");
    expect(lines.headline).toBe("Studio flats in Lekki Phase 1");
  });

  it("never lets a placeholder out, whatever the card is missing", () => {
    const cases: Partial<AreaShare>[] = [
      {},
      { area: null },
      { bedrooms: null },
      { bedrooms: 0 },
      { propertyType: null, bedrooms: null, scope: "area" },
      { newestAt: null, oldestAt: null },
      { listingIntent: "sale" },
    ];
    for (const over of cases) {
      const lines = shareLines(share(over), COPY, "en", "Lagos");
      for (const line of [lines.headline, lines.range, lines.basis, lines.footer]) {
        expect(line).not.toMatch(/\{\w+\}/);
        expect(line).not.toContain("undefined");
        expect(line).not.toContain("null");
        expect(line).not.toContain("NaN");
      }
    }
  });
});

describe("every figure on a card prints the count it came from", () => {
  it("puts the listing count in the basis line", () => {
    expect(shareLines(share({ listingCount: 9 }), COPY, "en", "Lagos").basis).toBe(
      "Based on 9 Vallo listings, September 2026",
    );
  });

  it("drops the month rather than inventing one when the row carries no dates", () => {
    expect(shareLines(share({ newestAt: null }), COPY, "en", "Lagos").basis).toBe(
      "Based on 9 Vallo listings",
    );
    expect(shareMonth(null, "en")).toBeNull();
    expect(shareMonth("not a date", "en")).toBeNull();
  });

  it("carries the asking-not-sold footer on every card, unchanged", () => {
    expect(shareLines(share(), COPY, "en", "Lagos").footer).toBe(SHARE_CARD_FOOTER);
    /* A FRAGMENT MAY NOT CARRY THE REGULATED WORD. The footer travels without
       the sentence that disclaims it, and the word without that sentence is
       the implication the Act is about. */
    expect(SHARE_CARD_FOOTER.toLowerCase()).not.toContain("valu");
  });

  it("draws a range and never a midpoint", () => {
    /* A range whose middle is emphasised is a point estimate with decoration,
       which is the thing this feature exists to refuse to build. `midMinor` is
       stored so the card is a complete record; no line prints it. */
    const lines = shareLines(share({ midMinor: 820_000_000 }), COPY, "en", "Lagos");
    expect(lines.range).toContain("₦7.5m");
    expect(lines.range).toContain("₦9m");
    expect(lines.range).not.toContain("8.2");
  });
});

describe("a row that cannot be read honestly is not a card", () => {
  const row = {
    id: "11111111-1111-4111-8111-111111111111",
    scope: "area_and_type",
    state_code: "LA",
    lga_code: null,
    area: "Lekki Phase 1",
    property_type: "apartment",
    listing_intent: "rent",
    bedrooms: 3,
    /* POSTGREST SENDS A bigint AS A STRING, and every figure here is one. */
    low_minor: "750000000",
    mid_minor: "820000000",
    high_minor: "900000000",
    listing_count: 9,
    oldest_at: "2026-02-04T00:00:00Z",
    newest_at: "2026-09-02T00:00:00Z",
    created_at: "2026-09-23T00:00:00Z",
  };

  it("reads the string-encoded bigints as money rather than as NaN", () => {
    const mapped = shareFromRow(row);
    expect(mapped?.lowMinor).toBe(750_000_000);
    expect(mapped?.highMinor).toBe(900_000_000);
  });

  it("refuses a row missing a figure instead of printing a zero", () => {
    expect(shareFromRow({ ...row, low_minor: null })).toBeNull();
    expect(shareFromRow({ ...row, high_minor: "" })).toBeNull();
  });

  it("refuses a row built from fewer than three listings", () => {
    expect(shareFromRow({ ...row, listing_count: 2 })).toBeNull();
    expect(shareFromRow({ ...row, listing_count: null })).toBeNull();
  });

  it("refuses a scope it does not recognise rather than casting it", () => {
    expect(shareFromRow({ ...row, scope: "property" })).toBeNull();
    expect(shareFromRow({ ...row, scope: "address" })).toBeNull();
  });

  it("keeps a zero bedroom count as a studio and not as an absent one", () => {
    expect(shareFromRow({ ...row, bedrooms: 0 })?.bedrooms).toBe(0);
    expect(shareFromRow({ ...row, bedrooms: null })?.bedrooms).toBeNull();
  });
});

describe("nothing on the product side can carry an address to the database", () => {
  /** Every module that touches a share, read as source. */
  const FOLDER = __dirname;
  const sources = readdirSync(FOLDER)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => [name, readFileSync(join(FOLDER, name), "utf8")] as const);

  it("the share schema has no field for a point, an address or a listing", () => {
    /* The schema is the product-side half of the rule. Parsing an object with
       these keys must DROP them rather than pass them on: zod strips unknown
       keys, and this asserts that none of them is a known one. */
    const parsed = shareAreaSchema.parse({
      scope: "area_and_type",
      stateCode: "LA",
      area: "Lekki Phase 1",
      propertyType: "apartment",
      listingIntent: "rent",
      bedrooms: 3,
      lowMinor: 1,
      midMinor: 1,
      highMinor: 1,
      listingCount: 3,
      lat: 6.44,
      lng: 3.47,
      address: "14 Admiralty Way",
      listingId: "11111111-1111-4111-8111-111111111111",
      hint: "the blue gate",
    });
    for (const banned of ["lat", "lng", "address", "listingId", "hint"]) {
      expect(banned in parsed, `shareAreaSchema accepted ${banned}`).toBe(false);
    }
  });

  it("the share card's own type has no field an address could sit in", () => {
    const types = readFileSync(join(FOLDER, "types.ts"), "utf8");
    const block = types.slice(types.indexOf("export type AreaShare = {"));
    const body = block.slice(0, block.indexOf("\n};"));
    /* Comments are stripped first. This file's own doc comments NAME the
       forbidden fields in order to explain why they are absent, and a rule
       that cannot tell documentation from a declaration fires on honest work
       and gets deleted rather than obeyed. */
    const declarations = body.replace(/\/\*[\s\S]*?\*\//g, " ");
    for (const banned of ["lat", "lng", "address", "latitude", "longitude", "listingId", "hint"]) {
      expect(declarations, `AreaShare declares ${banned}`).not.toMatch(
        new RegExp(`\\b${banned}\\s*[?]?:`),
      );
    }
  });

  it("no module in this folder ever passes a point or an address to the database", () => {
    /* `p_lat` and `p_lng` ARE parameters of `estimate_value`, `comparable_listings`
       and `comparable_supply_near`, which is correct and is how the gate finds
       anything: those are asked WITH a point and store none. The ones below
       exist nowhere in this feature's database surface at all, so a module
       naming one is a module that grew a column somewhere. */
    for (const [name, source] of sources) {
      const stripped = source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
      for (const banned of ["p_address", "p_latitude", "p_longitude", "p_hint", "p_landmark"]) {
        expect(stripped, `${name} passes ${banned}`).not.toContain(banned);
      }
    }
  });

  it("the call that mints a card passes no point, no address and no listing", () => {
    /*
     * SCOPED TO THE ONE CALL, because `p_listing_id` is a REAL parameter of
     * `record_price_check_event` and passing it there is right: a check
     * started from a listing page records which listing it came from, in a
     * table only an admin can read. On a SHARE it would be the whole of the
     * rule broken, so the assertion reads the share call and not the file.
     */
    const actions = readFileSync(join(FOLDER, "actions.ts"), "utf8");
    const start = actions.indexOf('"create_price_check_share"');
    expect(start, "the share writer is no longer called the way this test reads it").toBeGreaterThan(-1);
    const call = actions.slice(start, actions.indexOf("},", actions.indexOf("{", start)));
    for (const banned of ["p_lat", "p_lng", "p_address", "p_listing_id", "p_hint"]) {
      expect(call, `the share writer is handed ${banned}`).not.toContain(banned);
    }
    /* And it IS handed the count, because a figure with no count beside it is
       the thing this whole feature refuses to produce. */
    expect(call).toContain("p_listing_count");
  });

  it("the card's destination is an opaque id and carries nothing else", () => {
    const href = shareHref("11111111-1111-4111-8111-111111111111");
    expect(href).toBe("/price/area/11111111-1111-4111-8111-111111111111");
    /* A URL is the part of an artefact most likely to be pasted somewhere the
       card itself never reaches, so it carries no state, no area, no type and
       no figure: an id read out of context says nothing at all. */
    expect(href).not.toMatch(/[?&]/);
  });

  it("the read asks for named columns and never for created_by", () => {
    /* A card says what an area is asking. It never says who asked. `select("*")`
       here would start returning the minter's uuid the moment somebody widened
       the grant again, and nothing would report it. */
    const rpc = readFileSync(join(FOLDER, "rpc.ts"), "utf8");
    const select = rpc.slice(rpc.indexOf("export const SHARE_SELECT"));
    const literal = select.slice(0, select.indexOf(";"));
    expect(literal).toContain("low_minor");
    expect(literal).not.toContain("created_by");
    expect(literal).not.toContain("*");
  });
});
