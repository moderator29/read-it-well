import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { StaysFeatured } from "@/components/app/stays/StaysFeatured";
import { CategoryRow, type HomeCategory } from "@/components/app/home/CategoryRow";
import { CityRow } from "@/components/app/home/CityRow";
import { HomeHero } from "@/components/app/home/HomeHero";
import { LogoMark } from "@/design-system/brand/Logo";
import { EmptyState } from "@/components/app/Screen";
import { STAYS } from "../../../f3/fixtures";

/**
 * /stays composed exactly as `app/(app)/stays/page.tsx` composes it (the
 * greeting, the hero plate, the four doors, the featured band of StayCards),
 * with the F3 fixture shelf in place of the database read. `?empty=1` draws
 * the empty band the route shows when the shelf is empty.
 */
export default async function SweepStaysHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.catalogue.stays;
  const stays = t.directHome.stays;
  const empty = (await searchParams).empty === "1";
  const featured = empty ? [] : STAYS;
  const doors: HomeCategory[] = [
    { key: "hotels", label: stays.hotels, meaning: stays.hotelsNote, href: "#", icon: "hotel-room" },
    { key: "shortlets", label: stays.shortlets, meaning: stays.shortletsNote, href: "#", icon: "shortlet" },
    { key: "restaurants", label: stays.restaurants, meaning: stays.restaurantsNote, href: "#", icon: "concierge-bell" },
    { key: "nearby", label: stays.nearby, meaning: stays.nearbyNote, href: "#", icon: "pin-map" },
  ];
  return (
    <div className="nf-home">
      <section className="nf-rise">
        <p className="nf-body-sm font-medium text-[var(--nf-content-secondary)]">Good evening</p>
        <h1 className="nf-rise nf-rise-2 mt-inline-tight flex items-center gap-inline">
          <span className="nf-h1">Seyi</span>
          <span className="inline-block shrink-0 translate-y-[2px]">
            <LogoMark size={26} title="Vallo" />
          </span>
        </h1>
        <CityRow label="Lekki" context="Lagos" isOwn signedIn />
      </section>
      <div className="mt-md">
        <HomeHero
          id="stays-q"
          place="Lekki"
          title={stays.heroTitle}
          lede={stays.heroLede}
          searchPlaceholder={stays.heroSearch}
          searchAction="/preview/session-b/sweep-stays/stays-search"
          filtersHref="/preview/session-b/sweep-stays/stays-search?filters=open"
          filtersLabel={t.directHome.filters}
          searchLabel={stays.heroSearch}
          kind="hotel"
        />
      </div>
      <CategoryRow categories={doors} label={copy.title} columns={2} />
      <StaysFeatured
        stays={featured}
        title={stays.featured}
        seeAllHref="/preview/session-b/sweep-stays/stays-search"
        locale={locale}
        t={t}
        isSaved={(stay) => stay.id === featured[0]?.id}
        canSavePlaces
        empty={<EmptyState icon="hotel" title={t.stays.shelfEmptyTitle} body={t.stays.shelfEmptyBody} />}
      />
    </div>
  );
}
