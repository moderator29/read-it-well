import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE TWO SHELVES THE SHORTLIST COULD NOT DRAW.
 *
 * `saved_places` has carried stays and restaurants since M13 and had no reader
 * at all: a person could heart a hotel and find nothing on /saved. What is
 * pinned here is the read that closes it, and the three ways it is allowed to
 * come back short: a saved id that resolves to nothing (the hotel was
 * withdrawn) is dropped rather than drawn as a broken card, a listing save is
 * never read from this table because `saved_items` already holds that shelf,
 * and every failure is an empty list rather than a thrown page.
 *
 * The row shape is asserted too, because it is the whole point of the read:
 * what comes back is a `StaySearchRow` with its dated half honestly null, so
 * the card that draws a searched stay draws a saved one with no second
 * adapter to drift.
 */

const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
const staysDb = vi.hoisted(() => ({ staysClient: vi.fn() }));
vi.mock("../actions/session", () => session);
vi.mock("../stays/db", () => staysDb);
vi.mock("../supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("../supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("../listings/repository", () => ({
  getListingRepository: () => ({ byId: async () => null }),
}));
vi.mock("../listings/supabase-repository", () => ({ loadListingsByIds: async () => new Map() }));

const { getSavedPlaces } = await import("./queries");

const USER = "11111111-1111-4111-8111-111111111111";
const HOTEL = "22222222-2222-4222-8222-222222222222";
const TABLE = "33333333-3333-4333-8333-333333333333";
const GONE = "44444444-4444-4444-8444-444444444444";

type Result = { data: unknown; error: unknown };

function builder(result: Result): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit"]) chain[method] = () => chain;
  chain.then = (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function entry(kind: string, id: string, title: string) {
  return {
    id: `ce-${id}`,
    entity_kind: kind,
    entity_id: id,
    title,
    area: "Victoria Island",
    city: "Lagos",
    state_code: "LA",
    kind: kind === "restaurant" ? "restaurant" : "hotel",
    source: "first_party",
    verified: true,
    is_demo: false,
    featured: false,
    headline_price_minor: 12_000_000,
    headline_price_period: "night",
    price_band: 3,
    max_sleeps: 2,
    cover_path: "/brand/photos/hotel-room-01.jpg",
    latitude: null,
    longitude: null,
    rating_avg: null,
    rating_count: 0,
    has_breakfast: true,
    has_free_cancellation: false,
    room_categories: [],
    amenity_codes: ["wifi"],
  };
}

function mount(options: {
  saves?: { entity_kind: string; entity_id: string; created_at: string }[];
  savesError?: { message: string } | null;
  entries?: unknown[];
  signedIn?: boolean;
}) {
  session.resolveSession.mockResolvedValue(
    options.signedIn === false
      ? { state: "signed-out" }
      : {
          state: "signed-in",
          user: { id: USER },
          supabase: {
            from: () =>
              builder({ data: options.saves ?? [], error: options.savesError ?? null }),
          },
        },
  );
  staysDb.staysClient.mockResolvedValue({
    from: () => builder({ data: options.entries ?? [], error: null }),
  });
}

beforeEach(() => {
  session.resolveSession.mockReset();
  staysDb.staysClient.mockReset();
});

describe("getSavedPlaces", () => {
  it("resolves a saved stay and a saved restaurant, newest first", async () => {
    mount({
      saves: [
        { entity_kind: "accommodation", entity_id: HOTEL, created_at: "2026-09-18T10:00:00Z" },
        { entity_kind: "restaurant", entity_id: TABLE, created_at: "2026-09-17T10:00:00Z" },
      ],
      entries: [entry("accommodation", HOTEL, "Eko Signature"), entry("restaurant", TABLE, "Nok")],
    });

    const places = await getSavedPlaces();
    expect(places.map((p) => p.kind)).toEqual(["accommodation", "restaurant"]);
    expect(places.map((p) => p.row.title)).toEqual(["Eko Signature", "Nok"]);
    expect(places[0]!.savedAt).toBeGreaterThan(places[1]!.savedAt);
  });

  it("hands back an undated search row, with the dated half honestly null", async () => {
    mount({
      saves: [
        { entity_kind: "accommodation", entity_id: HOTEL, created_at: "2026-09-18T10:00:00Z" },
      ],
      entries: [entry("accommodation", HOTEL, "Eko Signature")],
    });

    const [place] = await getSavedPlaces();
    expect(place!.row.nights).toBeNull();
    expect(place!.row.total_minor).toBeNull();
    expect(place!.row.nightly_minor).toBeNull();
    expect(place!.row.distance_m).toBeNull();
    expect(place!.row.total_count).toBe(0);
    /* The projection's own facts survive untouched. */
    expect(place!.row.cover_path).toBe("/brand/photos/hotel-room-01.jpg");
    expect(place!.row.entity_kind).toBe("accommodation");
  });

  it("drops a save whose place has gone rather than drawing a broken card", async () => {
    mount({
      saves: [
        { entity_kind: "accommodation", entity_id: GONE, created_at: "2026-09-18T10:00:00Z" },
        { entity_kind: "accommodation", entity_id: HOTEL, created_at: "2026-09-17T10:00:00Z" },
      ],
      entries: [entry("accommodation", HOTEL, "Eko Signature")],
    });

    const places = await getSavedPlaces();
    expect(places).toHaveLength(1);
    expect(places[0]!.row.entity_id).toBe(HOTEL);
  });

  it("never matches a projection row of a different kind under the same id", async () => {
    /* The same uuid can be an accommodation on one shelf and a listing on
       another; a heart must light for the card it was tapped on. */
    mount({
      saves: [
        { entity_kind: "accommodation", entity_id: HOTEL, created_at: "2026-09-18T10:00:00Z" },
      ],
      entries: [entry("listing", HOTEL, "A flat with the same id")],
    });
    expect(await getSavedPlaces()).toHaveLength(0);
  });

  it("is empty for a signed-out reader and for a read that failed", async () => {
    mount({ signedIn: false });
    expect(await getSavedPlaces()).toEqual([]);

    mount({ savesError: { message: "down" } });
    expect(await getSavedPlaces()).toEqual([]);
  });
});
