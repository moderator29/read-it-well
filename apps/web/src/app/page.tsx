import Link from "next/link";
import { getDictionary, formatNumber, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getPlatformStats } from "@/lib/platform-stats";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TrustIcon, type TrustIconName } from "@/design-system/icons/TrustIcon";
import { HeroIsland } from "@/design-system/scenes/HeroIsland";

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan"];

export default async function LandingPage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const stats = await getPlatformStats();

  const heroChips: {
    key: keyof typeof t.landing.stats;
    icon: IconName;
    value: number | null;
    pos: string;
  }[] = [
    { key: "apartments", icon: "apartment", value: stats?.apartments ?? null, pos: "left-[-4%] top-[24%]" },
    { key: "hotels", icon: "hotel", value: stats?.hotels ?? null, pos: "left-[22%] top-[2%]" },
    { key: "restaurants", icon: "restaurant", value: stats?.restaurants ?? null, pos: "right-[-3%] top-[30%]" },
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

  const visionPoints: { icon: IconName; title: string; body: string }[] = [
    { icon: "verified", ...t.landing.vision.points.verified },
    { icon: "wallet", ...t.landing.vision.points.naira },
    { icon: "map", ...t.landing.vision.points.everywhere },
    { icon: "ai-assistant", ...t.landing.vision.points.assistant },
  ];

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
        <section className="relative overflow-hidden pb-12 pt-6 sm:pt-10 md:pt-14">
          <div className="nf-aurora" aria-hidden="true" />
          <div className="nf-grid-veil" aria-hidden="true" />

          {/*
           * Mobile: the island is the atmosphere of the first view, rising to the
           * right of the headline and dissolving into the canvas through a scrim,
           * so the skyscraper is part of the opening frame rather than stranded
           * at the foot of the page. It is hidden at lg, where the island gets its
           * own column instead.
           */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden lg:hidden"
          >
            <div className="absolute right-[-16%] top-[3%] w-[74%] max-w-[420px] opacity-[0.55] nf-float">
              <HeroIsland priority />
            </div>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(6,4,14,0) 0%, rgba(6,4,14,0.15) 42%, rgba(6,4,14,0.7) 78%, rgba(6,4,14,0.95) 100%)",
              }}
            />
          </div>

          <div className="nf-shell relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
            <div className="nf-rise">
              <span className="nf-overline mb-3 inline-flex items-center gap-2">
                <UiIcon name="sparkle" size={14} />
                {t.landing.hero.popularLabel}
              </span>

              <h1 className="nf-display">
                <span className="block">{t.landing.hero.line1}</span>
                <span className="block">{t.landing.hero.line2}</span>
                <span className="nf-gradient-text nf-shine block">{t.landing.hero.line3}</span>
              </h1>

              <p className="mt-4 max-w-[42ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)] sm:mt-5">
                {t.landing.hero.subtitle}
              </p>

              {/* Real form. GET to the search route. */}
              <form
                action="/search"
                method="get"
                role="search"
                className="nf-card mt-7 flex flex-col gap-2 p-2 sm:flex-row sm:items-center"
              >
                <label htmlFor="hero-q" className="sr-only">
                  {t.landing.hero.searchLabel}
                </label>
                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
                  <UiIcon name="search" size={20} className="text-[var(--nf-content-muted)]" />
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

            {/* ------------------------------------------------ hero object (desktop) */}
            <div className="relative hidden lg:block">
              <div className="nf-float">
                <HeroIsland priority className="drop-shadow-[0_50px_90px_rgba(0,0,0,0.65)]" />
              </div>

              <ul className="pointer-events-none absolute inset-0">
                {heroChips.map((c) => (
                  <li
                    key={c.key}
                    className={`nf-glass absolute flex items-center gap-2 rounded-[var(--nf-radius-lg)] px-3 py-2 shadow-[var(--nf-shadow-lifted)] nf-float-slow ${c.pos}`}
                  >
                    <span className="h-7 w-7">
                      <Icon name={c.icon} fill />
                    </span>
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
            <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              {features.map((f) => (
                <li key={f.title} className="nf-card nf-card--interactive flex items-center gap-3 p-3.5 sm:p-4">
                  <span className="h-9 w-9 shrink-0 sm:h-11 sm:w-11">
                    <Icon name={f.icon} fill />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.875rem] font-semibold text-[var(--nf-content-primary)] sm:text-[0.9375rem]">
                      {f.title}
                    </span>
                    <span className="block text-[0.75rem] text-[var(--nf-content-muted)] sm:text-[0.8125rem]">
                      {f.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --------------------------------------------------- vision / mission */}
        <section className="relative overflow-hidden py-16 sm:py-20">
          <div className="nf-shell relative z-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <Reveal>
                <span className="nf-overline">{t.landing.vision.overline}</span>
                <h2 className="nf-h1 mt-3">{t.landing.vision.title}</h2>
                <p className="mt-4 max-w-[46ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)]">
                  {t.landing.vision.body}
                </p>

                <div className="nf-card mt-7 p-5 sm:p-6">
                  <span className="nf-overline">{t.landing.vision.missionOverline}</span>
                  <h3 className="nf-h3 mt-2">{t.landing.vision.missionTitle}</h3>
                  <p className="mt-3 text-[var(--nf-content-secondary)]">
                    {t.landing.vision.missionBody}
                  </p>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {visionPoints.map((p) => (
                    <li key={p.title} className="nf-card nf-card--interactive p-5">
                      <span className="mb-3 block h-12 w-12">
                        <Icon name={p.icon} fill />
                      </span>
                      <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                        {p.title}
                      </span>
                      <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                        {p.body}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- categories */}
        <section className="nf-shell py-10 sm:py-14">
          <Reveal className="mb-7 max-w-[52ch] sm:mb-8">
            <h2 className="nf-h1">{t.landing.categories.title}</h2>
            <p className="mt-3 text-[var(--nf-content-secondary)]">
              {t.landing.categories.subtitle}
            </p>
          </Reveal>

          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
            {categories.map((c, i) => (
              <Reveal as="li" key={c.href} delay={i * 60}>
                <Link
                  href={c.href}
                  className="nf-card nf-card--interactive flex h-full flex-col items-center gap-3 p-5 text-center sm:p-6"
                >
                  <span className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                    <Icon name={c.icon} fill />
                  </span>
                  <span className="text-[0.875rem] font-semibold sm:text-[0.9375rem]">{c.label}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------- trust */}
        <section className="nf-shell">
          <Reveal>
            <ul className="nf-card grid grid-cols-1 overflow-hidden p-0 sm:grid-cols-2 lg:grid-cols-5">
              {trust.map((item, i) => (
                <li
                  key={item.title}
                  className={[
                    "flex items-center gap-3 px-5 py-5",
                    i > 0 ? "sm:border-l sm:border-[var(--nf-border-subtle)]" : "",
                    i % 2 === 0 ? "sm:border-l-0 lg:border-l" : "",
                    i === 0 ? "lg:border-l-0" : "",
                    i > 0 ? "border-t border-[var(--nf-border-subtle)] sm:border-t-0" : "",
                    i > 1 ? "sm:border-t sm:lg:border-t-0" : "",
                  ].join(" ")}
                >
                  <span className="flex shrink-0 items-center gap-1.5">
                    {item.icons.map((n) => (
                      <TrustIcon key={n} name={n} size={34} />
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
          </Reveal>
        </section>

        {/* ------------------------------------------------------------ cta */}
        <section className="nf-shell py-16 sm:pt-20">
          <Reveal>
            <div className="nf-card relative overflow-hidden p-8 text-center sm:p-10 md:p-14">
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
          </Reveal>
        </section>
      </main>

      <SiteFooter t={t} />
    </>
  );
}
