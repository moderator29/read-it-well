import { describe, expect, it } from "vitest";
import reviewerCases from "./rule-ten-cases.json";
import { getDictionary } from "@vallo/i18n";
import {
  doorCardFromRow,
  doorFigures,
  doorLines,
  doorPlace,
  doorSignInHref,
  doorUtilities,
  isDoorKey,
  isPreviewAgent,
  stayLines,
  type DoorRow,
} from "./door";

const copy = getDictionary("en").frontDoor.door;

/** A published, real, two-bed tenancy, as `public.share_door` returns it. */
function row(overrides: Partial<DoorRow> = {}): DoorRow {
  return {
    state: "listing",
    listing_id: "3f0e1c1a-0000-4000-8000-000000000001",
    reference: "VL-7K4MQP",
    is_demo: false,
    title: "Two bedroom flat",
    area: "Yaba",
    city: "Lagos",
    state_name: "Lagos",
    property_type: "apartment",
    listing_intent: "rent",
    bedrooms: 2,
    rent_amount_minor: "250000000",
    rent_period: "year",
    caution_deposit_minor: 25000000,
    service_charge_minor: null,
    service_charge_period: null,
    agency_fee_minor: 25000000,
    legal_fee_minor: 25000000,
    agreement_fee_minor: null,
    total_move_in_cost_minor: "320000000",
    sale_price_minor: null,
    rate_minor: null,
    rate_period: null,
    photo_path: "owner/listing/one.webp",
    price_share_id: null,
    ...overrides,
  };
}

describe("the door cannot carry an address, whatever it is handed", () => {
  /*
   * THE FIXTURE WITH AN ADDRESS, which is the test the founder asked for.
   * The database function cannot return these columns (the migration probe
   * proves that against the live schema); this proves the second wall: a row
   * that somehow carried them produces a card, and a set of printed lines,
   * with none of it anywhere in them.
   */
  const poisoned = {
    ...row(),
    address: "14 Admiralty Way",
    landmark: "Opposite the Zzqx filling station",
    latitude: 6.4412,
    longitude: 3.4721,
    location: "0101000020E61000006688635DDCC60B40",
    estate_name: "Zzqx Gardens Estate",
    gate_directions: "Second gate on the left",
    security_phone: "+2348030000000",
    agent_id: "e0000000-0000-4000-8000-000000000002",
  } as unknown as DoorRow;

  it("drops every location and contact field on the way to the card", () => {
    const card = doorCardFromRow(poisoned);
    expect(card?.kind).toBe("listing");
    const text = JSON.stringify(card);
    for (const leak of ["Admiralty", "Zzqx", "6.4412", "3.4721", "0101000020", "Second gate", "+234", "e0000000"]) {
      expect(text, `the card carried ${leak}`).not.toContain(leak);
    }
    if (card?.kind !== "listing") throw new Error("unreachable");
    const lines = JSON.stringify(doorLines(card, copy, "en"));
    expect(lines).not.toContain("Admiralty");
  });

  it("refuses an area typed as a street address, and prints the state instead", () => {
    expect(doorPlace("14 Admiralty Way", null, "Lagos")).toBe("Lagos");
    expect(doorPlace("No. 3 Bode Thomas", "Lagos", "Lagos")).toBe("Lagos");
    /* A city not on the closed city list is free text too, and falls to the state. */
    expect(doorPlace("No. 3 Bode Thomas", "Surulere", "Lagos")).toBe("Lagos");
  });

  it("refuses an estate or street name as an area", () => {
    expect(doorPlace("Lekki Gardens Estate", "Lagos", "Lagos")).toBe("Lagos");
    expect(doorPlace("Admiralty Way", null, "Lagos")).toBe("Lagos");
    expect(doorPlace("Bourdillon Road", "Ikoyi", "Lagos")).toBe("Lagos");
    expect(doorPlace("Ikota Villa", null, "Lagos")).toBe("Lagos");
  });

  it("keeps an ordinary neighbourhood name, with the state", () => {
    expect(doorPlace("Yaba", "Lagos", "Lagos")).toBe("Yaba, Lagos");
    expect(doorPlace("Lekki Phase 1", "Lagos", "Lagos")).toBe("Lekki Phase 1, Lagos");
    expect(doorPlace("Wuse 2", "Abuja", "Federal Capital Territory")).toBe(
      "Wuse 2, Federal Capital Territory",
    );
    expect(doorPlace("Lagos", null, "Lagos")).toBe("Lagos");
    expect(doorPlace(null, null, null)).toBeNull();
  });
});

describe("the lister's TITLE is text a lister typed, and it is held to the same rule", () => {
  const cases: [string, string][] = [
    ["2 bed flat, 14 Admiralty Way", "2 bedroom flat in Yaba"],
    ["Lovely duplex on Admiralty Way", "2 bedroom flat in Yaba"],
    ["Flat in Lekki Gardens Estate", "2 bedroom flat in Yaba"],
    ["No. 5 Bode Thomas mini flat", "2 bedroom flat in Yaba"],
    ["Plot 12 serviced apartment", "2 bedroom flat in Yaba"],
    ["2 bed flat opposite the Mobil filling station", "2 bedroom flat in Yaba"],
  ];
  for (const [typed, shown] of cases) {
    it(`never prints "${typed}"`, () => {
      const card = doorCardFromRow(row({ title: typed }));
      if (card?.kind !== "listing") throw new Error("expected a listing card");
      const lines = doorLines(card, copy, "en");
      expect(lines.title).toBe(shown);
      expect(JSON.stringify({ card, lines })).not.toContain(typed);
    });
  }

  it("never prints the lister's title, however ordinary: the heading is always composed", () => {
    const card = doorCardFromRow(row({ title: "Bright two bedroom flat with a prepaid meter" }));
    if (card?.kind !== "listing") throw new Error("expected a listing card");
    expect(doorLines(card, copy, "en").title).toBe("2 bedroom flat in Yaba");
  });

  it("prints none of the reviewer's cases, typed as a title, an area or a city", () => {
    const listed = new Set(["lekki phase 1", "yaba", "ikeja gra", "wuse 2", "victoria island", "parkview", "banana island"]);
    for (const text of reviewerCases as string[]) {
      const card = doorCardFromRow(row({ title: text, area: text, city: text }));
      if (card?.kind !== "listing") throw new Error("expected a listing card");
      const lines = doorLines(card, copy, "en");
      const printed = JSON.stringify({ card, lines, place: card.place });
      if (listed.has(text.trim().toLowerCase())) continue;
      /* "2 bedroom flat" is also what the card composes from its own facts. */
      if (lines.title.startsWith(text)) continue;
      expect(printed, text).not.toContain(text);
    }
  });

  it("composes by type when there is no area it may print", () => {
    const shop = doorCardFromRow(row({ title: "Shop at 3 Allen Avenue", property_type: "shop", area: "Allen Avenue", city: null, bedrooms: null }));
    if (shop?.kind !== "listing") throw new Error("expected a listing card");
    expect(doorLines(shop, copy, "en").title).toBe("Shop");
    const house = doorCardFromRow(row({ title: "12 Chevron Drive", property_type: "home", bedrooms: 4, area: "Lekki" }));
    if (house?.kind !== "listing") throw new Error("expected a listing card");
    expect(doorLines(house, copy, "en").title).toBe("4 bedroom house in Lekki");
  });
});

describe("the card rule: move-in total first, rent second", () => {
  it("leads a tenancy with the stated move-in total", () => {
    const card = doorCardFromRow(row());
    if (card?.kind !== "listing") throw new Error("expected a listing card");
    expect(card.figures).toEqual({
      kind: "move_in",
      moveInMinor: 320000000,
      rentMinor: 250000000,
      rentPeriod: "year",
    });
    const lines = doorLines(card, copy, "en");
    expect(lines.headline).toMatch(/to move in$/);
    expect(lines.headline).toContain("3.2m");
    expect(lines.second).toMatch(/^Rent .*2\.5m a year$/);
    expect(lines.bedrooms).toBe("2 bedrooms");
  });

  it("uses the sum of the named parts when no total was stated, never zero", () => {
    const figures = doorFigures(row({ total_move_in_cost_minor: null }));
    expect(figures).toMatchObject({ kind: "move_in", moveInMinor: 325000000 });
  });

  it("prints nothing when nothing was stated, rather than a naira sign and a zero", () => {
    const card = doorCardFromRow(
      row({
        rent_amount_minor: null,
        caution_deposit_minor: null,
        agency_fee_minor: null,
        legal_fee_minor: null,
        total_move_in_cost_minor: null,
      }),
    );
    if (card?.kind !== "listing") throw new Error("expected a listing card");
    expect(card.figures).toEqual({ kind: "none" });
    expect(doorLines(card, copy, "en").headline).toBeNull();
  });

  it("prices a sale by its asking price and a nightly listing by the night", () => {
    expect(doorFigures(row({ listing_intent: "sale", sale_price_minor: "18000000000" }))).toEqual({
      kind: "sale",
      priceMinor: 18000000000,
    });
    expect(
      doorFigures(
        row({
          rent_amount_minor: null,
          caution_deposit_minor: null,
          agency_fee_minor: null,
          legal_fee_minor: null,
          total_move_in_cost_minor: null,
          rate_minor: 8500000,
          rate_period: "night",
        }),
      ),
    ).toEqual({ kind: "night", rateMinor: 8500000 });
  });

  it("names a studio as a studio", () => {
    const card = doorCardFromRow(row({ bedrooms: 0 }));
    if (card?.kind !== "listing") throw new Error("expected a listing card");
    expect(doorLines(card, copy, "en").bedrooms).toBe("Studio");
  });
});

describe("examples, gone listings and nonsense", () => {
  it("turns an example into a card with no title, place or figure, even if they arrived", () => {
    const card = doorCardFromRow(row({ is_demo: true }));
    expect(card).toEqual({
      kind: "example",
      listingId: "3f0e1c1a-0000-4000-8000-000000000001",
      reference: "VL-7K4MQP",
    });
    expect(JSON.stringify(card)).not.toContain("Yaba");
    expect(JSON.stringify(card)).not.toContain("320000000");
  });

  it("treats an unknown example flag as an example, failing towards printing less", () => {
    expect(doorCardFromRow(row({ is_demo: null }))?.kind).toBe("example");
  });

  it("answers gone for an unpublished listing and nothing for rubbish", () => {
    expect(doorCardFromRow(row({ state: "gone" }))).toEqual({ kind: "gone" });
    expect(doorCardFromRow(null)).toBeNull();
    expect(doorCardFromRow(row({ state: "something" }))).toBeNull();
    /* An empty title is composed from facts, never a card with no heading. */
    const blank = doorCardFromRow(row({ title: "  " }));
    if (blank?.kind !== "listing") throw new Error("expected a listing card");
    expect(doorLines(blank, copy, "en").title).toBe("2 bedroom flat in Yaba");
  });

  it("opens a price area card by its share id", () => {
    expect(doorCardFromRow(row({ state: "price_area", price_share_id: "abc" }))).toEqual({
      kind: "price_area",
      shareId: "abc",
    });
  });
});

describe("the way in", () => {
  it("carries the listing through sign in as next", () => {
    const card = doorCardFromRow(row());
    if (!card) throw new Error("expected a card");
    expect(doorSignInHref(card)).toBe(
      "/sign-in?next=%2Flisting%2F3f0e1c1a-0000-4000-8000-000000000001",
    );
    expect(doorSignInHref({ kind: "price_area", shareId: "x" })).toBe("/sign-in?next=%2Fprice");
    expect(doorSignInHref({ kind: "gone" })).toBe("/sign-in");
  });

  it("asks the database only about keys shaped like a token or a code", () => {
    expect(isDoorKey("k7m2qp9xza")).toBe(true);
    expect(isDoorKey("VL-7K4MQP")).toBe(true);
    expect(isDoorKey("vl7k4mqp")).toBe(true);
    expect(isDoorKey("wp-admin")).toBe(false);
    expect(isDoorKey("k7m2qp9xz1")).toBe(false);
    expect(isDoorKey("VL-100000")).toBe(false);
  });
});

describe("power and water in words, for the Status picture (V-71)", () => {
  const status = getDictionary("en").frontDoor.status;
  it("says only what was stated", () => {
    const both = doorCardFromRow(row({ power_grid: "BAND_A", water_supply: "BOREHOLE" }));
    if (both?.kind !== "listing") throw new Error("expected a listing card");
    expect(doorUtilities(both, status)).toBe("Band A light · Borehole water");
    const none = doorCardFromRow(row());
    if (none?.kind !== "listing") throw new Error("expected a listing card");
    expect(doorUtilities(none, status)).toBeNull();
  });

  it("carries no utility on an example", () => {
    expect(doorCardFromRow(row({ is_demo: true, power_grid: "BAND_A" }))).not.toHaveProperty("powerGrid");
  });
});

describe("a door for a stay (V-07 carry-over)", () => {
  /** A published, real stay, as the stay branch of `public.share_door` returns it. */
  function stayRow(overrides: Partial<DoorRow> = {}): DoorRow {
    return row({
      state: "stay",
      listing_id: "ea000000-0000-4000-8000-000000000001",
      reference: null,
      title: "The Palms Rest",
      area: "Ikoyi",
      city: "Lagos",
      property_type: "stay",
      listing_intent: null,
      bedrooms: null,
      rent_amount_minor: null,
      caution_deposit_minor: null,
      agency_fee_minor: null,
      legal_fee_minor: null,
      total_move_in_cost_minor: null,
      /* A rate that somehow arrived is never printed: a stay's rate depends on dates. */
      rate_minor: 8500000,
      rate_period: "night",
      photo_path: "owner/stay/one.webp",
      ...overrides,
    });
  }

  it("prints the area and no name and no figure, and leads to /stay/<id> through sign in", () => {
    const card = doorCardFromRow(stayRow());
    if (card?.kind !== "stay") throw new Error("expected a stay card");
    expect(card.place).toBe("Ikoyi, Lagos");
    const lines = stayLines(card, copy);
    expect(lines.title).toBe("A stay in Ikoyi");
    expect(JSON.stringify({ card, lines })).not.toContain("Palms");
    expect(lines.headline).toBe(copy.stay.rates);
    expect(JSON.stringify({ card, lines })).not.toMatch(/85,000|8500000|85k/);
    expect(doorSignInHref(card)).toBe("/sign-in?next=%2Fstay%2Fea000000-0000-4000-8000-000000000001");
  });

  it("composes a title when the stay's name carries a street", () => {
    const card = doorCardFromRow(stayRow({ title: "12 Admiralty Way Suites", area: "Victoria Island" }));
    if (card?.kind !== "stay") throw new Error("expected a stay card");
    expect(stayLines(card, copy).title).toBe("A stay in Victoria Island");
    expect(JSON.stringify(card)).not.toContain("Admiralty");
  });

  it("turns an example stay into an example card that still leads to the stay", () => {
    const card = doorCardFromRow(stayRow({ is_demo: true }));
    expect(card).toEqual({ kind: "example", listingId: "ea000000-0000-4000-8000-000000000001", reference: null, stay: true });
    if (!card) throw new Error("expected a card");
    expect(doorSignInHref(card)).toBe("/sign-in?next=%2Fstay%2Fea000000-0000-4000-8000-000000000001");
  });

  it("says gone in a stay's words when the stay is unpublished", () => {
    expect(doorCardFromRow(stayRow({ state: "gone", listing_id: null }))).toEqual({ kind: "gone", stay: true });
  });
});

describe("the counter leaves link previews out (V-71 review)", () => {
  it("knows the common unfurlers and not a phone's browser", () => {
    expect(isPreviewAgent("WhatsApp/2.23.20.0 A")).toBe(true);
    expect(isPreviewAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isPreviewAgent("TelegramBot (like TwitterBot)")).toBe(true);
    expect(isPreviewAgent("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36")).toBe(false);
    expect(isPreviewAgent(null)).toBe(false);
  });
});
