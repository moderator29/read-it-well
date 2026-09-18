import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MiniListing } from "@/lib/site/listing-card";
import { photo } from "@/lib/site/photos";
import { HeroListingCard } from "./HeroListingCard";
import { SearchPill } from "./SearchPill";

/**
 * The hero, to GOVERNING-landing-desktop-hero.png.
 *
 * Full-bleed dusk villa plate; the overline breadcrumb; "Real Estate" white
 * over "reimagined." in the brand ramp; the sub-line; Explore Properties
 * primary and Explore Stays glass; the four city capsules linking to real
 * searches; the floating listing card on the right of the photograph; and
 * the search pill hanging off the bottom edge.
 *
 * UNDER 64REM THE SAME ELEMENTS STACK, AND THE PLATE BECOMES A BAND. The
 * founder's ruling: a full-viewport crop of the villa behind the headline
 * reads as a mistake beside the desktop. So on a phone the copy sits on
 * the dark canvas with the aurora behind it, the villa is a fitted rounded
 * band inside the gutters with the whole house in frame, the card overlaps
 * the band's foot as it does on desktop, and the pill sits beneath. One
 * image element does both jobs: absolute over the whole hero from 64rem,
 * a block in the flow below it (landing.css).
 *
 * The listings on the card arrive from the page (the same `recommended`
 * read the featured rail used to make, five of them, already mapped to the
 * small shape the client pager needs), so the preview harness can hand the
 * hero fixtures where this sandbox cannot reach the catalogue. Nothing here
 * is ambient motion: the one animation this viewport is allowed is the
 * entrance rise on the copy.
 */
export function Hero({
  t,
  locale,
  cards,
}: {
  t: Dictionary;
  locale: Locale;
  cards: MiniListing[];
}) {
  const face = t.landing.face;

  return (
    <section className="nf-landing-hero" aria-labelledby="nf-landing-title">
      {/* The aurora only shows where the photograph is a band, under 64rem. */}
      <div className="nf-aurora nf-landing-hero-aurora" aria-hidden="true" />

      <div className="nf-shell nf-landing-hero-body">
        <div className="nf-landing-hero-copy flex flex-col gap-heading">
          <ol className="nf-rise nf-landing-crumbs" aria-label={face.hero.crumbs.join(" / ")}>
            {face.hero.crumbs.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
          <h1 id="nf-landing-title" className="nf-landing-title">
            <span className="nf-rise">{face.hero.title1}</span>
            <span className="nf-rise nf-rise-2 nf-gradient-text">{face.hero.title2}</span>
          </h1>
          <p className="nf-rise nf-rise-3 nf-landing-sub">{face.hero.subtitle}</p>
          <div className="nf-rise nf-rise-4 flex flex-wrap items-center gap-row">
            <ButtonLink href="/search" variant="primary" size="md" trailingIcon="arrow-right">
              {face.hero.explore}
            </ButtonLink>
            <ButtonLink href="/stays" variant="secondary" size="md">
              {face.hero.stays}
            </ButtonLink>
          </div>
          <ul className="nf-rise nf-rise-5 flex flex-wrap gap-inline">
            {face.hero.cities.map((city) => (
              <li key={city}>
                <Link
                  href={`/search?q=${encodeURIComponent(city)}`}
                  prefetch={false}
                  className="nf-landing-city"
                >
                  <UiIcon name="location" size={14} aria-hidden />
                  {city}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="nf-landing-hero-plate" aria-hidden="true">
          <Image
            src={photo("villa-pool-skyline-02")}
            alt=""
            fill
            priority
            sizes="(max-width: 64rem) 100vw, 60vw"
          />
        </div>

        <HeroListingCard cards={cards} locale={locale} labels={face.card} />
      </div>

      <div className="nf-shell">
        <div className="nf-landing-pill-wrap">
          <SearchPill labels={face.search} />
        </div>
      </div>
    </section>
  );
}
