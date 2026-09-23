import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import {
  doorCardFromRow,
  doorFigures,
  doorLines,
  doorPlace,
  doorSignInHref,
  isDoorKey,
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
    expect(doorPlace("No. 3 Bode Thomas", "Surulere", "Lagos")).toBe("Surulere, Lagos");
  });

  it("refuses an estate or street name as an area", () => {
    expect(doorPlace("Lekki Gardens Estate", "Lekki", "Lagos")).toBe("Lekki, Lagos");
    expect(doorPlace("Admiralty Way", null, "Lagos")).toBe("Lagos");
    expect(doorPlace("Bourdillon Road", "Ikoyi", "Lagos")).toBe("Ikoyi, Lagos");
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
    expect(doorCardFromRow(row({ title: "  " }))).toBeNull();
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
