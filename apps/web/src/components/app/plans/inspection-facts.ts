import "server-only";

import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import type { InspectionListingFacts } from "@/components/app/inspections/InspectionSheet";
import { resolveSession } from "@/lib/actions/session";
import { headlinePeriod, headlinePrice } from "@/lib/listings/pricing";
import type { ListingKind } from "@/lib/listings/types";
import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * The property facts an inspection card shows: place, kind, price, photo.
 *
 * `Inspection` carries the title only, which is what a row needs; the
 * scheduled card (F6A8A482) needs the rest. One select for every listing
 * on the page under the caller's own RLS, so a listing they may not read
 * simply has no facts and the card falls back to its title.
 */

const KIND_LABEL: Record<ListingKind, string> = {
  apartment: "Apartment",
  hotel: "Hotel",
  home: "House",
  villa: "Villa",
  shortlet: "Shortlet",
  rental: "Rental",
  shop: "Shop",
  office: "Office",
  land: "Land",
  restaurant: "Restaurant",
  experience: "Experience",
};

function asKind(value: string | null): ListingKind {
  return value && value in KIND_LABEL ? (value as ListingKind) : "home";
}

/** Deterministic 0..5 hue index from an id, for the scene fallback. */
function hueOf(id: string): number {
  let acc = 0;
  for (let i = 0; i < id.length; i += 1) acc = (acc + id.charCodeAt(i)) % 6;
  return acc;
}

function photoUrl(storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const path = storagePath.replace(/^\/+/, "").replace(/^listing-photos\//, "");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/listing-photos/${path}`;
}

export async function readListingFacts(
  ids: string[],
  locale: Locale,
): Promise<Map<string, InspectionListingFacts>> {
  const out = new Map<string, InspectionListingFacts>();
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return out;
  const session = await resolveSession();
  if (session.state !== "signed-in") return out;
  const periodWords = getDictionary(locale).agentListings.pricing.period;
  try {
    const { data } = await session.supabase
      .from("listings")
      .select(
        "id, is_demo, area, city, property_type, listing_intent, rent_amount_minor, rent_period, rate_minor, rate_period, sale_price_minor, listing_photos(storage_path, position)",
      )
      .in("id", wanted);
    for (const row of data ?? []) {
      const headline = headlinePrice(row);
      const period = headlinePeriod(headline);
      const cover = [...row.listing_photos].sort((a, b) => a.position - b.position)[0];
      const kind = asKind(row.property_type);
      out.set(row.id, {
        area: row.area ?? "",
        city: row.city ?? "",
        kind,
        kindLabel: KIND_LABEL[kind],
        priceLabel: headline.minor > 0 ? formatMoney(headline.minor, locale) : "",
        periodLabel: period === "sale" ? "" : periodWords[period],
        photo: cover ? photoUrl(cover.storage_path) : null,
        hue: hueOf(row.id),
        isDemo: row.is_demo === true,
        isRental: row.listing_intent === "rent",
      });
    }
  } catch {
    /* No facts is survivable; the card still names the property. */
  }
  return out;
}
