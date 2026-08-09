import { getDictionary } from "@naijafinds/i18n";
import { getListingRepository } from "@/lib/listings/repository";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { getLocale } from "@/lib/locale";
import { MapCanvas, type MapCity } from "./MapCanvas";
import { localityFor, spreadCoincident } from "./mapGeo";
import type { MapListing } from "./mapTypes";

/**
 * One covered city, as the search page hands it over.
 *
 * The shape is unchanged, and the page is unchanged with it: `price` is the
 * already formatted floor for that city and `count` how many places sit there.
 * This component now reads the catalogue itself and draws a pin per place, so
 * it uses the city entries for their coordinates and for the opening view.
 * What it would rather receive is the result set the page has already
 * computed, so the map and the results header can never disagree; that is a
 * prop change on a file another agent owns, so it is proposed rather than
 * taken (see the handover note in the report).
 */
export type CityPin = {
  city: string;
  lat: number;
  lng: number;
  /** Formatted lowest nightly price, e.g. "₦25,000". */
  price: string;
  count: number;
};

/** Category nouns, for a listing whose source published no amount. */
const KIND_LABEL: Record<ListingKind, string> = {
  hotel: "Hotel",
  apartment: "Apartment",
  home: "Home",
  shortlet: "Shortlet",
  villa: "Villa",
  restaurant: "Restaurant",
  experience: "Experience",
  rental: "Rental",
  shop: "Shop",
  office: "Office",
  land: "Land",
};

function periodFor(listing: Listing): MapListing["period"] {
  if (listing.kind === "restaurant" || listing.kind === "experience") return "guest";
  return listing.pricePeriod === "year" ? "year" : "night";
}

/**
 * The live map.
 *
 * A server component so the catalogue is read where the catalogue lives, and
 * only the handful of fields a pin and a docked card need cross to the client.
 * Placement happens here too: the catalogue names a locality, never a
 * coordinate, so each listing is put on the real centroid of its area when we
 * know it and on its city when we do not, and pins that would land on the very
 * same point are fanned out by about six hundred metres so a pair in Victoria
 * Island stays readable. The surface says which of the two it is doing.
 */
export async function RealMap({
  pins,
  active,
  listings,
}: {
  pins: CityPin[];
  active?: string;
  /** Escape hatch for a caller that has already resolved the result set. */
  listings?: Listing[];
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  // The map follows the text query it was given, so it shows the same places
  // the results header counts rather than the whole country every time.
  const catalogue = listings ?? (await getListingRepository().search({ q: active }));

  const cityAt = new Map(pins.map((pin) => [pin.city.toLowerCase(), pin]));
  const placed: { listing: Listing; at: { lat: number; lng: number }; byArea: boolean }[] = [];
  for (const listing of catalogue) {
    const city = cityAt.get(listing.city.toLowerCase());
    // No coordinate for the city means no honest place to draw it.
    if (!city) continue;
    const { at, byArea } = localityFor(listing.city, listing.area, {
      lat: city.lat,
      lng: city.lng,
    });
    placed.push({ listing, at, byArea });
  }

  const mapListings: MapListing[] = spreadCoincident(placed).map(
    ({ listing, at, byArea }) => ({
      id: listing.id,
      title: listing.title,
      area: listing.area,
      city: listing.city,
      kindLabel: KIND_LABEL[listing.kind],
      priceMinor: listing.priceMinor,
      currency: listing.currency,
      period: periodFor(listing),
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      ...(listing.photos[0] ? { photo: listing.photos[0] } : {}),
      hue: listing.hue,
      verified: listing.verified,
      isDemo: listing.isDemo,
      lat: at.lat,
      lng: at.lng,
      byArea,
    }),
  );

  const cities: MapCity[] = pins.map((pin) => ({
    city: pin.city,
    lat: pin.lat,
    lng: pin.lng,
    count: pin.count,
  }));

  return (
    <MapCanvas
      listings={mapListings}
      cities={cities}
      {...(active ? { active } : {})}
      locale={locale}
      copy={{
        night: t.common.night,
        year: t.common.year,
        guest: "guest",
        verified: t.common.verified,
      }}
      wholeMapHref="/search?view=map"
    />
  );
}
