import Link from "next/link";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
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
   * THE OBJECTS CAME OFF THIS ROW AND STAYED ON THE PRODUCT'S.
   *
   * The five drawn here were the signature 3D family: blue and white, lit,
   * modelled, warm. They are the best artwork on the platform and they are the
   * wrong instrument at the top of a marketing page. That page is read by
   * somebody deciding whether this is a real company before they will send a
   * year's rent through it, and a row of rendered toys is the grammar of an app
   * store listing rather than of a business. The identical five links inside
   * the product, on `/home`, keep the objects, because by then the question has
   * changed from "is this real" to "is this mine".
   *
   * So: the stroked vector set, one weight, currentColor, no plate behind any
   * of them. Every glyph still depicts the thing it stands for.
   */
  const categories: { icon: UiIconName; label: string; href: string }[] = [
    { icon: "key", label: t.nav.rent, href: "/search?intent=rent" },
    { icon: "house", label: t.nav.buy, href: "/search?intent=sale" },
    { icon: "building-hotel", label: t.nav.shortlets, href: "/search?type=shortlet" },
    { icon: "map", label: t.nav.land, href: "/search?type=land" },
    { icon: "building-apartment", label: t.nav.commercial, href: "/search?type=office" },
  ];



  return (
    <>

      <SiteHeader t={t} locale={locale} />

      <main id="main">
        {/* ----------------------------------------------------------- hero */}
        <section className="relative overflow-hidden pb-section pt-section-tight">
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

              <p className="nf-lede nf-rise nf-rise-4 mt-heading max-w-[44ch]">
                {t.landing.hero.subtitle}
              </p>

              {/*
                NO SEARCH BAR HERE.

                There was one, and it looked right: a field under the headline,
                the same control the product uses inside. It came out because a
                marketing page and a product are not the same job.

                A search field is a promise of an answer, and a stranger who
                types into one on a landing page expects results, not a page
                transition into an app they have not entered. It also competed
                with the five objects directly below, which ARE the answer to
                the same question and give a visitor something to look at
                rather than something to fill in. Asking somebody to compose a
                query before they have seen a single property is asking them to
                know what they want before we have shown them what there is.

                The real search bar lives one tap away, at the top of the
                product home, where a result set is what happens next.
              */}
              {/*
                ONE PRIMARY, ONE QUIET SECONDARY.

                These were two filled buttons side by side, "Browse properties"
                and "Create account", both at size lg. Two primaries is no
                primary: the reader has to work out which one the page meant,
                and a page that cannot say what it wants somebody to do next is
                the definition of a page that has not been designed.

                Browsing wins the button because it is the thing a stranger can
                actually do right now, and it is free. The account is the
                consequence of liking what they found, and it gets asked for
                properly once, at the foot of the page, where it is a filled
                button and browsing is the quiet link. Same pair, inverted, in
                the two places where each is the honest next step.
              */}
              <div className="nf-rise nf-rise-4 mt-block flex flex-wrap items-center gap-x-block gap-y-group">
                <ButtonLink href="/search" variant="primary" size="lg">
                  Browse properties
                </ButtonLink>
                <Link href="/sign-up" prefetch className="nf-link-quiet nf-body relative z-10">
                  {t.landing.cta.action}
                  <UiIcon name="arrow-right" size={16} />
                </Link>
              </div>

              {/*
                The cities, as a line of text rather than five glowing pills.

                `nf-chip` is a filter control: 44px tall, a brand rim and a blue
                bloom around each one. Five of those directly under the primary
                button put five more lit objects in the loudest part of the page
                and left the eye with no idea which thing to press. As a quiet
                row of links with a label in front of them, they read as what
                they are, which is a shortcut for somebody who already knows
                where they want to live.
              */}
              <div className="nf-rise nf-rise-5 mt-block flex flex-wrap items-baseline gap-x-heading gap-y-inline">
                <span className="nf-caption">Popular right now</span>
                <ul className="flex flex-wrap items-baseline gap-x-heading gap-y-inline">
                  {CITIES.map((city) => (
                    <li key={city}>
                      <Link
                        href={gatedHref(`/search?q=${encodeURIComponent(city)}`)}
                        prefetch
                        className="nf-link-quiet nf-tap nf-body-sm relative z-10"
                      >
                        {city}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- category row */}
          {/*
           * Five things you can do, drawn as five glyphs.
           *
           * NO CONTAINER, and that part is unchanged and non-negotiable. No
           * card, no tile, no chip, no ring, no plate. A box around a glyph
           * adds a second edge competing with the edge the glyph already has,
           * and five of them turn a considered row into a toolbar.
           *
           * WHAT CHANGED IS THE INSTRUMENT. These were 88px 3D renders from the
           * signature family; see the note on `categories` above for why that
           * family belongs one screen further in. A stroked glyph carries the
           * row on drawing rather than on rendering, so it wants a different
           * size: 40px, the top of the icon scale, at a constant 1.5px stroke.
           * Bigger than that and a 1.5px line inside a 64px box reads as a wire
           * frame rather than as an icon.
           *
           * A hairline rule above the row, inset to the shell, separates the
           * navigation from the pitch without a container doing it. It is the
           * only line on the hero.
           */}
          <nav
            aria-label="Browse by category"
            className="nf-shell relative z-10 mt-section"
          >
            <div
              aria-hidden="true"
              className="mb-block h-px w-full bg-[var(--nf-divider)]"
            />
            <ul className="grid grid-cols-3 gap-x-row gap-y-heading sm:grid-cols-5 sm:gap-x-heading">
              {categories.map((c, i) => (
                <li
                  key={c.label}
                  className="nf-rise-seq"
                  style={{ "--nf-rise-i": i + 4 } as React.CSSProperties}
                >
                  <Link href={c.href} prefetch className="nf-cat">
                    <span className="nf-cat__glyph h-10 w-10">
                      <UiIcon name={c.icon} size={40} />
                    </span>
                    <span className="nf-cat__label">{c.label}</span>
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
              the sign-up button without ever seeing a screen of the thing they
              were signing up to.

              The heading and the copy used to live here, with the frame dropped
              into the second column. They moved INTO ProductFrame, because it
              is the only thing that knows whether there is a product to show:
              with an empty catalogue the frame returned null and this page went
              on drawing a heading beside half a screen of nothing. */}
        <ProductFrame t={t} locale={locale} />

        {/* 5. The other half of a marketplace. Somebody has to have the
              property. */}
        <AgentsBand t={t} />

        {/* 6. Other people answering the case the platform just made for
              itself. Renders null until a real review exists, so the page
              has no testimonials section rather than an invented one. */}
        <VoicesBand locale={locale} />

        {/* 7. One way in. */}
        <section className="nf-shell py-section">
          <Reveal>
            <div className="nf-card nf-card--live relative overflow-hidden p-card-lg text-center">
              <div className="nf-aurora opacity-60" aria-hidden="true" />
              <div className="relative z-10">
                <h2 className="nf-h1 mx-auto max-w-[20ch]">{t.landing.cta.title}</h2>
                <p className="nf-lede mx-auto mt-heading max-w-[50ch]">
                  {t.landing.cta.subtitle}
                </p>
                {/* The pair from the hero, inverted. Here the account IS the
                    next step, so it takes the button, and browsing becomes the
                    quiet way out for somebody not ready. This used to be two
                    filled buttons, which asked the reader to choose between two
                    equally weighted invitations at the exact moment the page
                    was meant to be making one. */}
                <div className="mt-block flex flex-wrap items-center justify-center gap-x-block gap-y-group">
                  <ButtonLink href="/sign-up" variant="primary" size="lg">
                    {t.landing.cta.action}
                  </ButtonLink>
                  <Link href="/search" prefetch className="nf-link-quiet nf-body">
                    Browse properties
                    <UiIcon name="arrow-right" size={16} />
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
