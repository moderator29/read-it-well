import type { Listing, ListingKind } from "@/lib/listings/types";
import { hrefForListing } from "@/lib/listings/href";
import type { StaySearchRow } from "@/lib/stays/types";
import { accommodationPhotoUrl } from "@/lib/stays/photos";
import type { SavePlaceTarget } from "@/components/app/SaveControl";

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
  /**
   * WHERE THIS CARD'S HEART WRITES.
   *
   * A catalogue accommodation or restaurant is saved into `saved_places`
   * under its entity kind; a platform listing is a `saved_items` row and its
   * heart needs nothing here. Set only by the projection adapter and by the
   * two surfaces that read businesses directly, because those are the only
   * reads that know an entity kind at all. Without it a hotel's heart went to
   * `toggleSave`, whose foreign key can never accept an accommodation id, so
   * the tap came back as "this place is no longer available" and saved
   * nothing.
   */
  place?: SavePlaceTarget;
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
    /* The kind decides the shell, not the shelf the card happens to be on.
       This was a flat `/stay/<id>`, so the restaurants rail on `/stays` had
       to override the href at the call site to stop a table opening in the
       lodging shell - and any other caller that forgot would have shipped the
       bug. `hrefForListing` answers it from `listing.kind` for every surface
       at once. See `lib/listings/href.ts` and R2 findings 1 and 3. */
    href: hrefForListing(listing.kind, listing.id),
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
    /* The projection is the one read that knows the entity kind, so it is the
       one place that can tell the heart which shelf it writes to. A `listing`
       row keeps the `saved_items` path it already had. */
    place:
      row.entity_kind === "accommodation" || row.entity_kind === "restaurant"
        ? { kind: row.entity_kind, id: row.entity_id }
        : undefined,
  };
}
