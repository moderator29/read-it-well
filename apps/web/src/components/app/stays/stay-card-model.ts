import type { Listing, ListingKind } from "@/lib/listings/types";
import type { StaySearchRow } from "@/lib/stays/types";
import { accommodationPhotoUrl } from "@/lib/stays/photos";

/**
 * What a stay card needs, whichever read produced it.
 *
 * Two reads feed the stays side: the listing repository (the 64 catalogue
 * rows, as `Listing`) and BB's catalogue projection (`stays_search`, as
 * `StaySearchRow`). One shape for the card means one card, and the two
 * adapters below are the only places that know which read they came from.
 */
export type StayCardData = {
  id: string;
  href: string;
  title: string;
  where: string;
  kind: ListingKind;
  hue: number;
  photo: string | null;
  verified: boolean;
  isDemo: boolean;
  /** A category plate drawn where no photograph exists, still labelled as such. */
  standIn?: string;
  /** "Open until 22:00", from the venue's service windows, when known. */
  hours?: { openNow: boolean; label: string };
  /** Only with real reviews behind it; null otherwise, never a placeholder. */
  rating: { average: number; count: number } | null;
  nightlyMinor: number | null;
  currency: string;
  amenities: string[];
  /** A dated search's whole-stay total, in kobo, when the row carries one. */
  totalMinor: number | null;
  nights: number | null;
};

function place(area: string | null | undefined, city: string | null | undefined): string {
  if (area && city && area !== city) return `${area}, ${city}`;
  return area || city || "";
}

export function stayCardFromListing(listing: Listing, nights: number | null = null): StayCardData {
  const nightly = listing.pricePeriod === "night" && listing.priceMinor > 0 ? listing.priceMinor : null;
  const total =
    nightly !== null && nights !== null
      ? nightly * nights + (listing.cleaningMinor ?? 0) + (listing.serviceMinor ?? 0)
      : null;
  return {
    id: listing.id,
    href: `/stay/${listing.id}`,
    title: listing.title,
    where: place(listing.area, listing.city),
    kind: listing.kind,
    hue: listing.hue,
    photo: listing.photos[0] ?? null,
    verified: listing.verified,
    isDemo: listing.isDemo,
    rating:
      listing.reviewCount > 0 && listing.rating > 0
        ? { average: listing.rating, count: listing.reviewCount }
        : null,
    nightlyMinor: nightly,
    currency: listing.currency,
    amenities: listing.amenities,
    totalMinor: total,
    nights,
  };
}

const ROW_KIND: Record<string, ListingKind> = {
  hotel: "hotel",
  apartment: "apartment",
  shortlet: "shortlet",
  villa: "villa",
  home: "home",
  restaurant: "restaurant",
  serviced_apartments: "apartment",
  guest_house: "home",
  resort: "villa",
  shortlet_operator: "shortlet",
};

/** A stable 0 to 5 from the id, for the drawn scene's variation. */
function hueOf(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 6;
  return hash;
}

export function stayCardFromRow(row: StaySearchRow): StayCardData {
  const photo = row.cover_path
    ? row.cover_path.startsWith("/") || row.cover_path.startsWith("http")
      ? row.cover_path
      : accommodationPhotoUrl(row.cover_path)
    : null;
  return {
    id: row.entity_id,
    href: row.entity_kind === "restaurant" ? `/restaurant/${row.entity_id}` : `/stay/${row.entity_id}`,
    title: row.title,
    where: place(row.area, row.city),
    kind: ROW_KIND[row.kind] ?? "hotel",
    hue: hueOf(row.entity_id),
    photo,
    verified: row.verified,
    isDemo: row.is_demo,
    rating:
      row.rating_count > 0 && row.rating_avg !== null && row.rating_avg > 0
        ? { average: row.rating_avg, count: row.rating_count }
        : null,
    nightlyMinor:
      row.nightly_minor !== null && row.nightly_minor > 0
        ? row.nightly_minor
        : row.headline_price_period === "night" && row.headline_price_minor !== null && row.headline_price_minor > 0
          ? row.headline_price_minor
          : null,
    currency: "NGN",
    amenities: row.amenity_codes,
    totalMinor: row.total_minor !== null && row.total_minor > 0 ? row.total_minor : null,
    nights: row.nights,
  };
}
