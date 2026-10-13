import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { StayCard } from "@/components/app/stays/StayCard";
import { CategoryRow, type HomeCategory } from "@/components/app/home/CategoryRow";
import { CityRow } from "@/components/app/home/CityRow";
import { FeaturedBand } from "@/components/app/home/FeaturedBand";
import { HomeHero } from "@/components/app/home/HomeHero";
import { daypartFor, lagosHour } from "@/lib/app/home-queries";
import { LogoMark } from "@/design-system/brand/Logo";
import { STAYS } from "../../../f3/fixtures";
import { SweepFrame } from "../Frame";

/**
 * `/stays`, the Stays home, from fixture cards: the same three home
 * components the route mounts (`HomeHero`, `CategoryRow`, `FeaturedBand`),
 * in the same order, with the route's four doors.
 */
export const dynamic = "force-dynamic";

export default async function SweepStays() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.catalogue.stays;
  const stays = t.directHome.stays;
  const greeting = t.experienceDiscover.home.greeting[daypartFor(lagosHour())];
  const doors: HomeCategory[] = [
    { key: "hotels", label: stays.hotels, meaning: stays.hotelsNote, href: "/stays/search?type=hotel", icon: "hotel-room" },
    { key: "shortlets", label: stays.shortlets, meaning: stays.shortletsNote, href: "/stays/search?type=shortlet", icon: "shortlet" },
    { key: "restaurants", label: stays.restaurants, meaning: stays.restaurantsNote, href: "/restaurants", icon: "concierge-bell" },
    { key: "nearby", label: stays.nearby, meaning: stays.nearbyNote, href: "/around", icon: "pin-map" },
  ];
  return (
    <SweepFrame side="stays" route="/stays">
      <div className="nf-home">
        <section className="nf-rise">
          <p className="nf-body-sm font-medium text-[var(--nf-content-secondary)]">{greeting}</p>
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
            searchAction="/stays/search"
            filtersHref="/stays/search?filters=open"
            filtersLabel={t.directHome.filters}
            searchLabel={stays.heroSearch}
            kind="hotel"
          />
        </div>
        <CategoryRow categories={doors} label={copy.title} columns={2} />
        <FeaturedBand
          title={stays.featured}
          seeAllHref="/stays/search"
          seeAllLabel={copy.seeAll}
          count={Math.min(STAYS.length, 6)}
          testId="featured-stays"
          empty={null}
        >
          {STAYS.slice(0, 6).map((stay, index) => (
            <li key={stay.id} className="nf-feature-row__item">
              <StayCard stay={stay} locale={locale} t={t} index={index} saved={false} canSavePlaces />
            </li>
          ))}
        </FeaturedBand>
      </div>
    </SweepFrame>
  );
}
