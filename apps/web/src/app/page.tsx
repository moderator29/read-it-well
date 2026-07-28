import Link from "next/link";
import { getDictionary, formatNumber, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getPlatformStats } from "@/lib/platform-stats";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Icon3D } from "@/design-system/icons/Icon3D";
import { IsometricIsland } from "@/design-system/scenes/IsometricIsland";
import type { GlyphName } from "@/design-system/icons/glyphs";

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan"];

export default async function LandingPage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const stats = await getPlatformStats();

  const heroStats: { key: keyof typeof t.landing.stats; icon: GlyphName; value: number | null }[] = [
    { key: "hotels", icon: "hotel", value: stats?.hotels ?? null },
    { key: "apartments", icon: "apartment", value: stats?.apartments ?? null },
    { key: "restaurants", icon: "restaurants", value: stats?.restaurants ?? null },
  ];

  const features: { icon: GlyphName; title: string; body: string }[] = [
    { icon: "ai-assistant", ...t.landing.features.ai },
    { icon: "verified", ...t.landing.features.verified },
    { icon: "price", ...t.landing.features.prices },
    { icon: "instant", ...t.landing.features.booking },
  ];

  const categories: { icon: GlyphName; label: string; href: string }[] = [
    { icon: "hotel", label: t.nav.hotels, href: "/search?type=hotel" },
    { icon: "apartment", label: t.nav.apartments, href: "/search?type=property" },
    { icon: "homes", label: t.nav.homes, href: "/search?type=home" },
    { icon: "restaurants", label: t.nav.restaurants, href: "/search?type=restaurant" },
    { icon: "experiences", label: t.nav.experiences, href: "/search?type=experience" },
  ];

  const trust: { icon: GlyphName; title: string; body: string }[] = [
    { icon: "language", ...t.landing.trust.multiLanguage },
    { icon: "secure", ...t.landing.trust.secure },
    { icon: "ai-assistant", ...t.landing.trust.ai },
    { icon: "map-pin-cluster", ...t.landing.trust.africa },
    { icon: "instant", ...t.landing.trust.stores },
  ];

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main">
        {/* ----------------------------------------------------------- hero */}
        <section className="relative overflow-hidden pb-8 pt-12 md:pt-16">
          <div className="nf-aurora" aria-hidden="true" />
          <div className="nf-grid-veil" aria-hidden="true" />

          <div className="nf-shell relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div className="nf-rise">
              <p className="nf-overline mb-5 flex items-center gap-2">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--nf-state-success)]"
                  aria-hidden="true"
                />
                {t.landing.hero.popularLabel}
              </p>

              <h1 className="nf-display">
                <span className="block text-[var(--nf-content-primary)]">
                  {t.landing.hero.line1}
                </span>
                <span className="block text-[var(--nf-content-primary)]">
                  {t.landing.hero.line2}
                </span>
                <span className="nf-gradient-text block">{t.landing.hero.line3}</span>
              </h1>

              <p className="mt-6 max-w-[46ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)]">
                {t.landing.hero.subtitle}
              </p>

              {/* Real form. Submits a GET to the search route. */}
              <form
                action="/search"
                method="get"
                role="search"
                className="nf-card mt-9 flex flex-col gap-2 p-2 sm:flex-row sm:items-center"
              >
                <label htmlFor="hero-q" className="sr-only">
                  {t.landing.hero.searchLabel}
                </label>
                <div className="flex flex-1 items-center gap-3 px-3">
                  <Icon3D name="search" size={30} variant="bare" />
                  <input
                    id="hero-q"
                    name="q"
                    type="search"
                    autoComplete="off"
                    placeholder={t.landing.hero.searchPlaceholder}
                    className="w-full bg-transparent py-3 text-[var(--nf-text-body-lg)] text-[var(--nf-content-primary)] outline-none placeholder:text-[var(--nf-content-muted)]"
                  />
                </div>
                <button type="submit" className="nf-btn nf-btn--primary nf-btn--lg">
                  {t.common.search}
                </button>
              </form>

              <ul className="mt-5 flex flex-wrap gap-2">
                {CITIES.map((city) => (
                  <li key={city}>
                    <Link href={`/search?q=${encodeURIComponent(city)}`} className="nf-chip">
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ------------------------------------------------ hero object */}
            <div className="relative">
              <div className="nf-float">
                <IsometricIsland className="w-full drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)]" />
              </div>

              {/*
               * Floating inventory cards. Counts appear automatically once the
               * stats endpoint exists; until then the label carries the card so
               * nothing fabricated is shown.
               */}
              <ul className="pointer-events-none absolute inset-0 hidden md:block">
                {heroStats.map((s, i) => (
                  <li
                    key={s.key}
                    className="nf-glass absolute flex items-center gap-2.5 rounded-[var(--nf-radius-lg)] px-3.5 py-2.5 shadow-[var(--nf-shadow-lifted)]"
                    style={{
                      top: `${[16, 46, 6][i]}%`,
                      left: i === 2 ? "auto" : `${[-4, -8][i]}%`,
                      right: i === 2 ? "-2%" : "auto",
                    }}
                  >
                    <Icon3D name={s.icon} size={34} />
                    <span className="leading-tight">
                      <span className="block text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
                        {t.landing.stats[s.key]}
                      </span>
                      {s.value !== null && (
                        <span className="nf-numeric block text-[0.75rem] text-[var(--nf-content-muted)]">
                          {formatNumber(s.value, locale)}+
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* --------------------------------------------------- feature row */}
          <div className="nf-shell relative z-10 mt-14">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <li key={f.title} className="nf-card nf-card--interactive flex items-center gap-3.5 p-4">
                  <Icon3D name={f.icon} size={44} />
                  <span>
                    <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                      {f.title}
                    </span>
                    <span className="block text-[0.8125rem] text-[var(--nf-content-muted)]">
                      {f.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------- categories */}
        <section className="nf-shell py-16">
          <div className="mb-9 max-w-[52ch]">
            <h2 className="nf-h1">{t.landing.categories.title}</h2>
            <p className="mt-3 text-[var(--nf-content-secondary)]">
              {t.landing.categories.subtitle}
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="nf-card nf-card--interactive flex flex-col items-center gap-3 p-6 text-center"
                >
                  <Icon3D name={c.icon} size={62} />
                  <span className="text-[0.9375rem] font-semibold">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------- trust */}
        <section className="nf-shell">
          <ul className="nf-card grid gap-6 p-7 sm:grid-cols-2 lg:grid-cols-5">
            {trust.map((item) => (
              <li key={item.title} className="flex items-center gap-3">
                <Icon3D name={item.icon} size={40} />
                <span className="leading-tight">
                  <span className="block text-[0.875rem] font-semibold">{item.title}</span>
                  <span className="block text-[0.8125rem] text-[var(--nf-content-muted)]">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------ cta */}
        <section className="nf-shell pt-20">
          <div className="nf-card relative overflow-hidden p-10 text-center md:p-16">
            <div className="nf-aurora opacity-60" aria-hidden="true" />
            <div className="relative z-10">
              <h2 className="nf-h1 mx-auto max-w-[20ch]">{t.landing.cta.title}</h2>
              <p className="mx-auto mt-4 max-w-[52ch] text-[var(--nf-content-secondary)]">
                {t.landing.cta.subtitle}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/sign-up" className="nf-btn nf-btn--primary nf-btn--lg">
                  {t.landing.cta.action}
                </Link>
                <Link href="/search" className="nf-btn nf-btn--glass nf-btn--lg">
                  {t.landing.cta.secondary}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter t={t} />
    </>
  );
}
