import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { DepthWords, wordCount } from "@/components/motion/DepthWords";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { EdgeLap } from "@/components/site/EdgeLap";
import { catalogueIsOpen, type Door } from "./doors";
import { HeroSurface } from "./HeroSurface";

/**
 * The hero, to the founder's reference 39 (29 September 2026): a clean
 * paper stage with faint grid lines, a centred eyebrow capsule carrying one
 * true line and the edge lap, the big tight headline with its last phrase in
 * the brand blue, one line of sub, one action, the search, and a row of
 * three facts. No photograph: the hero is the platform's own ground in both
 * themes (the warm paper in light, the night at night), and the photographs
 * live further down where they show places.
 *
 * THE HEADLINE AND THE SEARCH SAY THE SAME THREE WORDS, AND THAT IS NOT A
 * COINCIDENCE TO BE TIDIED AWAY. "Rent, buy or stay. Without the
 * runaround." names the search's Buy, Rent and Stay segments on purpose: the
 * headline teaches the control and the control proves the headline. IF ONE
 * CHANGES, THE OTHER CHANGES IN THE SAME COMMIT (`segments.ts`,
 * `headline-coupling.test.ts`).
 *
 * THE ONE ACTION IS HONEST ABOUT WHERE IT GOES (UIUX item 12). While the
 * catalogue is closed to strangers, `/search` answers a signed-out visitor
 * with a sign-in wall, so the button reads "Get started", goes to the
 * sign-up door carrying `/search`, and the line under it says what the
 * account is for. When the founder's switch opens the catalogue, the button
 * is "Explore properties" and goes straight there.
 *
 * THE FACTS are the money constants' meaning in three words each
 * (`landing.face.hero.facts`, pinned to `lib/money/copy.ts` by
 * `hero-facts.test.ts`). No figures.
 *
 * The intro (item 24): the eyebrow rises first, the words arrive 45ms apart
 * out of a 6px blur, the sub, the action and the facts rise 12px from 300ms,
 * the search at 420ms; under 900ms in all, once per visit (threshold.css,
 * landing-rooms.css).
 */
export function Hero({ t, door }: { t: Dictionary; door: Door }) {
  const face = t.landing.face;
  const hero = face.hero;
  const open = catalogueIsOpen(door);
  const facts = [hero.facts.inspect, hero.facts.moveIn, hero.facts.agree];

  return (
    <section className="nf-landing-hero" data-chapter="hero" aria-labelledby="nf-landing-title">
      <div className="nf-hero-grid" aria-hidden="true" />
      <div className="nf-shell nf-landing-hero-body">
        <EdgeLap as="p" className="nf-hero-eyebrow nf-rise nf-rise-1">
          <UiIcon name="sparkle" size={16} aria-hidden />
          <span>{hero.eyebrow}</span>
        </EdgeLap>
        {/* THE DEPTH ARRIVAL. Each word comes forward, 45ms after the word
            before it, once per visit. The words are spans inside the line,
            so the heading still reads as written. */}
        <h1 id="nf-landing-title" className="nf-landing-title nf-depth">
          <span className="nf-depth-line">
            <DepthWords text={hero.title1} />
          </span>
          <span className="nf-depth-line nf-depth-line--accent">
            <DepthWords text={hero.title2} start={wordCount(hero.title1)} />
          </span>
        </h1>
        <p className="nf-rise nf-rise-3 nf-landing-sub">{hero.subtitle}</p>
        <div className="nf-rise nf-rise-4 nf-hero-action">
          <ButtonLink href={door("/search")} variant="primary" size="lg" trailingIcon="arrow-right">
            {open ? hero.explore : hero.getStarted}
          </ButtonLink>
          {!open && <p className="nf-hero-join">{hero.joinLine}</p>}
        </div>

        <div className="nf-landing-pill-wrap nf-depth-last">
          {/* A8 folded in: the search and the move-in total, as two tabs on
              one surface (HeroSurface.tsx). */}
          <HeroSurface search={face.search} moveIn={t.publicDoors.moveIn} />
        </div>

        <ul className="nf-hero-facts nf-rise nf-rise-4">
          {facts.map((fact) => (
            <li key={fact}>
              <UiIcon name="circle-check" size={16} aria-hidden />
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
