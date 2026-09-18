import { describe, expect, it, vi } from "vitest";

import type { StaysClient } from "./db";
import { PAGE_SIZE, parseStaysQuery } from "./filters";
import {
  buildStaySearchArgs,
  decodeCursor,
  encodeCursor,
  fromStaysQuery,
  searchStays,
  type StaySearchParams,
} from "./search";
import type { LandmarkHit, StaySearchRow } from "./types";

/**
 * The twelve-filter builder and the paging, proved against a fake client.
 *
 * `buildStaySearchArgs` is pure: every filter must land on exactly one
 * parameter of `public.stays_search`, rubbish must fall away before Postgres
 * sees it, and money must stay integer kobo. `searchStays` is proved with a
 * client that records the call it received and answers with rows, so the
 * cursor arithmetic (offset, ended, next cursor) is checked without a
 * database.
 */

const VI: LandmarkHit = {
  id: "lm-1",
  name: "Victoria Island",
  slug: "victoria-island",
  kind: "business_district",
  state_code: "LA",
  city: "Lagos",
  latitude: 6.4281,
  longitude: 3.4219,
  score: 0.9,
};

function row(i: number, total: number): StaySearchRow {
  return {
    id: `row-${i}`,
    entity_kind: "accommodation",
    entity_id: `acc-${i}`,
    title: `Stay ${i}`,
    area: "Ikoyi",
    city: "Lagos",
    state_code: "LA",
    kind: "hotel",
    source: "first_party",
    verified: false,
    is_demo: true,
    featured: false,
    headline_price_minor: 8_500_000,
    headline_price_period: "night",
    price_band: null,
    max_sleeps: 2,
    cover_path: "/brand/photos/bedroom-01.jpg",
    latitude: 6.45,
    longitude: 3.43,
    rating_avg: null,
    rating_count: 0,
    has_breakfast: true,
    has_free_cancellation: true,
    room_categories: ["double"],
    amenity_codes: ["wifi", "ac"],
    distance_m: null,
    nights: null,
    room_type_id: null,
    rate_plan_id: null,
    nightly_minor: null,
    total_minor: null,
    total_count: total,
  };
}

/** A client that answers `stays_search` with `rows` and records its arguments. */
function fakeClient(rows: StaySearchRow[], landmark: LandmarkHit | null = null) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === "landmarks_resolve") return { data: landmark ? [landmark] : [], error: null };
      return { data: rows, error: null };
    }),
  } as unknown as StaysClient;
  return { client, calls, deps: { client: async () => client, configured: () => true } };
}

describe("buildStaySearchArgs", () => {
  it("sends only the stays kinds, one room and the default order when nothing is asked", () => {
    expect(buildStaySearchArgs({}, null)).toEqual({
      p_entity_kinds: ["listing", "accommodation"],
      p_rooms: 1,
      p_sort: "recommended",
      p_limit: PAGE_SIZE,
      p_offset: 0,
    });
  });

  it("maps every one of the twelve filters onto its parameter", () => {
    const params: StaySearchParams = {
      rating: 4,
      roomType: ["double", "suite"],
      facilities: ["pool", "gym"],
      breakfast: true,
      ac: true,
      parking: true,
      wifi: true,
      verified: true,
      freeCancellation: true,
      nearLandmark: "VI",
      withinKm: 3,
      priceMin: 5_000_000,
      priceMax: 20_000_000,
      location: { stateCode: "la", city: "Lagos", area: "Ikoyi" },
      checkIn: "2026-10-01",
      checkOut: "2026-10-03",
      guests: 2,
      rooms: 1,
    };
    const args = buildStaySearchArgs(params, VI);
    expect(args.p_min_rating).toBe(4);
    expect(args.p_room_categories).toEqual(["double", "suite"]);
    expect(args.p_amenities).toEqual(["pool", "gym", "ac", "parking", "wifi"]);
    expect(args.p_breakfast).toBe(true);
    expect(args.p_verified).toBe(true);
    expect(args.p_free_cancellation).toBe(true);
    expect(args.p_lat).toBe(VI.latitude);
    expect(args.p_lng).toBe(VI.longitude);
    expect(args.p_radius_m).toBe(3000);
    expect(args.p_min_price_minor).toBe(5_000_000);
    expect(args.p_max_price_minor).toBe(20_000_000);
    expect(args.p_state_code).toBe("LA");
    expect(args.p_city).toBe("Lagos");
    expect(args.p_area).toBe("Ikoyi");
    expect(args.p_check_in).toBe("2026-10-01");
    expect(args.p_check_out).toBe("2026-10-03");
    expect(args.p_guests).toBe(2);
  });

  it("sends nothing for a false flag, because the function treats null and false alike", () => {
    const args = buildStaySearchArgs({ breakfast: false, verified: false, freeCancellation: false, ac: false }, null);
    expect(args).not.toHaveProperty("p_breakfast");
    expect(args).not.toHaveProperty("p_verified");
    expect(args).not.toHaveProperty("p_free_cancellation");
    expect(args).not.toHaveProperty("p_amenities");
  });

  it("folds a named facility in once even when it is also listed", () => {
    const args = buildStaySearchArgs({ facilities: ["wifi", "WIFI ", "pool"], wifi: true }, null);
    expect(args.p_amenities).toEqual(["wifi", "pool"]);
  });

  it("drops a single date, a reversed pair and a malformed date rather than sending half a stay", () => {
    expect(buildStaySearchArgs({ checkIn: "2026-10-01" }, null)).not.toHaveProperty("p_check_in");
    expect(buildStaySearchArgs({ checkIn: "2026-10-03", checkOut: "2026-10-01" }, null)).not.toHaveProperty("p_check_out");
    expect(buildStaySearchArgs({ checkIn: "1 Oct", checkOut: "2026-10-03" }, null)).not.toHaveProperty("p_check_in");
  });

  it("keeps money integer kobo and drops a budget that cannot hold anything", () => {
    expect(buildStaySearchArgs({ priceMin: 12.5 }, null)).not.toHaveProperty("p_min_price_minor");
    expect(buildStaySearchArgs({ priceMax: -1 }, null)).not.toHaveProperty("p_max_price_minor");
    const inverted = buildStaySearchArgs({ priceMin: 9_000_000, priceMax: 1_000_000 }, null);
    expect(inverted).not.toHaveProperty("p_min_price_minor");
    expect(inverted).not.toHaveProperty("p_max_price_minor");
  });

  it("refuses a rating, a room category, a guest count or a radius outside its range", () => {
    const args = buildStaySearchArgs(
      { rating: 7, roomType: ["penthouse" as never, "twin"], guests: 99, withinKm: 500, nearLandmark: "VI" },
      VI,
    );
    expect(args).not.toHaveProperty("p_min_rating");
    expect(args.p_room_categories).toEqual(["twin"]);
    expect(args).not.toHaveProperty("p_guests");
    expect(args.p_radius_m).toBe(5000);
  });

  it("scopes a landmark search to the landmark's state unless the address already did", () => {
    expect(buildStaySearchArgs({ nearLandmark: "VI" }, VI).p_state_code).toBe("LA");
    expect(buildStaySearchArgs({ nearLandmark: "VI", location: { stateCode: "FC" } }, VI).p_state_code).toBe("FC");
  });

  it("falls back from a distance sort when there is no point to measure from", () => {
    expect(buildStaySearchArgs({ sort: "distance" }, null).p_sort).toBe("recommended");
    expect(buildStaySearchArgs({ sort: "distance", nearLandmark: "VI" }, VI).p_sort).toBe("distance");
  });

  it("turns a cursor into the offset it names and ignores rubbish", () => {
    expect(decodeCursor(encodeCursor(48))).toBe(48);
    expect(decodeCursor("not a cursor")).toBe(0);
    expect(decodeCursor(Buffer.from("o:-5").toString("base64url"))).toBe(0);
    expect(decodeCursor(null)).toBe(0);
    expect(buildStaySearchArgs({ cursor: encodeCursor(24) }, null).p_offset).toBe(24);
  });

  it("agrees with the URL contract: the parsed query and the contract shape build identical arguments", () => {
    const query = parseStaysQuery(
      { rating: "4", room: "suite", ac: "1", breakfast: "1", min: "50000", max: "200000", page: "2", state: "la" },
      "2026-09-18",
    );
    const viaQuery = buildStaySearchArgs(fromStaysQuery(query), null);
    expect(viaQuery.p_offset).toBe(PAGE_SIZE);
    expect(viaQuery.p_min_price_minor).toBe(5_000_000);
    expect(viaQuery.p_max_price_minor).toBe(20_000_000);
    expect(viaQuery.p_amenities).toEqual(["ac"]);
    expect(viaQuery.p_room_categories).toEqual(["suite"]);
    expect(viaQuery.p_breakfast).toBe(true);
    expect(viaQuery.p_state_code).toBe("LA");
  });
});

describe("searchStays", () => {
  it("returns the page with a cursor to the next one while rows remain", async () => {
    const rows = Array.from({ length: PAGE_SIZE }, (_, i) => row(i, 50));
    const { calls, deps } = fakeClient(rows);
    const page = await searchStays({ location: { city: "Lagos" } }, deps);
    expect(calls[0]?.fn).toBe("stays_search");
    expect(calls[0]?.args.p_city).toBe("Lagos");
    expect(page.rows).toHaveLength(PAGE_SIZE);
    expect(page.total).toBe(50);
    expect(page.ended).toBe(false);
    expect(decodeCursor(page.cursor)).toBe(PAGE_SIZE);
  });

  it("ends the page and drops the cursor once the last row is served", async () => {
    const rows = Array.from({ length: 2 }, (_, i) => row(i, 26));
    const { deps } = fakeClient(rows);
    const page = await searchStays({ cursor: encodeCursor(24) }, deps);
    expect(page.ended).toBe(true);
    expect(page.cursor).toBeNull();
    expect(page.total).toBe(26);
  });

  it("answers an empty shelf as ended rather than as a page with more", async () => {
    const { deps } = fakeClient([]);
    const page = await searchStays({}, deps);
    expect(page).toEqual({ rows: [], total: 0, near: null, cursor: null, ended: true });
  });

  it("resolves the landmark first and measures from it", async () => {
    const { calls, deps } = fakeClient([row(0, 1)], VI);
    const page = await searchStays({ nearLandmark: "VI", withinKm: 2 }, deps);
    expect(calls[0]?.fn).toBe("landmarks_resolve");
    expect(calls[1]?.args.p_lat).toBe(VI.latitude);
    expect(calls[1]?.args.p_radius_m).toBe(2000);
    expect(page.near?.slug).toBe("victoria-island");
  });

  it("reports an unrecognised landmark as near: null and searches everything", async () => {
    const { calls, deps } = fakeClient([row(0, 1)], null);
    const page = await searchStays({ nearLandmark: "Nowhere" }, deps);
    expect(page.near).toBeNull();
    expect(calls[1]?.args).not.toHaveProperty("p_lat");
  });

  it("accepts the URL-parsed query directly and pages by its page number", async () => {
    const { calls, deps } = fakeClient([row(0, 30)]);
    const query = parseStaysQuery({ page: "2", wifi: "1" }, "2026-09-18");
    await searchStays(query, deps);
    expect(calls[0]?.args.p_offset).toBe(PAGE_SIZE);
    expect(calls[0]?.args.p_amenities).toEqual(["wifi"]);
  });

  it("degrades into an empty ended page when the platform is not configured", async () => {
    const { client } = fakeClient([row(0, 1)]);
    const page = await searchStays({}, { client: async () => client, configured: () => false });
    expect(page.rows).toEqual([]);
    expect(page.ended).toBe(true);
  });
});
