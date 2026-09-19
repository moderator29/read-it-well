import "server-only";

import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getListingRepository } from "@/lib/listings/repository";
import { MARKETS, type HomeCity, type InvestFeature, type MarketCounts } from "@/components/app/home/markets";

/**
 * The real numbers behind home's market tiles, its featured cities and its
 * investment band.
 *
 * The founder's target render prints a count on every tile and every city
 * capsule. Those counts are the reason this file exists: rule 15 and the
 * third edition's second stop both forbid an invented figure on a product
 * surface, so each one is a `count: "exact"` head query against the same
 * predicate discovery itself uses (`status = 'PUBLISHED'`), and a count that
 * cannot be read is absent rather than guessed. The tile then draws its name
 * alone, which is a designed state, not a gap.
 *
 * Nothing here throws. Home is not worth taking down for a failed count.
 */

/** What the tiles filter on, in the vocabulary the listings table holds. */
const MARKET_PREDICATE: Record<
  string,
  { column: "listing_intent" | "property_type"; value: string }
> = {
  rent: { column: "listing_intent", value: "rent" },
  buy: { column: "listing_intent", value: "sale" },
  shortlet: { column: "property_type", value: "shortlet" },
  hotel: { column: "property_type", value: "hotel" },
  villa: { column: "property_type", value: "villa" },
  apartment: { column: "property_type", value: "apartment" },
  restaurant: { column: "property_type", value: "restaurant" },
  office: { column: "property_type", value: "office" },
  land: { column: "property_type", value: "land" },
};

/**
 * The cities the featured row can photograph.
 *
 * A capsule needs a plate, and the plates on disk are these. The row is built
 * from the catalogue's own busiest cities and a city with no plate is skipped
 * rather than drawn on a grey rectangle, so the row shows real places this
 * product has pictures of and real counts for both.
 */
const CITY_PLATES: Record<string, { src: string; position: string }> = {
  lagos: { src: "/brand/photos/skyline-bridge-dusk.jpg", position: "center" },
  abuja: { src: "/brand/photos/villa-exterior-sunset.jpg", position: "center" },
  "port harcourt": { src: "/brand/photos/skyline-waterfront-dusk.jpg", position: "left center" },
  ibadan: { src: "/brand/photos/tower-entrance-dusk.jpg", position: "center" },
  abeokuta: { src: "/brand/photos/villa-exterior-gate.jpg", position: "center" },
};

const CITY_LIMIT = 4;
/** A ceiling on the city tally read, not a page: see ListingSearchOptions. */
const CITY_SCAN = 500;

export type HomeMarkets = {
  counts: MarketCounts;
  cities: HomeCity[];
  invest: InvestFeature | null;
};

export const EMPTY_MARKETS: HomeMarkets = { counts: {}, cities: [], invest: null };

export const getHomeMarkets = cache(async function getHomeMarkets(): Promise<HomeMarkets> {
  if (!isSupabaseConfigured()) return EMPTY_MARKETS;

  const [counts, cities, invest] = await Promise.all([
    readMarketCounts(),
    readFeaturedCities(),
    readInvestFeature(),
  ]);

  return { counts, cities, invest };
});

/* --------------------------------------------------------------- internals */

async function readMarketCounts(): Promise<MarketCounts> {
  try {
    const supabase = await createClient();
    const entries = await Promise.all(
      MARKETS.map(async (market) => {
        const predicate = MARKET_PREDICATE[market.key];
        if (!predicate) return [market.key, undefined] as const;
        const { count, error } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "PUBLISHED")
          // The column is an enum in the generated types and a string here; the
          // values are the enum's own, checked by the map above.
          .eq(predicate.column, predicate.value as never);
        if (error || count === null) return [market.key, undefined] as const;
        return [market.key, count] as const;
      }),
    );

    const counts: MarketCounts = {};
    for (const [key, count] of entries) {
      if (count !== undefined) counts[key] = count;
    }
    return counts;
  } catch {
    return {};
  }
}

async function readFeaturedCities(): Promise<HomeCity[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("listings")
      .select("city")
      .eq("status", "PUBLISHED")
      .limit(CITY_SCAN);
    if (error || !data) return [];

    const tally = new Map<string, { name: string; count: number }>();
    for (const row of data) {
      const name = (row.city ?? "").trim();
      if (name.length === 0) continue;
      const key = name.toLowerCase();
      const seen = tally.get(key);
      if (seen) seen.count += 1;
      else tally.set(key, { name, count: 1 });
    }

    return [...tally.entries()]
      .filter(([key]) => key in CITY_PLATES)
      .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
      .slice(0, CITY_LIMIT)
      .map(([key, city]) => {
        const plate = CITY_PLATES[key]!;
        return {
          name: city.name,
          href: `/search?q=${encodeURIComponent(city.name)}`,
          count: city.count,
          src: plate.src,
          position: plate.position,
        };
      });
  } catch {
    return [];
  }
}

/**
 * One real for-sale listing to stand behind the investment band.
 *
 * The band is mostly photograph, so a for-sale row that carries one is
 * preferred and, when the market holds nothing photographed, the band does
 * not render at all. A picture of an investment offer with no property behind
 * it is exactly what rule 15 forbids.
 */
async function readInvestFeature(): Promise<InvestFeature | null> {
  try {
    const listings = await getListingRepository().search({ intent: "sale" }, { limit: 24 });
    if (listings.length === 0) return null;
    const chosen = listings.find((l) => l.photos.length > 0) ?? listings[0]!;
    const photo = chosen.photos[0] ?? "";
    if (photo.length === 0) return null;
    return {
      href: `/listing/${chosen.id}`,
      title: chosen.title,
      photo,
      verified: chosen.verified,
    };
  } catch {
    return null;
  }
}
