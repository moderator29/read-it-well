import Image from "next/image";
import Link from "next/link";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TrustIcon, type TrustIconName } from "@/design-system/icons/TrustIcon";
import { HowItWorks } from "@/components/site/landing/HowItWorks";
import { PopularDestinations } from "@/components/site/landing/PopularDestinations";
import { AgentsBand } from "@/components/site/landing/AgentsBand";
import { WhyRentMe } from "@/components/site/landing/WhyRentMe";
import { FeaturedCarousel } from "@/components/site/landing/FeaturedCarousel";
import { MoodRow } from "@/components/site/landing/MoodRow";
import { NumbersBand } from "@/components/site/landing/NumbersBand";
import {
  VillaShowcase,
  CoverageMap,
  AssistantShowcase,
} from "@/components/site/landing/SignatureShowcase";
import { StoryRail } from "@/components/site/landing/StoryRail";

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan"];

export default async function LandingPage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  const features: { icon: BrandIconName; title: string; body: string }[] = [
    { icon: "bot-home", ...t.landing.features.ai },
    { icon: "shield-check", ...t.landing.features.verified },
    { icon: "tag-percent", ...t.landing.features.prices },
    { icon: "calendar-check", ...t.landing.features.booking },
  ];

  const categories: { icon: BrandIconName; label: string; href: string }[] = [
    { icon: "hotel-star", label: t.nav.hotels, href: "/search?type=hotel" },
    { icon: "homes-sparkle", label: t.nav.apartments, href: "/search?type=property" },
    { icon: "house-sparkle", label: t.nav.homes, href: "/search?type=home" },
    { icon: "keys-home", label: t.nav.rent, href: "/rent" },
    { icon: "luggage-check", label: t.nav.experiences, href: "/search?type=experience" },
  ];

  const visionPoints: { icon: BrandIconName; title: string; body: string }[] = [
    { icon: "user-verified", ...t.landing.vision.points.verified },
    { icon: "naira-hand", ...t.landing.vision.points.naira },
    { icon: "map-route", ...t.landing.vision.points.everywhere },
    { icon: "bot-chat", ...t.landing.vision.points.assistant },
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

          {/* Floating category objects drifting in the hero air. Decorative. */}
          <div className="nf-icon-field" aria-hidden="true">
            <span className="left-[4%] top-[64%] h-8 w-8 sm:h-10 sm:w-10">
              <BrandIcon name="wallet-secure" fill />
            </span>
            <span className="left-[46%] top-[8%] hidden h-9 w-9 sm:block">
              <BrandIcon name="pin-map" fill />
            </span>
            <span className="right-[6%] top-[56%] h-8 w-8 sm:h-10 sm:w-10 lg:right-[40%] lg:top-[74%]">
              <BrandIcon name="keys-home" fill />
            </span>
          </div>

          {/*
           * The villa is the hero's atmosphere, not a picture in a frame: a
           * large masked still dissolving into the canvas behind the text, so
           * the scene and the platform read as one surface. Its edges never
           * print; the mask fades it out in every direction.
           */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
            <div className="nf-float-slow absolute right-[-18%] top-[-2%] w-[95%] max-w-[560px] sm:right-[-8%] sm:w-[70%] lg:right-[-4%] lg:top-[-12%] lg:w-[58%] lg:max-w-[900px]">
              <Image
                src="/brand/rentme-villa.png"
                alt=""
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 640px) 95vw, (max-width: 1024px) 70vw, 58vw"
                className="nf-hero-scene h-auto w-full"
              />
            </div>
          </div>

          <div className="nf-shell relative z-10">
            <div className="max-w-2xl">
              <h1 className="nf-display">
                <span className="nf-rise block">{t.landing.hero.line1}</span>
                <span className="nf-rise nf-rise-2 block">{t.landing.hero.line2}</span>
                <span className="nf-rise nf-rise-3 nf-gradient-text nf-shine block">
                  {t.landing.hero.line3}
                </span>
              </h1>

              <p className="nf-rise nf-rise-4 mt-4 max-w-[42ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)] sm:mt-5">
                {t.landing.hero.subtitle}
              </p>

              {/* Real form. GET to the search route. */}
              <form
                action="/search"
                method="get"
                role="search"
                className="nf-rise nf-rise-4 nf-card nf-card--live mt-7 flex flex-col gap-2 p-2 sm:flex-row sm:items-center"
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
                <button type="submit" className="nf-btn nf-btn--primary nf-btn--lg nf-breathe">
                  {t.common.search}
                </button>
              </form>

              <ul className="nf-rise nf-rise-5 mt-4 flex flex-wrap gap-2">
                {CITIES.map((city) => (
                  <li key={city}>
                    <Link
                      href={`/search?q=${encodeURIComponent(city)}`}
                      prefetch
                      className="nf-chip relative z-10"
                    >
                      {city}
                    </Link>
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
                    <BrandIcon name={f.icon} fill />
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

        {/* ------------------------------------------------ the story rail */}
        <StoryRail />

        <HowItWorks t={t} />

        {/* --------------------------------------------- featured this week */}
        <FeaturedCarousel locale={locale} />

        {/* ------------------------------------------------ signature villa */}
        <VillaShowcase />

        {/* -------------------------------------------------------- facts band */}
        <section className="nf-shell pt-4">
          <Reveal>
            <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              {[
                { big: "36 + FCT", small: t.landing.vision.points.everywhere.title },
                { big: "4", small: t.landing.trust.multiLanguage.title },
                { big: "₦", small: t.landing.features.prices.title },
                { big: "24/7", small: t.landing.features.ai.title },
              ].map((s) => (
                <li key={s.small} className="nf-card px-4 py-4 text-center sm:px-5 sm:py-5">
                  <span className="nf-gradient-text nf-numeric block font-[family-name:var(--nf-font-display)] text-[1.45rem] font-bold leading-none sm:text-[1.8rem]">
                    {s.big}
                  </span>
                  <span className="mt-1.5 block truncate text-[0.72rem] text-[var(--nf-content-muted)] sm:text-[0.8125rem]">
                    {s.small}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
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
                        <BrandIcon name={p.icon} fill />
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
                    <BrandIcon name={c.icon} fill />
                  </span>
                  <span className="text-[0.875rem] font-semibold sm:text-[0.9375rem]">{c.label}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* --------------------------------------------------------- mood row */}
        <MoodRow />

        <PopularDestinations t={t} />

        {/* --------------------------------------------------- coverage map */}
        <CoverageMap />

        <AgentsBand t={t} />

        <WhyRentMe t={t} />

        {/* --------------------------------------------- assistant showcase */}
        <AssistantShowcase />

        {/* ----------------------------------------------------- numbers band */}
        <NumbersBand />

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

        {/* ------------------------------------------------------------- faq */}
        <section className="nf-shell pt-14">
          <Reveal className="mb-6 max-w-[52ch]">
            <h2 className="nf-h1">Questions, answered</h2>
          </Reveal>
          <div className="space-y-2.5">
            {[
              ["Is my payment safe?", "Yes. Payments are processed by a licensed Nigerian payment provider, and your card details never touch our servers. You are never charged before you confirm."],
              ["Can I list my property?", "Yes. Apply in about ten minutes from the Become an Agent page. Every application is reviewed before listings go live."],
              ["Which languages are supported?", "English, Yoruba, Hausa and Igbo, switchable at any time from the top bar."],
              ["Where does RentMe operate?", "All 36 states and the FCT from day one, with the deepest coverage growing city by city."],
              ["How do I get help?", "The AI assistant answers instantly inside the app, and our support team is one message away."],
              ["How do payments work before launch?", "Card payments switch on at public launch. Until then you can browse, save favourites and shortlist places, and no money changes hands. When payments open they run in naira through a licensed Nigerian payment provider."],
              ["Is there a booking fee?", "No. There are no booking fees on RentMe right now. The price you see on a listing is the price you pay, with any charges shown in full before you confirm."],
              ["How do agents get verified?", "Every agent submits a government issued ID and proof that they own or manage the property. Our team reviews each application by hand, and only approved agents can publish listings."],
              ["Can I pay in instalments?", "Not yet. Bookings are paid in full for now. Instalment payments are on our roadmap, and we will announce them the moment they are ready rather than promise a date."],
              ["What happens after I book?", "You get an instant confirmation with the address, check in details and the host's contact, and the booking appears in your account. Reminders arrive as your date approaches."],
              ["How do I contact a host?", "Once your booking is confirmed you can message the host directly from the booking page, and the AI assistant can help draft questions in any of our four languages."],
              ["Is my data safe under NDPA?", "Yes. RentMe is built to comply with the Nigeria Data Protection Act. Your data is encrypted in transit and at rest, is never sold, and you can request a copy or deletion at any time."],
            ].map(([q, a]) => (
              <Reveal key={q}>
                <details className="nf-card group p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[0.9375rem] font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="text-[var(--nf-content-muted)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-5 pb-4 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ cta */}
        <section className="nf-shell py-16 sm:pt-20">
          <Reveal>
            <div className="nf-card nf-card--live relative overflow-hidden p-8 text-center sm:p-10 md:p-14">
              <div className="nf-aurora opacity-60" aria-hidden="true" />
              <div className="relative z-10">
                <h2 className="nf-h1 mx-auto max-w-[20ch]">{t.landing.cta.title}</h2>
                <p className="mx-auto mt-4 max-w-[52ch] text-[var(--nf-content-secondary)]">
                  {t.landing.cta.subtitle}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/sign-up" className="nf-btn nf-btn--primary nf-btn--lg nf-breathe">
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
