import type { Metadata } from "next";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { listRestaurants } from "@/lib/stays/queries";
import { StayCard } from "@/components/app/stays/StayCard";
import { stayCardFromListing, type StayCardData } from "@/components/app/stays/stay-card-model";
import { restaurantPlate } from "@/components/app/stays/restaurant-plates";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { resolveSession } from "@/lib/actions/session";
import { listSavedPlaces } from "@/lib/saved/places-actions";
import { isSaved, savedKeySet } from "@/lib/saved/places";

export const metadata: Metadata = {
  title: "Restaurants",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Restaurant discovery, in the register.
 *
 * Two reads: the first-party restaurant listings (the catalogue) and the
 * business-grade venues BB reads through `listRestaurants`, which carry
 * service windows and therefore an honest "Open until" label. A listing
 * with no photographs draws one of the restaurant plates, labelled as a
 * stand-in.
 */
export default async function RestaurantsPage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const [listings, venues, session, savedPlaces] = await Promise.all([
    getListingRepository().search({ kind: "restaurant" }),
    listRestaurants(),
    resolveSession(),
    listSavedPlaces(),
  ]);
  /* The saved shelf this reader already has. A venue is a business row, and
     `catalogue_entries` files a restaurant under its business id, so the
     business id IS the key the shortlist is written with. */
  const savedKeys = savedKeySet(savedPlaces.ok ? savedPlaces.data : []);
  const canSavePlaces = session.state === "signed-in";

  const cards: StayCardData[] = [
    ...venues.map<StayCardData>((venue) => ({
      id: venue.business.id,
      href: `/restaurant/${venue.business.id}`,
      title: venue.business.name,
      where: [venue.business.area, venue.business.city].filter(Boolean).join(", "),
      kind: "restaurant",
      hue: 0,
      photo: null,
      standIn: restaurantPlate(venue.business.id),
      verified: false,
      isDemo: venue.business.is_demo,
      hours: { openNow: venue.open_now, label: venue.hours_label },
      rating: null,
      nightlyMinor: null,
      currency: "NGN",
      amenities: [
        ...(venue.profile?.parking ? ["parking"] : []),
        ...(venue.profile?.power_backup ? ["generator"] : []),
      ],
      totalMinor: null,
      nights: null,
      /* A business-grade venue is a `saved_places` row under the restaurant
         kind; a catalogue listing below is a `saved_items` row. Two shelves,
         one heart, and the card is told which one it writes to. */
      place: { kind: "restaurant", id: venue.business.id },
    })),
    ...listings.map((listing) => ({
      ...stayCardFromListing(listing),
      href: `/restaurant/${listing.id}`,
      standIn: restaurantPlate(listing.id),
    })),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.stays.restaurantsTitle} subtitle={t.stays.restaurantsLine} fallback="/stays" />
      {cards.length === 0 ? (
        <EmptyState
          icon="concierge-bell"
          title={t.stays.restaurantsEmptyTitle}
          body={t.stays.restaurantsEmptyBody}
          action={
            <ButtonLink href="/stays" variant="primary">
              {t.nav.stays}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3" data-testid="restaurant-shelf">
          {cards.map((card, index) => (
            <li key={card.id}>
              <StayCard
                stay={card}
                locale={locale}
                t={t}
                index={index}
                saved={card.place ? isSaved(savedKeys, card.place.kind, card.place.id) : false}
                canSavePlaces={canSavePlaces}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
