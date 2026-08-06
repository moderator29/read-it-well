import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Places provider, against a stubbed Google.
 *
 * This layer's whole job is to interpret somebody else's payload, so the only
 * honest test hands it a payload. A browser spec cannot: it would need either a
 * live billed key or a stand-in server for `places.googleapis.com`, and neither
 * proves the mapping any better than this does.
 *
 * What is worth asserting here, in order of how much damage getting it wrong
 * would do:
 *
 * 1. **A restaurant never lands on the hotel shelf.** `includedType` is a
 *    request, not a guarantee, and the two categories genuinely overlap: a
 *    hotel with a well known restaurant is returned by searches for both.
 * 2. **Partner stock never carries our trust badge** and never carries an
 *    invented price. Places reports a price level, not an amount.
 * 3. **A category that was not asked for does not spend a billed request.**
 *
 * The key is set in `beforeEach` rather than in the environment, so the suite
 * is the same whether or not the machine running it has a real one.
 */

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

type Stub = { url: string; body: Record<string, unknown> };

let calls: Stub[] = [];

/** A Google place, with only the fields the provider reads. */
function place({
  id,
  name,
  types,
  primaryType,
}: {
  id: string;
  name: string;
  types: string[];
  primaryType?: string;
}) {
  return {
    id,
    displayName: { text: name },
    formattedAddress: `${name}, Lagos, Nigeria`,
    businessStatus: "OPERATIONAL",
    location: { latitude: 6.43, longitude: 3.42 },
    rating: 4.4,
    userRatingCount: 128,
    types,
    ...(primaryType ? { primaryType } : {}),
    addressComponents: [
      { longText: "Victoria Island", shortText: "VI", types: ["sublocality_level_1"] },
    ],
  };
}

function stubGoogle(places: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({
        url,
        body: init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ places }),
      } as unknown as Response;
    }),
  );
}

beforeEach(() => {
  calls = [];
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key-not-a-real-one");
  // The place_id cache write is fire and forget and needs no database here.
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("the hotel shelf", () => {
  it("asks Google for lodging, not for the narrow hotel type", async () => {
    stubGoogle([]);
    const { placesHotelProvider } = await import("./places");
    await placesHotelProvider.search({ kind: "hotel" });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(SEARCH_URL);
    // `hotel` would drop the guest houses and resorts most of this market is.
    expect(calls[0]!.body["includedType"]).toBe("lodging");
    expect(calls[0]!.body["regionCode"]).toBe("NG");
  });

  it("keeps a guest house, which the narrow type would have missed", async () => {
    stubGoogle([
      place({ id: "g1", name: "Ikoyi Guest House", types: ["guest_house", "lodging"] }),
    ]);
    const { placesHotelProvider } = await import("./places");
    const result = await placesHotelProvider.search({ kind: "hotel" });

    expect(result.outcome).toBe("ok");
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]!.kind).toBe("hotel");
  });

  it("drops a restaurant that came back on the hotel shelf", async () => {
    stubGoogle([
      place({ id: "h1", name: "Eko Hotel", types: ["hotel", "lodging"] }),
      place({
        id: "r1",
        name: "Terra Kulture",
        types: ["nigerian_restaurant", "restaurant"],
        primaryType: "restaurant",
      }),
    ]);
    const { placesHotelProvider } = await import("./places");
    const result = await placesHotelProvider.search({ kind: "hotel" });

    expect(result.listings.map((l) => l.title)).toEqual(["Eko Hotel"]);
  });

  it("puts a hotel with a famous restaurant on the hotel shelf", async () => {
    /* Somewhere to sleep is the bigger promise, so lodging wins the tie.
       Offering a night's stay as a table for two is the failure this prevents. */
    const both = place({
      id: "b1",
      name: "Wheatbaker",
      types: ["hotel", "lodging", "restaurant", "bar"],
      primaryType: "restaurant",
    });

    stubGoogle([both]);
    const { placesHotelProvider, placesRestaurantProvider } = await import("./places");

    const hotels = await placesHotelProvider.search({ kind: "hotel" });
    expect(hotels.listings).toHaveLength(1);

    stubGoogle([both]);
    const restaurants = await placesRestaurantProvider.search({ kind: "restaurant" });
    expect(restaurants.listings).toHaveLength(0);
  });
});

describe("what a partner listing may claim", () => {
  it("never carries the verified badge, a price, or a photo", async () => {
    stubGoogle([place({ id: "h2", name: "Radisson Blu", types: ["hotel", "lodging"] })]);
    const { placesHotelProvider } = await import("./places");
    const [listing] = (await placesHotelProvider.search({ kind: "hotel" })).listings;

    expect(listing).toBeDefined();
    expect(listing!.verified).toBe(false);
    expect(listing!.source).toBe("partner");
    expect(listing!.instantBook).toBe(false);
    // Places reports a price LEVEL. Converting one into naira would be an
    // invented figure on somebody else's room rate.
    expect(listing!.priceMinor).toBe(0);
    // A photo URL needs the key on it, so shipping one leaks a server key.
    expect(listing!.photos).toEqual([]);
    expect(listing!.partner?.attribution).toBe("Google");
  });

  it("reads the real area off Google rather than defaulting to the city", async () => {
    stubGoogle([place({ id: "h3", name: "Lagos Continental", types: ["hotel"] })]);
    const { placesHotelProvider } = await import("./places");
    const [listing] = (await placesHotelProvider.search({ kind: "hotel" })).listings;

    expect(listing!.area).toBe("Victoria Island");
    expect(listing!.city).toBe("Lagos");
  });
});

describe("not spending a request that cannot help", () => {
  it("refuses a category the shelf does not sell", async () => {
    stubGoogle([]);
    const { placesHotelProvider } = await import("./places");
    const result = await placesHotelProvider.search({ kind: "restaurant" });

    expect(result.outcome).toBe("not_applicable");
    expect(calls).toHaveLength(0);
  });

  it("refuses with no key, before any network call", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    stubGoogle([]);
    const { placesHotelProvider } = await import("./places");
    const result = await placesHotelProvider.search({ kind: "hotel" });

    expect(result.outcome).toBe("no_key");
    expect(calls).toHaveLength(0);
  });

  it("searches both shelves when no category is named", async () => {
    stubGoogle([]);
    const { placesHotelProvider, placesRestaurantProvider } = await import("./places");
    await placesHotelProvider.search({});
    await placesRestaurantProvider.search({});

    expect(calls.map((c) => c.body["includedType"])).toEqual(["lodging", "restaurant"]);
    // The default subject differs per shelf, so an empty search still reads as
    // a question about the right thing.
    expect(String(calls[0]!.body["textQuery"])).toContain("hotels");
    expect(String(calls[1]!.body["textQuery"])).toContain("restaurants");
  });

  it("uses the visitor's own words when they typed some", async () => {
    stubGoogle([]);
    const { placesHotelProvider } = await import("./places");
    await placesHotelProvider.search({ q: "Eko Hotel" });

    expect(String(calls[0]!.body["textQuery"])).toBe("Eko Hotel in Lagos, Nigeria");
  });

  it("searches the city the visitor named, not always Lagos", async () => {
    stubGoogle([]);
    const { placesHotelProvider } = await import("./places");
    await placesHotelProvider.search({ q: "wuse" });

    expect(String(calls[0]!.body["textQuery"])).toContain("Abuja");
  });
});
