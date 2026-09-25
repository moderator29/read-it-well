import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { DepthWords, wordCount } from "@/components/motion/DepthWords";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MiniListing } from "@/lib/site/listing-card";
import { photo } from "@/lib/site/photos";
import { HeroListingCard } from "./HeroListingCard";
import { SearchPill } from "./SearchPill";
import { HeroAurora } from "./HeroAurora";
import { StoreBadges } from "./StoreBadges";
import type { StoreBadge } from "./store-badges";
import { Sweep } from "./Sweep";

/**
 * The hero, to GOVERNING-landing-desktop-hero.png.
 *
 * Full-bleed dusk villa plate; the overline breadcrumb; the headline, white
 * over the brand ramp; the sub-line; Explore Properties primary and Explore
 * Stays glass; the four city capsules linking to real searches; the floating
 * listing card on the right of the photograph; and the search pill hanging
 * off the bottom edge.
 *
 * THE HEADLINE AND THE PILL BELOW IT SAY THE SAME THREE WORDS, AND THAT IS
 * NOT A COINCIDENCE TO BE TIDIED AWAY. "Rent, buy or stay. Without the
 * runaround." is the founder's approved line, and it names the pill's Buy,
 * Rent and Stay segments on purpose: the headline teaches the control and the
 * control proves the headline. IF ONE CHANGES, THE OTHER CHANGES IN THE SAME
 * COMMIT. The order lives in `segments.ts`, the words in `landing.face` in
 * `packages/i18n`, and `headline-coupling.test.ts` fails the build if the two
 * ever drift apart. The line this replaced was "Real Estate / reimagined.",
 * which is the old positioning.
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
 * A NIGHT ISLAND IN BOTH THEMES: the hero is night photography and lit
 * type, so it carries its own `data-theme="dark"` while the rest of the
 * landing follows the reader's theme.
 *
 * The listings on the card arrive from the page (the same `recommended`
 * read the featured rail used to make, five of them, already mapped to the
 * small shape the client pager needs), so the preview harness can hand the
 * hero fixtures where this sandbox cannot reach the catalogue. Nothing here
 * is ambient motion except the aurora, which is the one loop this viewport
 * is allowed and which pauses whenever the hero is off screen.
 */
export function Hero({
  t,
  locale,
  cards,
  badges = [],
}: {
  t: Dictionary;
  locale: Locale;
  cards: MiniListing[];
  /** From `storeBadges()`: empty until a store address exists, and always
      empty inside a native shell. */
  badges?: StoreBadge[];
}) {
  const face = t.landing.face;

  return (
    <section className="nf-landing-hero" data-chapter="hero" data-theme="dark" aria-labelledby="nf-landing-title">
      {/* The moving light: a 28 second drift in the brand hues, paused off
          screen and in a background tab (HeroAurora.tsx). */}
      <HeroAurora />

      <div className="nf-shell nf-landing-hero-body">
        <div className="nf-landing-hero-copy flex flex-col gap-heading">
          {/* The shared scrim (utilities.css), not a landing-local gradient:
              white type on the villa's lit glazing is unreadable without it,
              and the same class does the same job on the category tiles and
              on any other surface that sets a label on photography. */}
          <div className="nf-photo-scrim" aria-hidden="true" />
          {/* Each crumb is one unbreakable word and the separator belongs to
              the crumb before it (R1 finding A7): as a leading `::before` on
              the following item, a wrap at 390 put a bare slash at the head
              of the second line, which is a typesetting error on the first
              text of the product's first screen. Under 26.75rem the fourth
              crumb is hidden rather than shortened, because the crumbs are
              content truth and abbreviating one would be a different claim. */}
          <ol className="nf-rise nf-landing-crumbs" aria-label={face.hero.crumbs.join(" / ")}>
            {face.hero.crumbs.map((c, i) => (
              <li key={c} className={i === face.hero.crumbs.length - 1 ? "nf-landing-crumb--last" : undefined}>
                {c}
              </li>
            ))}
          </ol>
          {/* THE DEPTH ARRIVAL (Track M). Each word comes forward from behind
              the glass, blurred, enlarged and transparent, then sharp and
              settled, 70ms after the word before it: the shared DepthWords
              (threshold.css), which already waits for the app-open door. On
              the landing it plays once per visit and drops the blur on slow
              devices (landing-rooms.css). The words are spans inside the
              line, so the heading still reads as written. */}
          <h1 id="nf-landing-title" className="nf-landing-title nf-depth">
            <span className="nf-depth-line">
              <DepthWords text={face.hero.title1} />
            </span>
            <span className="nf-depth-line nf-depth-line--accent">
              <DepthWords text={face.hero.title2} start={wordCount(face.hero.title1)} />
            </span>
          </h1>
          <p className="nf-rise nf-rise-3 nf-landing-sub">{face.hero.subtitle}</p>
          <div className="nf-rise nf-rise-4 flex flex-wrap items-center gap-row">
            <ButtonLink href="/search" variant="primary" size="md" trailingIcon="arrow-right" className="nf-magnetic">
              <Sweep />
              {face.hero.explore}
            </ButtonLink>
            <ButtonLink href="/stays" variant="secondary" size="md">
              {face.hero.stays}
            </ButtonLink>
          </div>
          {/* The render puts the pin on the LABEL and leaves the pills plain,
              with the first city filled: it is the city the search opens on,
              not a selected state, so it carries no aria-current. */}
          <div className="nf-rise nf-rise-5 nf-landing-cities">
            <span className="nf-landing-cities-label">
              <UiIcon name="location" size={14} aria-hidden />
              {face.hero.citiesLabel}
            </span>
            <ul className="flex flex-wrap gap-inline">
              {face.hero.cities.map((city, i) => (
                <li key={city}>
                  <Link
                    href={`/search?q=${encodeURIComponent(city)}`}
                    prefetch={false}
                    className={`nf-landing-city${i === 0 ? " nf-landing-city--lead" : ""}`}
                  >
                    {city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="nf-landing-hero-plate" aria-hidden="true">
          <Image
            src={photo("villa-pool-skyline-02")}
            alt=""
            fill
            priority
            sizes="(max-width: 64rem) 78vw, 60vw"
          />
        </div>

        <HeroListingCard cards={cards} locale={locale} labels={face.card} />
      </div>

      <div className="nf-shell">
        {/* The search rises last, once the headline has landed, and the store
            badges with it (only where a real store address exists). */}
        <div className="nf-landing-pill-wrap nf-depth-last">
          <SearchPill labels={face.search} />
        </div>
        <StoreBadges badges={badges} labels={t.landingRooms.badges} className="nf-depth-last nf-landing-hero-badges" />
      </div>
    </section>
  );
}

