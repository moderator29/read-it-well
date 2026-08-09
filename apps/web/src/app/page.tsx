import Image from "next/image";
import Link from "next/link";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FilterLink } from "@/components/app/filters/FilterLink";
import { TrustIcon, type TrustIconName } from "@/design-system/icons/TrustIcon";
import { HowItWorks } from "@/components/site/landing/HowItWorks";
import { PopularDestinations } from "@/components/site/landing/PopularDestinations";
import { AgentsBand } from "@/components/site/landing/AgentsBand";
import { WhyRentMe } from "@/components/site/landing/WhyRentMe";
import { VoicesBand } from "@/components/site/landing/VoicesBand";
import { ProductFrame } from "@/components/site/landing/ProductFrame";
import { FeaturedCarousel } from "@/components/site/landing/FeaturedCarousel";
import { MoodRow } from "@/components/site/landing/MoodRow";
import { NumbersBand } from "@/components/site/landing/NumbersBand";
import { PlatformConsole } from "@/components/site/landing/PlatformConsole";
import {
  VillaShowcase,
  CoverageMap,
  AssistantShowcase,
} from "@/components/site/landing/SignatureShowcase";
import { StoryRail } from "@/components/site/landing/StoryRail";
import { gatedHref } from "@/lib/site/gated-href";

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

  /*
   * The five things somebody can do here, in the order they are wanted.
   *
   * This row used to lead with Hotels and end with Experiences, illustrated by
   * a suitcase, on a platform whose name is about renting. It also went
   * through gatedHref, which sent a signed-out visitor to sign in before they
   * could look at anything. Browsing is open now, so these are plain links and
   * the wall comes later, when somebody tries to save, message or pay.
   *
   * Every icon depicts the thing it stands for. The suitcase and the gift box
   * that used to label Experiences and Restaurants are gone: an object that
   * does not mean what it sits under teaches a reader to stop reading objects.
   */
  const categories: { icon: BrandIconName; label: string; href: string }[] = [
    { icon: "keys-home", label: t.nav.rent, href: "/search?intent=rent" },
    { icon: "home-check", label: t.nav.buy, href: "/search?intent=sale" },
    { icon: "hotel-star", label: t.nav.shortlets, href: "/search?type=shortlet" },
    { icon: "map-spot", label: t.nav.land, href: "/search?type=land" },
    { icon: "keys-tag", label: t.nav.commercial, href: "/search?type=office" },
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
    /* The fifth cell was "Available on / App Store & Play Store" beside Apple's
       and Google's real badge artwork. We are on neither store. */
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
           * THE HERO CARRIES NO PICTURE, AND THAT IS THE DECISION.
           *
           * It used to carry two. A 2.3MB villa render bled across the whole
           * width behind the headline, and three brand objects drifted around
           * it at absolute positions. Between them they did three things
           * wrong. They put the most expensive asset on the platform in front
           * of the one thing a visitor is here to do, which is search. They
           * were decoration, so they said nothing, and a reader learns very
           * quickly that objects on this platform mean nothing. And a render
           * of a house nobody can rent is the oldest lie in property
           * marketing.
           *
           * What replaces them is directly below the search bar: the same
           * object family, at a size you can actually read, standing for the
           * five things somebody can do here, each one a link. The art now
           * carries the navigation instead of competing with it.
           */}

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
              <div className="nf-rise nf-rise-4 mt-7 flex items-start gap-2 sm:items-center">
              <form
                action="/search"
                method="get"
                role="search"
                className="nf-card nf-card--live nf-focus-well flex min-w-0 flex-1 flex-col gap-2 p-2 sm:flex-row sm:items-center"
              >
                <label htmlFor="hero-q" className="sr-only">
                  {t.landing.hero.searchLabel}
                </label>
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
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
                <Button type="submit" variant="primary" size="lg" className="nf-breathe">
                  {t.common.search}
                </Button>
              </form>
              {/* Filters live beside the bar here too, so the control is in the
                  same place on every search surface. */}
              <FilterLink label={t.common.search} />
              </div>

              <ul className="nf-rise nf-rise-5 mt-4 flex flex-wrap gap-2">
                {CITIES.map((city) => (
                  <li key={city}>
                    <Link
                      href={gatedHref(`/search?q=${encodeURIComponent(city)}`)}
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

          {/* ---------------------------------------------------- object row */}
          {/*
           * Five things you can do, drawn as five objects.
           *
           * NO CONTAINER. No card, no tile, no chip, no ring, no plate. The
           * object sits on the page with its label under it and nothing is
           * drawn around it, which is the single change that makes a row of
           * icons read as a considered set rather than a toolbar. A box around
           * an object adds a second edge competing with the edge the object
           * already has, and five of them turn a row into a grid of boxes.
           *
           * The objects are large on purpose, 88px climbing to 112px. At the
           * 56px they were drawn at inside cards, these renders lose the
           * modelling that makes them worth having, and a small object inside
           * a large box is the shape that reads as clutter.
           */}
          <nav aria-label="Browse by category" className="nf-shell relative z-10 mt-12 sm:mt-14">
            <ul className="grid grid-cols-3 gap-x-2 gap-y-8 sm:grid-cols-5 sm:gap-x-4">
              {categories.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    prefetch
                    className="nf-object-link group flex flex-col items-center gap-3 text-center"
                  >
                    <span className="h-[5.5rem] w-[5.5rem] shrink-0 transition-transform duration-[var(--nf-motion-slow)] group-hover:-translate-y-1 motion-reduce:transform-none sm:h-24 sm:w-24 lg:h-28 lg:w-28">
                      <BrandIcon name={c.icon} fill />
                    </span>
                    <span className="text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)] sm:text-[1rem]">
                      {c.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {/* ------------------------------------------------ the story rail */}
        <StoryRail />

        {/*
          What the product actually looks like.

          Placed directly after HowItWorks, so the three steps are immediately
          followed by the thing they describe. The hero keeps its villa
          atmosphere - that is the mood - and this is the product. The audit
          found the site had no product imagery anywhere, so a visitor could
          reach the sign-up button without ever seeing what they were signing
          up to.
        */}
        <section className="nf-shell grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2">
          <Reveal>
            <p className="nf-overline">The app</p>
            <h2 className="nf-h2 mt-2 max-w-[16ch]">Everything in one place, on your phone</h2>
            <p className="mt-3 max-w-[48ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-muted)]">
              Search, book, pay and message from the same screen. No calls, no
              agent runaround, no bank transfer to a stranger.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <ProductFrame t={t} locale={locale} />
          </Reveal>
        </section>

        <HowItWorks t={t} />

        {/* --------------------------------------------- featured this week */}
        <FeaturedCarousel locale={locale} />

        {/* ------------------------------------------------ signature villa */}
        <VillaShowcase />

        {/*
          -------------------------------------------------------- facts band

          TWO CELLS, BOTH COUNTABLE.

          This was four, and the two that are gone were not facts at all. One
          printed "₦" in the same display weight as a statistic, so a currency
          symbol sat in a row of numbers reading as a quantity of something. The
          other printed "24/7", a support-availability promise nobody on this
          platform has committed to, wedged between two figures that are true.

          What is left is the coverage of the platform and the number of
          languages it ships in, and both of those can be checked.
        */}
        <section className="nf-shell pt-4">
          <Reveal>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { big: "36 + FCT", small: t.landing.vision.points.everywhere.title },
                { big: "4", small: t.landing.trust.multiLanguage.title },
              ].map((s) => (
                <li key={s.small} className="nf-card px-4 py-4 text-center sm:px-5 sm:py-5">
                  <span className="nf-gradient-text nf-numeric block font-[family-name:var(--nf-font-display)] text-[1.45rem] font-bold leading-none sm:text-[1.8rem]">
                    {s.big}
                  </span>
                  {/* Wraps. This caption is the only thing saying what the
                      number above it counts, and four locales set it at four
                      different lengths. */}
                  <span className="mt-1.5 block text-balance text-[0.72rem] text-[var(--nf-content-muted)] sm:text-[0.8125rem]">
                    {s.small}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ----------------------------------------------------- console */}
        <Reveal>
          <PlatformConsole />
        </Reveal>

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
                <ul className="grid gap-5 sm:grid-cols-2">
                  {visionPoints.map((p) => (
                    <li key={p.title} className="nf-card nf-card--interactive p-5">
                      <span className="mb-3 block h-16 w-16">
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

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {categories.map((c, i) => (
              <Reveal as="li" key={c.href} delay={i * 60}>
                <Link
                  href={c.href}
                  className="nf-card nf-card--interactive flex h-full flex-col items-center gap-4 p-5 text-center sm:p-6"
                >
                  <span className="h-14 w-14 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
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

        {/*
          Real guest voices, or nothing at all.

          Placed after WhyRentMe deliberately: that section is the platform
          making its own case, and this is other people answering it. Renders
          null until a real review exists, so the page simply does not have a
          testimonials section rather than having an empty or invented one.
        */}
        <VoicesBand locale={locale} />

        {/* --------------------------------------------- assistant showcase */}
        <AssistantShowcase />

        {/* ----------------------------------------------------- numbers band */}
        <NumbersBand locale={locale} />

        {/* ---------------------------------------------------------- trust */}
        <section className="nf-shell">
          <Reveal>
            <ul className="nf-card grid grid-cols-1 overflow-hidden p-0 sm:grid-cols-2 lg:grid-cols-5">
              {trust.map((item, i) => (
                <li
                  key={item.title}
                  className={[
                    "flex items-center gap-4 px-5 py-5",
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
                    {/* The trust strip. Both lines are written copy, and both
                        were clipping on a desktop viewport: "Your safety is our
                        priorit" and "App Store & Play Sto". */}
                    <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                      {item.title}
                    </span>
                    <span className="block text-[0.8125rem] text-[var(--nf-content-muted)]">
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
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <ButtonLink href="/sign-up" variant="primary" size="lg" className="nf-breathe">
                    {t.landing.cta.action}
                  </ButtonLink>
                  {/* This said "Browse without an account" and pointed at
                      /search. The product is behind a session now, so it was
                      an offer the next click refused. The docs are the honest
                      version of the same invitation: see the whole thing,
                      free, without joining. */}
                  <ButtonLink href="/docs" variant="secondary" size="lg">
                    {t.landing.cta.secondary}
                  </ButtonLink>
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
