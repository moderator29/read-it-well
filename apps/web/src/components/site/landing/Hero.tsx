import Image from "next/image";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { DepthWords, wordCount } from "@/components/motion/DepthWords";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { photo } from "@/lib/site/photos";
import { catalogueIsOpen, type Door } from "./doors";
import { HeroSurface } from "./HeroSurface";
import { heroCopy } from "./hero-copy";
import { EXAMPLE_MOVE_IN } from "./example-move-in";
import "@/app/css/site.css";

/**
 * THE HERO, ON THE GOVERNING COMPOSITION (GOVERNING-landing-desktop-hero.png
 * and -fullpage.png; Session 3, 6 October 2026).
 *
 * The governing frames are a navy night with a lit villa on the water, the
 * copy on the left over the dark sky, a floating card to the right and the
 * search capsule laid across the pool. That is what this draws, in Vallo's
 * own words and with nothing the frames invented: no "10K+", no partner
 * hotel dressed as a listing, no Verified mark on an example.
 *
 * A NIGHT ISLAND IN BOTH THEMES (`data-theme="dark"` on the section). The
 * photograph is night, and the page's long-standing rule is that what is
 * built on night photography keeps the night as a local island while every
 * other band follows the reader's theme. In light the header capsule stays
 * white over it, the way the frames' bar sits over the sky.
 *
 * THREE LAYERS, ONE RATIO (MOTION_SYSTEM section 1, principle 4; section 5,
 * "the landing page"). The photograph is the back layer and moves at 0.6x
 * the page as it scrolls away; the copy, the card and the search are the
 * front layer at 1.0x. CSS scroll timeline only (landing.css, "the hero"):
 * no script, transform only, and none at all under reduced motion, Calm,
 * Off or data saver, or where the browser has no scroll timelines.
 *
 * A PHONE NEVER GETS A PHOTOGRAPH BEHIND TEXT (the founder's ruling, kept).
 * Under 64rem the photograph is the lower part of the stage only, fading in
 * behind the search capsule so the capsule sits on the pool as the frames
 * draw it; the headline and the sub stay on the canvas above it.
 *
 * THE HEADLINE IS THE SLOGAN AND THE SUB IS THE EXPLANATION (founder
 * directive D1). Unchanged from B3's pass: `heroCopy` sets the slogan on two
 * lines with the second in the brand ramp, and the positioning line is not on
 * this screen; it titles the platform band further down, where it belongs.
 *
 * THE FLOATING CARD IS AN EXAMPLE AND SAYS SO. It is the move-in band's
 * example flat (`example-move-in.ts`), drawn with the product's own `Amount`
 * so its figure counts up as it arrives, the move-in total leading and the
 * rent beneath (the product's own order). It carries the Example mark and no
 * trust signal at all. From 64rem only: on a phone it would push the search
 * below the fold for a picture of a card.
 *
 * ONE GLOW. The primary action carries it (north star 5A). The lit
 * headline's drop-shadow bloom is gone, which also takes the most expensive
 * paint off the first frame.
 *
 * THE ONE ACTION IS HONEST ABOUT WHERE IT GOES (UIUX item 12). While the
 * catalogue is closed to strangers the primary reads "Get started" and the
 * line under it says what the account is for; when the founder's switch
 * opens the catalogue it is "Explore properties". The secondary is the Stays
 * side, through the same honest door.
 *
 * THE PLASMA PASS (P7, 7 October 2026; PREMIUM-STANDARD.md, the governing
 * level). The frames stay; the stage got quieter and the content lit:
 *
 *   - the eyebrow capsule became the frames' mono breadcrumb, and a trust
 *     promise sat under the explanation (both since removed, below);
 *   - the one action is the white capsule with its reflection on the floor
 *     (the Plasma "Next"), the secondary a quiet door beside it;
 *   - the floating 3D objects and the three facts left the hero: Plasma
 *     holds one idea and one action per screen, and the facts are told
 *     properly in the deal story below, where the objects now illustrate
 *     the five steps and each one explains something.
 *
 * WHAT LEFT THE HERO (the founder, 7 October 2026, on a phone). The mono
 * breadcrumb of the four markets, which the markets band below already says,
 * and the "Vallo never holds your money" promise line over the actions. The
 * money story is told in the docs instead (/docs/money-and-the-guarantee,
 * "How money moves on Vallo"), in full sentences per route; the FAQ and the
 * deal story still answer it on this page.
 *
 * The intro (item 24, landing-rooms.css): the words
 * arrive 45ms apart, the sub, the actions and the facts rise 12px from 300ms,
 * the search at 420ms, and the card lands last; under 900ms in all, once per
 * visit.
 */
export function Hero({ t, locale, door }: { t: Dictionary; locale: Locale; door: Door }) {
  const face = t.landing.face;
  const hero = face.hero;
  const copy = heroCopy(t);
  const [lead, accent] = copy.lines;
  const open = catalogueIsOpen(door);
  const u = t.landingRooms.stack.ui;

  return (
    /* `data-startup-pin`: the intro is timed from the startup's door, and the
       startup pins that time here before it lets go (landing-3d.css, "the
       hero's own hold"), so nothing waiting jumps to its end. */
    <section
      className="nf-landing-hero nf-landing-hero--plasma"
      data-chapter="hero"
      data-theme="dark"
      data-startup-pin=""
      aria-labelledby="nf-landing-title"
    >
      {/* The back layer: the night photograph, at 0.6x. Decorative; the
          frames' villa is a picture of a place, not a listing. */}
      <div className="nf-hero-photo" aria-hidden="true">
        <Image
          src={photo("villa-pool-skyline-02")}
          alt=""
          fill
          preload
          sizes="100vw"
          className="nf-hero-photo__img"
        />
      </div>
      <div className="nf-shell nf-landing-hero-body">
        <div className="nf-hero-copy">
          {/* THE DEPTH ARRIVAL. Each word comes forward, 45ms after the word
              before it, once per visit. The words are spans inside the line,
              so the heading still reads as written. */}
          <h1 id="nf-landing-title" className="nf-landing-title nf-depth">
            <span className="nf-depth-line">
              <DepthWords text={lead} />
            </span>
            {accent ? (
              <span className="nf-depth-line nf-depth-line--accent">
                <DepthWords text={accent} start={wordCount(lead)} />
              </span>
            ) : null}
          </h1>
          <p className="nf-rise nf-rise-3 nf-landing-sub">{copy.subtitle}</p>
          <div className="nf-rise nf-rise-4 nf-hero-action">
            <div className="nf-hero-action__row">
              {/* The one action: the white capsule with its reflection. */}
              <ButtonLink
                href={door("/search")}
                variant="primary"
                size="lg"
                trailingIcon="arrow-right"
                className="nf-pl-capsule"
              >
                {open ? hero.explore : hero.getStarted}
              </ButtonLink>
              <ButtonLink href={door("/stays")} variant="quiet" size="lg" className="nf-pl-quiet">
                {t.landingRooms.worlds.stays.cta}
              </ButtonLink>
            </div>
            {!open && <p className="nf-hero-join">{hero.joinLine}</p>}
          </div>
        </div>

        {/* The front layer's card: the example flat, from 64rem. */}
        <aside className="nf-hero-card nf-island" aria-label={u.example}>
          <div className="nf-hero-card__photo">
            <Image src={photo("villa-exterior-gate")} alt="" fill sizes="16rem" />
            <span className="nf-badge nf-badge--example nf-hero-card__mark">
              <UiIcon name="info" size={12} aria-hidden />
              {u.example}
            </span>
          </div>
          <div className="nf-hero-card__body">
            <p className="nf-hero-card__title">{u.listingTitle}</p>
            <p className="nf-hero-card__place">
              <UiIcon name="location" size={12} aria-hidden />
              {u.place}
            </p>
            <p className="nf-hero-card__label">{u.moveIn}</p>
            <p className="nf-hero-card__figure">
              <Amount minorUnits={EXAMPLE_MOVE_IN.total} locale={locale} currency="NGN" className="nf-numeric" count />
            </p>
            <p className="nf-hero-card__rent">
              {u.rent}{" "}
              <Amount minorUnits={EXAMPLE_MOVE_IN.rent} locale={locale} currency="NGN" className="nf-numeric" />
              <span>{u.perYear}</span>
            </p>
          </div>
        </aside>

        <div className="nf-landing-pill-wrap nf-depth-last">
          {/* A8 folded in: the search and the move-in total, as two tabs on
              one surface (HeroSurface.tsx). */}
          <HeroSurface search={face.search} moveIn={t.publicDoors.moveIn} />
        </div>
      </div>
    </section>
  );
}
