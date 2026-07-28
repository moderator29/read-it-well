import Link from "next/link";
import { getDictionary, formatNumber, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getPlatformStats } from "@/lib/platform-stats";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TrustIcon, type TrustIconName } from "@/design-system/icons/TrustIcon";
import { HeroIsland } from "@/design-system/scenes/HeroIsland";

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan"];

export default async function LandingPage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const stats = await getPlatformStats();

  /* Chip placement mirrors the reference: two on the left of the island, one
   * on the upper right. Counts stay absent until the platform can supply them. */
  const heroChips: {
    key: keyof typeof t.landing.stats;
    icon: IconName;
    value: number | null;
    pos: string;
  }[] = [
    { key: "apartments", icon: "apartment", value: stats?.apartments ?? null, pos: "left-[-3%] top-[26%]" },
    { key: "hotels", icon: "hotel", value: stats?.hotels ?? null, pos: "left-[24%] top-[6%]" },
    { key: "restaurants", icon: "restaurant", value: stats?.restaurants ?? null, pos: "right-[-2%] top-[30%]" },
  ];

  const features: { icon: IconName; title: string; body: string }[] = [
    { icon: "ai-assistant", ...t.landing.features.ai },
    { icon: "verified", ...t.landing.features.verified },
    { icon: "wallet", ...t.landing.features.prices },
    { icon: "booking", ...t.landing.features.booking },
  ];

  const categories: { icon: IconName; label: string; href: string }[] = [
    { icon: "hotel", label: t.nav.hotels, href: "/search?type=hotel" },
    { icon: "apartment", label: t.nav.apartments, href: "/search?type=property" },
    { icon: "home", label: t.nav.homes, href: "/search?type=home" },
    { icon: "restaurant", label: t.nav.restaurants, href: "/search?type=restaurant" },
    { icon: "experience", label: t.nav.experiences, href: "/search?type=experience" },
  ];

  /* Trust bar. Icons drawn as vector, see TrustIcon: the Africa silhouette,
   * the AI chip and the two store marks are not in the photographic pack, and
   * the versions on the reference sheet are only about 35px. */
  const trust: { icons: TrustIconName[]; title: string; body: string }[] = [
    { icons: ["globe"], ...t.landing.trust.multiLanguage },
    { icons: ["shield"], ...t.landing.trust.secure },
    { icons: ["ai-chip"], ...t.landing.trust.ai },
    { icons: ["africa"], ...t.landing.trust.africa },
    { icons: ["app-store", "play-store"], ...t.landing.trust.stores },
  ];

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main">
        {/* ----------------------------------------------------------- hero */}
        <section className="relative overflow-hidden pb-10 pt-10 md:pt-14">
          <div className="nf-aurora" aria-hidden="true" />
          <div className="nf-grid-veil" aria-hidden="true" />

          <div className="nf-shell relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
            <div className="nf-rise">
              <h1 className="nf-display">
                <span className="block">{t.landing.hero.line1}</span>
                <span className="block">{t.landing.hero.line2}</span>
                <span className="nf-gradient-text block">{t.landing.hero.line3}</span>
              </h1>

              <p className="mt-5 max-w-[44ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)]">
                {t.landing.hero.subtitle}
              </p>

              {/* Real form. GET to the search route. */}
              <form
                action="/search"
                method="get"
                role="search"
                className="nf-card mt-8 flex flex-col gap-2 p-2 sm:flex-row sm:items-center"
              >
                <label htmlFor="hero-q" className="sr-only">
                  {t.landing.hero.searchLabel}
                </label>
                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
                  <UiIcon name="search" size={22} className="text-[var(--nf-content-muted)]" />
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

              <ul className="mt-4 flex flex-wrap gap-2">
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
                <HeroIsland priority className="drop-shadow-[0_50px_90px_rgba(0,0,0,0.65)]" />
              </div>

              <ul className="pointer-events-none absolute inset-0 hidden sm:block">
                {heroChips.map((c) => (
                  <li
                    key={c.key}
                    className={`nf-glass absolute flex items-center gap-2 rounded-[var(--nf-radius-lg)] px-3 py-2 shadow-[var(--nf-shadow-lifted)] ${c.pos}`}
                  >
                    <Icon name={c.icon} size={30} />
                    <span className="leading-tight">
                      <span className="block text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
                        {t.landing.stats[c.key]}
                      </span>
                      {c.value !== null && (
                        <span className="nf-numeric block text-[0.75rem] text-[var(--nf-content-muted)]">
                          {formatNumber(c.value, locale)}+
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* --------------------------------------------------- feature row */}
          <div className="nf-shell relative z-10 mt-10">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <li key={f.title} className="nf-card nf-card--interactive flex items-center gap-3 p-4">
                  <Icon name={f.icon} size={40} />
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
        <section className="nf-shell py-14">
          <div className="mb-8 max-w-[52ch]">
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
                  <Icon name={c.icon} size={64} />
                  <span className="text-[0.9375rem] font-semibold">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------- trust */}
        <section className="nf-shell">
          <ul className="nf-card grid grid-cols-1 overflow-hidden p-0 sm:grid-cols-2 lg:grid-cols-5">
            {trust.map((item, i) => (
              <li
                key={item.title}
                className={[
                  "flex items-center gap-3 px-5 py-5",
                  // Hairline dividers between cells, matching the reference.
                  // They follow the grid: vertical between columns, horizontal
                  // between rows, and never on a leading edge.
                  i > 0 ? "sm:border-l sm:border-[var(--nf-border-subtle)]" : "",
                  i % 2 === 0 ? "sm:border-l-0 lg:border-l" : "",
                  i === 0 ? "lg:border-l-0" : "",
                  i > 0 ? "border-t border-[var(--nf-border-subtle)] sm:border-t-0" : "",
                  i > 1 ? "sm:border-t sm:lg:border-t-0" : "",
                ].join(" ")}
              >
                <span className="flex shrink-0 items-center gap-1.5">
                  {item.icons.map((n) => (
                    <TrustIcon key={n} name={n} size={38} />
                  ))}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                    {item.title}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-[var(--nf-content-muted)]">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------ cta */}
        <section className="nf-shell pt-16">
          <div className="nf-card relative overflow-hidden p-10 text-center md:p-14">
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
