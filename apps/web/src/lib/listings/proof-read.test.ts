import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LISTING_SELECTS, mapRow, type ListingRow } from "./supabase-repository";

/**
 * V-03: THE PROOF STRIP'S DATES, FROM THE ROW TO THE DOMAIN OBJECT.
 *
 * A column reaches a screen only when it is in the select, on the row type and
 * copied by the mapper (lister-role-read.test.ts says why that is three
 * separate failures). This holds all three for the two supply dates and the
 * identity date, and holds the clamp: no example listing carries any of them.
 */

const AGENT = "ag000000-0000-4000-8000-000000000009";

function row(over: Partial<ListingRow> = {}): ListingRow {
  return {
    id: "ed000000-0000-4000-8000-000000000044",
    reference: "VL-PROOF1",
    title: "Two bedroom flat, Yaba",
    property_type: "rental",
    listing_intent: "rent",
    rent_amount_minor: 250_000_000,
    rent_period: "year",
    rent_negotiable: false,
    rate_minor: null,
    rate_period: null,
    sale_price_minor: null,
    price_negotiable: null,
    caution_deposit_minor: null,
    service_charge_minor: null,
    service_charge_period: null,
    agency_fee_minor: null,
    legal_fee_minor: null,
    agreement_fee_minor: null,
    total_move_in_cost_minor: null,
    sale_agency_fee_minor: null,
    sale_legal_fee_minor: null,
    governors_consent_fee_minor: null,
    stamp_duty_minor: null,
    survey_registration_fee_minor: null,
    total_purchase_cost_minor: null,
    minimum_tenancy_months: null,
    available_from: null,
    furnished: null,
    tenure: null,
    sale_status: null,
    year_built: null,
    condition: null,
    size_sqm: null,
    toilets: null,
    parking_spaces: null,
    floor: null,
    total_floors: null,
    bedrooms: 2,
    bathrooms: 2,
    is_demo: false,
    agent_id: AGENT,
    listing_role: "agent",
    power_grid: null,
    power_backup: null,
    power_backup_hours: null,
    water_supply: null,
    prepaid_meter: null,
    has_estate_access: null,
    area: "Yaba",
    city: "Lagos",
    state_code: "LA",
    latitude: null,
    longitude: null,
    published_at: "2026-09-01T00:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
    address_verified_at: null,
    physically_inspected_at: null,
    ownership_verified_at: null,
    mandate_verified_at: null,
    listing_photos: [],
    listing_videos: null,
    listing_amenities: [],
    ...over,
  };
}

type Truth = { attended: number; asListed: number; lastAt: string };

function map(
  over: Partial<ListingRow> = {},
  verified = new Set<string>(),
  seen = new Map<string, string>(),
  truth = new Map<string, Truth>(),
) {
  return mapRow(row(over), new Map([["LA", "Lagos"]]), new Map(), new Map(), new Map(), verified, new Map(), seen, truth);
}

describe("the proof dates are asked for, in both reads", () => {
  it("names both supply dates in the card and the detail select", () => {
    for (const select of [LISTING_SELECTS.card, LISTING_SELECTS.detail]) {
      expect(select).toMatch(/^\s*ownership_verified_at,?$/m);
      expect(select).toMatch(/^\s*mandate_verified_at,?$/m);
      /* The person who made the decision is never read. */
      expect(select).not.toMatch(/supply_verified_by/);
    }
  });

  it("reads the identity date in the same badge query, not a second one", () => {
    const source = readFileSync(join(__dirname, "supabase-repository.ts"), "utf8");
    expect(source).toMatch(/\.select\("agent_id, verified, verified_at"\)/);
  });
});

describe("the mapper carries the dates, and only where they may be printed", () => {
  it("copies a mandate date and an ownership date", () => {
    expect(map({ mandate_verified_at: "2026-08-14T09:00:00Z" }).mandateVerifiedAt).toBe("2026-08-14T09:00:00Z");
    expect(map({ ownership_verified_at: "2026-08-10T09:00:00Z", listing_role: "owner" }).ownershipVerifiedAt).toBe(
      "2026-08-10T09:00:00Z",
    );
  });

  it("leaves the keys absent, not undefined, when the row holds nothing", () => {
    const listing = map();
    expect("mandateVerifiedAt" in listing).toBe(false);
    expect("ownershipVerifiedAt" in listing).toBe(false);
    expect("listerIdentitySeenAt" in listing).toBe(false);
  });

  it("carries the identity date only when the badge itself is true", () => {
    const seen = new Map([[AGENT, "2026-08-12T10:00:00Z"]]);
    expect(map({}, new Set([AGENT]), seen).listerIdentitySeenAt).toBe("2026-08-12T10:00:00Z");
    expect("listerIdentitySeenAt" in map({}, new Set(), seen)).toBe(false);
  });

  it("carries none of them on an example listing", () => {
    const seen = new Map([[AGENT, "2026-08-12T10:00:00Z"]]);
    const listing = map(
      { is_demo: true, mandate_verified_at: "2026-08-14T09:00:00Z" },
      new Set([AGENT]),
      seen,
    );
    expect("mandateVerifiedAt" in listing).toBe(false);
    expect("listerIdentitySeenAt" in listing).toBe(false);
  });
});

describe("V-05: the renters' count reaches the listing", () => {
  const id = "ed000000-0000-4000-8000-000000000044";
  const truth = new Map([[id, { attended: 3, asListed: 3, lastAt: "2026-09-20T10:00:00Z" }]]);

  it("copies the public count for a real listing", () => {
    expect(map({}, new Set(), new Map(), truth).renterTruth).toEqual({ attended: 3, asListed: 3, lastAt: "2026-09-20T10:00:00Z" });
  });

  it("never carries it on an example listing", () => {
    expect("renterTruth" in map({ is_demo: true }, new Set(), new Map(), truth)).toBe(false);
  });

  it("reads the published view, not the table of answers", () => {
    const source = readFileSync(join(__dirname, "supabase-repository.ts"), "utf8");
    expect(source).toMatch(/from\("listing_truth_summary"\)/);
    expect(source).not.toMatch(/from\("inspection_truth"\)/);
  });
});
