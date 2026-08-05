import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { DAYPART_GREETING, getHomeOverview } from "@/lib/app/home-queries";
import { getListingRepository } from "@/lib/listings/repository";
import { ListingCard } from "@/components/app/ListingCard";
import { AiAssistantBanner } from "@/components/app/AiAssistantBanner";
import { CityHero } from "@/components/app/home/CityHero";
import { CityRow } from "@/components/app/home/CityRow";
import { TrendingStrip } from "@/components/app/home/TrendingStrip";
import { Reveal } from "@/components/site/Reveal";
import { LogoMark } from "@/design-system/brand/Logo";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

/**
 * Home: the overview.
 *
 * The first screen anybody sees, and the one place where every fact has to be
 * the reader's own. The greeting is decided by the clock in Lagos, not by the
 * server's timezone. The name is theirs. The city is theirs, read from their
 * profile, and the chevron beside it goes to the screen that changes it. The
 * hero is the supplied city artwork with a lit pin for every open place inside
 * that city, each one carrying its real post count from `public.areas`. The
 * strip under it is what people are actually reading there.
 *
 * Rendered per request rather than cached, because a page that says "Good
 * morning" cannot be served from a build that ran last night.
 *
 * What used to be here and is not any more: a "Top experiences" row of five
 * tiles whose five links were the same URL. Five different names leading to one
 * identical destination is a promise the product cannot keep, and the category
 * row above it already covers experiences honestly.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const overview = await getHomeOverview();

  /*
   * The first-run question, gated here and nowhere else.
   *
   * Home is where sign-up redirects and where the OAuth callback returns, so
   * this is the honest meaning of "first entry to the app". Putting the gate in
   * the shell layout instead would have made every consumer route a trapdoor,
   * including the welcome screen's own way out.
   *
   * `askIntent` is false unless the person is signed in, has stated nothing,
   * and has never been asked - so a skip is permanent and a returning user
   * never sees this branch again. It comes from the profile read the overview
   * already did, not a second query.
   */
  if (overview.askIntent) redirect("/welcome");

  const repo = getListingRepository();
  const listings = await repo.recommended(6);

  const categories: { icon: BrandIconName; label: string; href: string }[] = [
    { icon: "hotel-star", label: t.nav.hotels, href: "/search?type=hotel" },
    { icon: "homes-sparkle", label: t.nav.apartments, href: "/search?type=apartment" },
    { icon: "house-sparkle", label: t.nav.homes, href: "/search?type=home" },
    { icon: "gift", label: t.nav.restaurants, href: "/search?type=restaurant" },
    { icon: "luggage-check", label: t.nav.experiences, href: "/search?type=experience" },
  ];

  const greeting = DAYPART_GREETING[overview.daypart];
  const name = overview.firstName || (overview.signedIn ? "there" : "");

  return (
    <>
      {/* ---------------------------------------------------- the greeting */}
      <section className="nf-rise">
        <p className="text-[0.875rem] font-medium text-[var(--nf-content-secondary)]">
          {greeting}
        </p>
        {name ? (
          <h1 className="mt-0.5 flex items-center gap-2.5">
            <span className="nf-h1 max-sm:text-[1.875rem]">{name}</span>
            <span className="inline-block shrink-0 translate-y-[2px]">
              <LogoMark size={26} title="RentMe" />
            </span>
          </h1>
        ) : (
          <h1 className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="nf-h1 max-sm:text-[1.75rem]">Welcome to RentMe</span>
            <span className="inline-block shrink-0 translate-y-[2px]">
              <LogoMark size={26} title="RentMe" />
            </span>
          </h1>
        )}
        {!overview.signedIn && (
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            <Link
              href="/sign-in"
              className="font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
            >
              Sign in
            </Link>{" "}
            and this screen becomes yours: your city, your places, your name.
          </p>
        )}

        <CityRow
          label={overview.place.label}
          context={overview.place.context}
          isOwn={overview.place.isOwn}
          signedIn={overview.signedIn}
        />
      </section>

      {/* --------------------------------------------------------- the city */}
      <div className="mt-5">
        <CityHero
          cityLabel={overview.place.label}
          contextLabel={overview.place.isOwn ? "Your city" : "Open on RentMe"}
          areas={overview.areas}
        />
      </div>

      {/* ----------------------------------------------------- what is live */}
      <Reveal className="mt-10 sm:mt-12">
        <TrendingStrip
          items={overview.trending}
          cityLabel={overview.place.label}
          hasPlaces={overview.areas.length > 0}
        />
      </Reveal>

      {/* -------------------------------------------------------- categories */}
      <Reveal as="section" className="mt-10 sm:mt-12">
        <h2 className="nf-h3 mb-3">Find a place to stay</h2>
        <ul className="nf-scroll-x -mx-5 flex snap-x snap-mandatory gap-4 px-5 pb-1 scroll-pl-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 sm:pb-0 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.href} className="w-[7.25rem] shrink-0 snap-start sm:w-auto">
              <Link
                href={c.href}
                className="nf-card nf-card--interactive flex h-full flex-col items-center gap-3 p-4 text-center sm:p-5"
              >
                <span className="block h-13 w-13 sm:h-12 sm:w-12">
                  <BrandIcon name={c.icon} fill />
                </span>
                <span className="text-[0.8125rem] font-semibold sm:text-[0.875rem]">
                  {c.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* -------------------------------------------------- recommended */}
      <Reveal as="section" className="mt-12 sm:mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="nf-h2">{t.home.recommended}</h2>
          <Link
            href="/search"
            className="nf-tap shrink-0 text-[0.875rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
          >
            {t.common.viewAll}
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="nf-card p-10 text-center">
            <span className="mx-auto block h-16 w-16">
              <BrandIcon name="home-search" fill />
            </span>
            <p className="mt-4 font-semibold">Nothing to show here yet</p>
            <p className="mt-1 text-[0.875rem] text-[var(--nf-content-muted)]">
              Once listings are approved they will appear in this space.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      {/* ----------------------------------------------------------- ai card */}
      <Reveal className="mt-12 sm:mt-14" delay={60}>
        <AiAssistantBanner t={t} />
      </Reveal>

      {/* -------------------------------------------------- agent promo */}
      <Reveal as="section" className="mt-12 sm:mt-14" delay={60}>
        <div className="nf-card relative flex flex-col gap-5 overflow-hidden p-6 sm:p-7 md:flex-row md:items-center">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
            style={{ background: "var(--nf-gradient-agent)", opacity: 0.24 }}
            aria-hidden="true"
          />
          <span className="block h-16 w-16 shrink-0 sm:h-[3.75rem] sm:w-[3.75rem]">
            <BrandIcon name="homes-sparkle" fill />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="nf-h3">{t.home.agentCard.title}</h2>
            <p className="mt-1.5 max-w-[58ch] text-[0.9375rem] text-[var(--nf-content-secondary)]">
              {t.home.agentCard.body}
            </p>
          </div>
          <ButtonLink href="/agents" variant="secondary" className="shrink-0">
            {t.home.agentCard.action}
          </ButtonLink>
        </div>
      </Reveal>
    </>
  );
}
