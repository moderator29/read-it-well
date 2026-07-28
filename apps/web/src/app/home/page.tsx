import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { AppRail } from "@/components/app/AppRail";
import { ListingCard } from "@/components/app/ListingCard";
import { AiAssistantBanner } from "@/components/app/AiAssistantBanner";
import { MobileTabBar } from "@/components/app/MobileTabBar";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { LogoMark } from "@/design-system/brand/Logo";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

/**
 * Personal Mode home.
 *
 * Signed in discovery surface. There is no session layer yet, so the greeting
 * name is a placeholder constant rather than a fabricated user record, and the
 * route is marked noindex until auth gates it.
 */
const PLACEHOLDER_NAME = "there";

export default async function HomePage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  const repo = getListingRepository();
  const listings = await repo.recommended(6);

  const categories: { icon: IconName; label: string; href: string }[] = [
    { icon: "hotel", label: t.nav.hotels, href: "/search?type=hotel" },
    { icon: "apartment", label: t.nav.apartments, href: "/search?type=property" },
    { icon: "home", label: t.nav.homes, href: "/search?type=home" },
    { icon: "restaurant", label: t.nav.restaurants, href: "/search?type=restaurant" },
    { icon: "experience", label: t.nav.experiences, href: "/search?type=experience" },
  ];

  const experiences: { icon: IconName; label: string }[] = [
    { icon: "pool", label: t.home.experienceCategories.beach },
    { icon: "map", label: t.home.experienceCategories.city },
    { icon: "restaurant", label: t.home.experienceCategories.dining },
    { icon: "car-rental", label: t.home.experienceCategories.adventure },
    { icon: "event", label: t.home.experienceCategories.events },
  ];

  return (
    <div className="flex min-h-dvh">
      <AppRail t={t} active="/home" userName={PLACEHOLDER_NAME} />

      <main id="main" className="min-w-0 flex-1">
        {/* ------------------------------------------------------- top bar */}
        <header className="nf-glass sticky top-0 z-40 border-b border-[var(--nf-border-subtle)]">
          <div className="flex h-[68px] items-center gap-4 px-5 md:px-8">
            <Link href="/" className="lg:hidden" aria-label={t.a11y.logoHome}>
              <LogoMark size={34} />
            </Link>

            <span className="nf-chip hidden sm:inline-flex">
              <UiIcon name="location" size={15} />
              Lagos, Nigeria
            </span>

            <div className="flex-1" />

            <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />

            <Link href="/assistant" className="nf-btn nf-btn--glass gap-2 px-3.5 py-2">
              <Icon name="ai-assistant" size={26} />
              <span className="hidden sm:inline">{t.nav.aiAssistant}</span>
            </Link>
          </div>
        </header>

        <div className="px-5 pb-28 pt-8 md:px-8 lg:pb-20">
          {/*
           * Sample data is declared, never disguised. Deliberately not gated on
           * NODE_ENV: a production build still defaults to the seed source, and
           * unlabelled sample inventory on a live site is exactly the thing
           * Master Rule 8 forbids. The badge disappears when real data arrives.
           */}
          {repo.isSeed && (
            <p className="nf-badge nf-badge--warning mb-5">
              Sample content. Not live inventory.
            </p>
          )}

          {/* ---------------------------------------------------- greeting */}
          <section className="nf-rise">
            <h1 className="nf-h1">
              {t.home.greeting}, <span className="nf-gradient-text">{PLACEHOLDER_NAME}</span>
            </h1>
            <p className="mt-2 text-[var(--nf-content-secondary)]">{t.home.prompt}</p>

            <form
              action="/search"
              method="get"
              role="search"
              className="nf-card mt-6 flex max-w-3xl items-center gap-2 p-2"
            >
              <label htmlFor="home-q" className="sr-only">
                {t.home.searchPlaceholder}
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                <UiIcon name="search" size={20} className="text-[var(--nf-content-muted)]" />
                <input
                  id="home-q"
                  name="q"
                  type="search"
                  autoComplete="off"
                  placeholder={t.home.searchPlaceholder}
                  className="w-full bg-transparent py-2.5 text-[var(--nf-content-primary)] outline-none placeholder:text-[var(--nf-content-muted)]"
                />
              </div>
              <button type="submit" className="nf-btn nf-btn--primary">
                {t.common.search}
              </button>
            </form>
          </section>

          {/* -------------------------------------------------- categories */}
          <section className="mt-9">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className="nf-card nf-card--interactive flex flex-col items-center gap-2.5 p-5 text-center"
                  >
                    <Icon name={c.icon} size={56} />
                    <span className="text-[0.875rem] font-semibold">{c.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ----------------------------------------------------- ai card */}
          <div className="mt-9">
            <AiAssistantBanner t={t} />
          </div>

          {/* -------------------------------------------------- recommended */}
          <section className="mt-11">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="nf-h2">{t.home.recommended}</h2>
              <Link
                href="/search"
                className="text-[0.875rem] font-semibold text-[var(--nf-violet-300)] underline-offset-4 hover:underline"
              >
                {t.common.viewAll}
              </Link>
            </div>

            {listings.length === 0 ? (
              <div className="nf-card p-10 text-center">
                <Icon name="search" size={56} className="mx-auto" />
                <p className="mt-4 font-semibold">Nothing to show here yet</p>
                <p className="mt-1 text-[0.875rem] text-[var(--nf-content-muted)]">
                  Once listings are approved they will appear in this space.
                </p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((l) => (
                  <li key={l.id}>
                    <ListingCard listing={l} locale={locale} t={t} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* -------------------------------------------------- agent promo */}
          <section className="mt-11">
            <div className="nf-card relative flex flex-col gap-5 overflow-hidden p-7 md:flex-row md:items-center">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
                style={{ background: "var(--nf-gradient-agent)", opacity: 0.24 }}
                aria-hidden="true"
              />
              <Icon name="apartment" size={60} />
              <div className="min-w-0 flex-1">
                <h2 className="nf-h3">{t.home.agentCard.title}</h2>
                <p className="mt-1.5 max-w-[58ch] text-[0.9375rem] text-[var(--nf-content-secondary)]">
                  {t.home.agentCard.body}
                </p>
              </div>
              <Link href="/agents" className="nf-btn nf-btn--glass shrink-0">
                {t.home.agentCard.action}
              </Link>
            </div>
          </section>

          {/* --------------------------------------------------- experiences */}
          <section className="mt-11">
            <h2 className="nf-h2 mb-4">{t.home.topExperiences}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {experiences.map((e) => (
                <li key={e.label}>
                  <Link
                    href="/search?type=experience"
                    className="nf-card nf-card--interactive flex flex-col items-center gap-2.5 p-5 text-center"
                  >
                    <Icon name={e.icon} size={48} />
                    <span className="text-[0.8125rem] font-semibold">{e.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <MobileTabBar t={t} active="/home" />
    </div>
  );
}
