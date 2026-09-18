import type { Metadata } from "next";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { ListingCard } from "@/components/app/ListingCard";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Restaurants",
  robots: { index: false, follow: false },
};

/**
 * Restaurant discovery, first light over the existing catalogue.
 *
 * Every row here is a first-party restaurant listed on Vallo; the
 * `reservation_is_valid` trigger already refuses a table at anything else, so
 * the shelf and the write path agree by construction. Hours-aware "open now"
 * arrives with `service_windows` on the business-grade schema; until stored
 * hours exist, nothing here claims to know whether a kitchen is open.
 */
export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const restaurants = await getListingRepository().search({ kind: "restaurant" });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.stays.restaurantsTitle} subtitle={t.stays.restaurantsLine} fallback="/stays" />
      {restaurants.length === 0 ? (
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
        <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((listing, index) => (
            <li key={listing.id}>
              <ListingCard listing={listing} locale={locale} t={t} index={index} side="stays" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
