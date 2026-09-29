import Image from "next/image";
import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { DepthWords, wordCount } from "@/components/motion/DepthWords";
import { photo } from "@/lib/site/photos";
import { SearchPill } from "./SearchPill";

/**
 * The hero: the headline, one line of sub, one primary action and the
 * search, on the dusk villa plate. Nothing else competes (the founder's
 * "so clean" pass, 29 September).
 *
 * WHAT LEFT, AND WHERE IT WENT. The breadcrumb, the second button (Explore
 * Stays), the four city capsules, the floating listing card and its pager,
 * the store badges and the moving aurora all sat in this one screen beside
 * the headline. Each had a better home further down: the Stays door is the
 * search's own Stay segment and the two worlds band, the cities are the
 * map's chips, real listings are the two worlds band, and the badges are the
 * app band. The hero now asks for one thing and offers the search for the
 * reader who already knows what they want.
 *
 * THE HEADLINE AND THE PILL BELOW IT SAY THE SAME THREE WORDS, AND THAT IS
 * NOT A COINCIDENCE TO BE TIDIED AWAY. "Rent, buy or stay. Without the
 * runaround." is the founder's approved line, and it names the pill's Buy,
 * Rent and Stay segments on purpose: the headline teaches the control and the
 * control proves the headline. IF ONE CHANGES, THE OTHER CHANGES IN THE SAME
 * COMMIT. The order lives in `segments.ts`, the words in `landing.face` in
 * `packages/i18n`, and `headline-coupling.test.ts` fails the build if the two
 * ever drift apart.
 *
 * UNDER 64REM THE PLATE IS A BAND behind the top of the copy, which sits on
 * the canvas (a phone never gets a full-bleed photograph behind text, the
 * founder's ruling); from 64rem it covers the hero. One image element does
 * both jobs (landing.css). From 64rem the photograph also drifts a few per
 * cent as the page scrolls away (a scroll timeline, off under reduced motion,
 * Calm and data saver).
 *
 * A NIGHT ISLAND IN BOTH THEMES: the hero is night photography and lit type,
 * so it carries its own `data-theme="dark"` while the rest of the landing
 * follows the reader's theme.
 */
export function Hero({ t }: { t: Dictionary }) {
  const face = t.landing.face;

  return (
    <section className="nf-landing-hero" data-chapter="hero" data-theme="dark" aria-labelledby="nf-landing-title">
      <div className="nf-shell nf-landing-hero-body">
        <div className="nf-landing-hero-copy flex flex-col gap-heading">
          {/* The shared scrim (utilities.css): white type on the villa's lit
              glazing is unreadable without it. */}
          <div className="nf-photo-scrim" aria-hidden="true" />
          {/* THE DEPTH ARRIVAL (Track M). Each word comes forward from behind
              the glass, 70ms after the word before it, once per visit
              (threshold.css, landing-rooms.css). The words are spans inside
              the line, so the heading still reads as written. */}
          <h1 id="nf-landing-title" className="nf-landing-title nf-depth">
            <span className="nf-depth-line">
              <DepthWords text={face.hero.title1} />
            </span>
            <span className="nf-depth-line nf-depth-line--accent">
              <DepthWords text={face.hero.title2} start={wordCount(face.hero.title1)} />
            </span>
          </h1>
          <p className="nf-rise nf-rise-3 nf-landing-sub">{face.hero.subtitle}</p>
          <div className="nf-rise nf-rise-4">
            <ButtonLink href="/search" variant="primary" size="md" trailingIcon="arrow-right">
              {face.hero.explore}
            </ButtonLink>
          </div>
        </div>

        {/* The search rises last, once the headline has landed. From 64rem
            the grid gives it its own row under the copy. */}
        <div className="nf-landing-pill-wrap nf-depth-last">
          <SearchPill labels={face.search} />
        </div>

        <div className="nf-landing-hero-plate" aria-hidden="true">
          <Image src={photo("villa-pool-skyline-02")} alt="" fill priority sizes="(max-width: 64rem) 84vw, 100vw" />
        </div>
      </div>
    </section>
  );
}
