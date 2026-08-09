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
import { HowItWorks } from "@/components/site/landing/HowItWorks";
import { AgentsBand } from "@/components/site/landing/AgentsBand";
import { WhyRentMe } from "@/components/site/landing/WhyRentMe";
import { VoicesBand } from "@/components/site/landing/VoicesBand";
import { ProductFrame } from "@/components/site/landing/ProductFrame";
import { FeaturedCarousel } from "@/components/site/landing/FeaturedCarousel";
import { gatedHref } from "@/lib/site/gated-href";

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan"];

export default async function LandingPage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  /* `features` USED TO BE DECLARED HERE. It fed a four-card row under the
     hero - AI Assistant, Verified Listings, Best Prices, Easy Booking - which
     went with the hero imagery it sat beside. The declaration outlived the
     markup by one edit; nothing reads it. */

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

        {/*
          ================================================================
          THE PAGE IS SEVEN SECTIONS. IT WAS TWENTY ONE.
          ================================================================

          What came out, and why each one earned removal rather than a
          rewrite:

          A CATEGORY GRID THAT WAS THE HERO ROW AGAIN. It mapped the same
          `categories` array, into cards this time, one screen below the
          objects that now open the page. The same five links twice, drawn
          two different ways, is how a reader learns that neither is the
          real one.

          A VISION AND MISSION SPREAD. Two headings, a card inside the
          column, and four more cards beside it, all of it the platform
          describing its own feelings. Nobody arriving to find a flat reads
          a mission statement, and the four points it made are made better
          by the product further down actually doing them.

          A FACTS BAND, A NUMBERS BAND AND A TRUST STRIP. Three separate
          rows of small claims, two of them adjacent. "36 + FCT" is
          coverage we have zero listings in. The trust strip carried five
          cells of adjective, "Trusted and secure", "Smarter experiences",
          "Built with love", which is the writing you produce when there
          is nothing specific to say.

          A VILLA SHOWCASE, A COVERAGE MAP, AN ASSISTANT SHOWCASE AND A
          MOOD ROW. Four full sections built around four commissioned
          renders. Beautiful, and every one of them a picture of something
          rather than the thing. The renders live on inside the product
          where they illustrate a real screen.

          A TWELVE ITEM FAQ. It said "Card payments switch on at public
          launch. Until then no money changes hands" on a platform that
          has taken a payment, promised NDPA compliance as a settled fact,
          claimed every agent submits proof they own the property when
          that ladder has never been walked, and asked "What happens after
          I book?" in the language of a hotel stay, answering with check-in
          details and a host. All of it belongs on /help, corrected, where
          somebody goes looking for it.

          What is left is one section per question a visitor actually
          arrives with. What is on here. How does it work. Why should I
          trust it. What does it look like. What if I am the one with the
          property. What do other people say. Shall I start.
        */}

        {/* 1. What is actually on the platform. Renders nothing while there
              is nothing, rather than a shelf of placeholders. */}
        <FeaturedCarousel locale={locale} />

        {/* 2. How it works, in three steps. */}
        <HowItWorks t={t} />

        {/* 3. Why this is safer than the alternative, which for most people
              is a WhatsApp group and a bank transfer to a stranger. */}
        <WhyRentMe t={t} />

        {/* 4. What it actually looks like. A visitor could previously reach
              the sign-up button without ever seeing a screen of the thing
              they were signing up to. */}
        <section className="nf-shell grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
          <Reveal>
            <p className="nf-overline">The app</p>
            <h2 className="nf-h2 mt-2 max-w-[16ch]">Everything in one place, on your phone</h2>
            <p className="mt-3 max-w-[48ch] text-[1rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Search, inspect, message and pay from the same screen. No calls,
              no agent runaround, no transfer to an account you were sent in a
              chat.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <ProductFrame t={t} locale={locale} />
          </Reveal>
        </section>

        {/* 5. The other half of a marketplace. Somebody has to have the
              property. */}
        <AgentsBand t={t} />

        {/* 6. Other people answering the case the platform just made for
              itself. Renders null until a real review exists, so the page
              has no testimonials section rather than an invented one. */}
        <VoicesBand locale={locale} />

        {/* 7. One way in. */}
        <section className="nf-shell py-16 sm:py-20">
          <Reveal>
            <div className="nf-card nf-card--live relative overflow-hidden p-8 text-center sm:p-12 md:p-16">
              <div className="nf-aurora opacity-60" aria-hidden="true" />
              <div className="relative z-10">
                <h2 className="nf-h1 mx-auto max-w-[20ch]">{t.landing.cta.title}</h2>
                <p className="mx-auto mt-4 max-w-[52ch] text-[1rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {t.landing.cta.subtitle}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <ButtonLink href="/sign-up" variant="primary" size="lg">
                    {t.landing.cta.action}
                  </ButtonLink>
                  {/* Back to browsing, which is now a real offer. This pointed
                      at /docs because the product used to be behind a session
                      and "browse without an account" was refused by the very
                      next click. Browsing is open, so the honest invitation is
                      the one we could not make before. */}
                  <ButtonLink href="/search" variant="secondary" size="lg">
                    Browse properties
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
