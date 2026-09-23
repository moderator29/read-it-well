import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LISTING_SELECTS, mapRow, type ListingRow } from "./supabase-repository";
import { LISTING_ROLES } from "@/lib/supply/roles";

/**
 * THE MIDDLE OF TRACK G'S CHAIN, WHICH IS WHERE IT WAS BROKEN.
 *
 * Both ends of this feature shipped with passing tests and the feature did not
 * work. `lib/supply/roles.test.ts` proved the three sentences existed.
 * `components/app/listing/lister-role-line.test.ts` proved the agent card
 * mounts the component that renders them. Between them sat this read, which
 * never selected `listings.listing_role` and never put it on the domain
 * object, so a reader looking at a listing saw nothing and both green lights
 * stayed green. A column reaches a screen only when THREE things hold at once:
 * it is in the select string, it is on the row type, and the mapper copies it.
 * This file holds the first and the third, against a real row rather than a
 * partial, because a partial would have passed before the fix too.
 *
 * The screen end of the chain is asserted by source, the way
 * `lister-role-line.test.ts` already does and for the reason it gives:
 * `apps/web/vitest.config.ts` aliases the bare specifier `react` at
 * `react.react-server.js` and Vite matches a string alias by PREFIX, so
 * `react/jsx-dev-runtime` cannot resolve and no component in this repository
 * renders to markup under this config. Reading the page's own source is the
 * strongest proof available here, and it fails if somebody deletes the prop.
 */

/** A row with every not-null column filled, as PostgREST would hand one back. */
function row(over: Partial<ListingRow> = {}): ListingRow {
  return {
    id: "ed000000-0000-4000-8000-000000000004",
    reference: "VL-93CAXR",
    title: "Four bedroom detached house, Lekki Phase 1",
    property_type: "home",
    listing_intent: "rent",
    rent_amount_minor: 1_200_000_000,
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
    bedrooms: 4,
    bathrooms: 4,
    featured: false,
    is_demo: true,
    agent_id: "ag000000-0000-4000-8000-000000000001",
    listing_role: "agent",
    power_grid: null,
    power_backup: null,
    power_backup_hours: null,
    water_supply: null,
    prepaid_meter: null,
    has_estate_access: null,
    area: "Lekki Phase 1",
    city: "Lagos",
    state_code: "LA",
    latitude: null,
    longitude: null,
    published_at: "2026-09-01T00:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
    address_verified_at: null,
    physically_inspected_at: null,
    listing_photos: [],
    listing_videos: null,
    listing_amenities: [],
    ...over,
  };
}

const EMPTY = {
  states: new Map<string, string>([["LA", "Lagos"]]),
  amenities: new Map<string, string>(),
  stats: new Map<string, { rating: number; count: number }>(),
  videos: new Map<string, string>(),
  verified: new Set<string>(),
  listerNames: new Map<string, string>(),
};

function map(over: Partial<ListingRow> = {}, listerNames = EMPTY.listerNames) {
  return mapRow(
    row(over),
    EMPTY.states,
    EMPTY.amenities,
    EMPTY.stats,
    EMPTY.videos,
    EMPTY.verified,
    listerNames,
  );
}

describe("the read carries the listing role from the row to the prop", () => {
  it("carries every one of the three values", () => {
    for (const role of LISTING_ROLES) {
      expect(map({ listing_role: role }).listerRole).toBe(role);
    }
  });

  it("carries it on an example listing too, because it is not a claim we make", () => {
    /* `verified` and `rating` are clamped on `is_demo` because they are things
       THIS PLATFORM asserts. Who put the listing up is not; an example listing
       answers it as honestly as a real one and the example banner over the page
       already says what the whole page is. All 64 published rows are examples
       today, so a clamp here would have left the feature invisible again. */
    expect(map({ is_demo: true, listing_role: "owner" }).listerRole).toBe("owner");
    expect(map({ is_demo: true }).verified).toBe(false);
  });

  it("says nothing rather than something wrong when the value is unknown", () => {
    /* A cast would put a fourth enum label straight onto a prop that indexes
       `LISTING_ROLE_SENTENCE`, and the reader would meet `undefined` rendered
       as a sentence. Absent draws no line, which is what the card drew before
       the column existed. */
    for (const bad of [null, "", "landlord", "OWNER", "developer"]) {
      expect(map({ listing_role: bad }).listerRole).toBeUndefined();
    }
  });

  it("does not put the key on the object at all when it is absent", () => {
    /* Not `listerRole: undefined`. An explicit undefined survives a spread and
       would overwrite a value a merged repository had already resolved. */
    expect("listerRole" in map({ listing_role: null })).toBe(false);
  });
});

describe("the column is asked for, in both reads", () => {
  it("is in the card select and the detail select", () => {
    expect(LISTING_SELECTS.card).toMatch(/^\s*listing_role,?$/m);
    expect(LISTING_SELECTS.detail).toMatch(/^\s*listing_role,?$/m);
  });
});

describe("the listing page hands it to the card", () => {
  const page = readFileSync(
    join(__dirname, "..", "..", "app", "(app)", "listing", "[id]", "page.tsx"),
    "utf8",
  );

  it("passes the mapped field to the agent card's prop", () => {
    const call = page.slice(page.indexOf("<ListingAgentCard"));
    expect(call.slice(0, call.indexOf("/>"))).toMatch(/listingRole=\{listing\.listerRole/);
  });

  /* THE NAME IS THE OTHER HALF AND IT WAS THE HALF THAT DREW NOTHING.
     Two of the three sentences carry `{name}` and `fillLister` refuses to
     print a template with its placeholder showing, so without this prop the
     agent and firm sentences appear on no screen at all. */
  it("passes the lister's name to the same card", () => {
    const call = page.slice(page.indexOf("<ListingAgentCard"));
    expect(call.slice(0, call.indexOf("/>"))).toMatch(/name=\{listing\.listerName/);
  });
});

describe("the read carries the lister's name from the published view to the prop", () => {
  it("copies a name the view answered with", () => {
    const named = map({}, new Map([["ed000000-0000-4000-8000-000000000004", "Acme Properties Ltd"]]));
    expect(named.listerName).toBe("Acme Properties Ltd");
  });

  /* ABSENT, NOT undefined. An explicit `undefined` survives a spread and
     overwrites a value a merged repository had already resolved, which is the
     same trap `listerRole` is written around two describes above. */
  it("leaves the field absent when the view answered for nobody", () => {
    expect("listerName" in map()).toBe(false);
  });

  /* THE READ IS WIRED, not merely written. A helper nothing calls is what the
     last green light on this track turned out to be. */
  it("the batched read exists and mapRows calls it", () => {
    const source = readFileSync(join(__dirname, "supabase-repository.ts"), "utf8");
    expect(source).toMatch(/from\("listing_lister"\)/);
    expect(source).toMatch(/getListerNames\(supabase, rows\.map/);
    /* And it reads the view rather than the table it must never touch. */
    const helper = source.slice(source.indexOf("async function getListerNames"));
    expect(helper.slice(0, helper.indexOf("\n}"))).not.toMatch(/from\("agents"\)/);
  });
});
