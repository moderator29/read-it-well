import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { ListingCard } from "@/components/app/ListingCard";
import { AiAssistantBanner } from "@/components/app/AiAssistantBanner";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { FilterLink } from "@/components/app/filters/FilterLink";
import { Button, ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

/**
 * Personal Mode home.
 *
 * Signed in discovery surface. The rail, tab bar and top bar are provided by
 * the `(app)` layout, so this page renders only its own content. There is no
 * session layer yet, so the greeting name is a placeholder constant rather than
 * a fabricated user record, and the route is marked noindex until auth gates it.
 *
 * Layout notes: on phones the category and experience rows scroll horizontally
 * with snap points instead of wrapping, so five destinations stay one thumb
 * sweep wide; from `sm` up they settle into grids. Sections below the fold
 * enter with `Reveal` so the page assembles as you scroll.
 */
const PLACEHOLDER_NAME = "there";

export default async function HomePage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  const repo = getListingRepository();
  const listings = await repo.recommended(6);

  const categories: { icon: BrandIconName; label: string; href: string }[] = [
    { icon: "hotel-star", label: t.nav.hotels, href: "/search?type=hotel" },
    { icon: "homes-sparkle", label: t.nav.apartments, href: "/search?type=apartment" },
    { icon: "house-sparkle", label: t.nav.homes, href: "/search?type=home" },
    { icon: "gift", label: t.nav.restaurants, href: "/search?type=restaurant" },
    { icon: "luggage-check", label: t.nav.experiences, href: "/search?type=experience" },
  ];

  const experiences: { icon: BrandIconName; label: string }[] = [
    { icon: "luggage-check", label: t.home.experienceCategories.beach },
    { icon: "map-route", label: t.home.experienceCategories.city },
    { icon: "gift", label: t.home.experienceCategories.dining },
    { icon: "map-route", label: t.home.experienceCategories.adventure },
    { icon: "gift", label: t.home.experienceCategories.events },
  ];

  return (
    <>
      {/* ---------------------------------------------------- greeting */}
      <section className="nf-rise">
        <h1 className="nf-h1 max-sm:text-[1.375rem]">
          {t.home.greeting}, <span className="nf-gradient-text">{PLACEHOLDER_NAME}</span>
        </h1>
        <p className="mt-1.5 text-[0.9375rem] text-[var(--nf-content-secondary)] sm:mt-2 sm:text-base">
          {t.home.prompt}
        </p>

        <div className="mt-5 flex max-w-2xl items-center gap-2 sm:mt-6">
        <form
          action="/search"
          method="get"
          role="search"
          className="nf-card flex min-w-0 flex-1 items-center gap-1.5 p-1.5"
        >
          <label htmlFor="home-q" className="sr-only">
            {t.home.searchPlaceholder}
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-3 px-2.5">
            <UiIcon name="search" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
            <input
              id="home-q"
              name="q"
              type="search"
              autoComplete="off"
              placeholder={t.home.searchPlaceholder}
              className="w-full bg-transparent py-2 text-[0.875rem] text-[var(--nf-content-primary)] outline-none placeholder:text-[var(--nf-content-muted)]"
            />
          </div>
          {/* Same reasoning as /search: on a phone the glyph carries the
              action so the field keeps its width, and the word returns at sm. */}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            aria-label={t.common.search}
            className="shrink-0"
          >
            <UiIcon name="search" size={16} className="sm:hidden" />
            <span className="hidden sm:inline">{t.common.search}</span>
          </Button>
        </form>
        <FilterLink label={t.common.search} />
        </div>
      </section>

      {/* -------------------------------------------------- categories */}
      <Reveal as="section" className="mt-10 sm:mt-12">
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

      {/* ----------------------------------------------------- ai card */}
      <Reveal className="mt-10 sm:mt-12" delay={60}>
        <AiAssistantBanner t={t} />
      </Reveal>

      {/* -------------------------------------------------- recommended */}
      <Reveal as="section" className="mt-12 sm:mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="nf-h2">{t.home.recommended}</h2>
          <Link
            href="/search"
            className="shrink-0 text-[0.875rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
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

      {/* --------------------------------------------------- experiences */}
      <Reveal as="section" className="mt-12 sm:mt-14">
        <h2 className="nf-h2 mb-4">{t.home.topExperiences}</h2>
        <ul className="nf-scroll-x -mx-5 flex snap-x snap-mandatory gap-4 px-5 pb-1 scroll-pl-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 sm:pb-0 lg:grid-cols-5">
          {experiences.map((e) => (
            <li key={e.label} className="w-[7.75rem] shrink-0 snap-start sm:w-auto">
              <Link
                href="/search?type=experience"
                className="nf-card nf-card--interactive flex h-full flex-col items-center gap-3 p-4 text-center sm:p-5"
              >
                <span className="block h-16 w-16 sm:h-16 sm:w-16">
                  <BrandIcon name={e.icon} fill />
                </span>
                <span className="text-[0.8125rem] font-semibold">{e.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </>
  );
}
