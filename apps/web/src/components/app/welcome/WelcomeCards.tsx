"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * The way in. Three full-bleed slides.
 *
 * ---------------------------------------------------------------------------
 * WHAT CHANGED AND WHY IT MATTERS MORE THAN IT SOUNDS.
 *
 * These were three bordered `nf-card` boxes floating in the middle of a padded
 * page, each with an 80px rendered 3D object on it - a magnifying glass over a
 * house, a shield, a speech bubble. Clip art. The first thing a new person ever
 * saw of a property marketplace contained no property.
 *
 * They are FULL BLEED now: each slide fills the viewport, leads with a real
 * photograph, and the words sit on the image under a scrim. The difference is
 * not decoration. An onboarding slide has about two seconds to say what kind of
 * thing this app is, and a photograph of a Lagos street does that before the
 * headline is read; an illustrated shield says "a company made this".
 *
 * DARK FIRST, and here that is literal rather than a preference. The scrim over
 * the photograph is the media scrim, which is dark in BOTH themes, because what
 * is underneath is a photograph at noon as much as at midnight - so these
 * slides look the way they were designed in either theme instead of turning
 * into black text on a bright picture in daylight.
 *
 * WHAT DID NOT CHANGE, because it was already right: the track is a native
 * scroll container with snapping, so the thumb drag is the platform's own and
 * the momentum is the platform's own. Arrow keys work because it is a scroll
 * container, every slide is reachable by Tab because they are in the document,
 * and the dots are real buttons that say which slide they go to. A hand-rolled
 * carousel with pointer maths is where the swipe stops feeling native and the
 * keyboard stops working.
 *
 * SKIP IS ON SCREEN FROM THE FIRST FRAME and never moves. Somebody here to do a
 * thing rather than read about it should never be paged through three slides.
 */

type Slide = {
  /**
   * A supplied photograph, when one exists. **This is the slot.**
   *
   * It held three RentMe-era renders, 6.3MB between them, on the first screen
   * a new member ever sees. Null paints the designed ground below instead,
   * which is a finished state rather than a gap: the brand object, the scrim
   * and the type all still work, and the card reads as a lit panel.
   */
  src: string | null;
  /** The commissioned brand object shown when there is no photograph. */
  art: BrandIconName;
  title: string;
  body: string;
  /** Which part of the image to hold on to as the frame narrows. */
  position: string;
};

export function WelcomeCards({
  t,
  onDone,
}: {
  t: Dictionary;
  /** Runs when the slides are finished with, by reading them or by skipping. */
  onDone: () => void;
}) {
  const w = t.welcomeCards;
  const slides: Slide[] = [
    { src: null, art: "home-search", title: w.one.title, body: w.one.body, position: "center" },
    { src: null, art: "map-spot", title: w.two.title, body: w.two.body, position: "center" },
    { src: null, art: "globe-pin", title: w.three.title, body: w.three.body, position: "center" },
  ];

  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = slides.length - 1;

  /* The slide the reader is actually on, read off the scroll position rather
     than tracked in state, so a drag, a keyboard and a dot press can never
     disagree about where the track is. */
  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    setIndex(Math.round(el.scrollLeft / width));
  }, []);

  const goTo = useCallback((to: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && index < last) {
        event.preventDefault();
        goTo(index + 1);
      }
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        goTo(index - 1);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [index, last, goTo]);

  return (
    <section
      aria-label={w.label}
      data-testid="welcome-cards"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--nf-surface-canvas)]"
    >
      {/* ------------------------------------------------------------ track */}
      <div
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        className="nf-snap-x nf-focus-well flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
      >
        {slides.map((slide, i) => (
          <article
            key={slide.title}
            data-testid="welcome-card"
            aria-hidden={i !== index ? true : undefined}
            className="relative w-full shrink-0 snap-center overflow-hidden"
          >
            {slide.src ? (
              <Image
                src={slide.src}
                alt=""
                fill
                /* The first slide is the largest paint on the screen and it is
                   above the fold by definition, so it is not lazy. */
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: slide.position }}
              />
            ) : (
              /* The designed ground. Not a placeholder: the brand object is the
                 platform's own language and this card is finished as it is. */
              <div
                aria-hidden="true"
                className="absolute inset-0 grid place-items-center bg-[var(--nf-surface-artwork)]"
              >
                <BrandIcon name={slide.art} size={200} priority={i === 0} />
              </div>
            )}

            {/* The scrim. Theme independent on purpose: what is under it is a
                photograph in both themes, which is the one case where a dark
                treatment is correct in daylight too. Two layers - a full wash
                and a heavier foot - so the top of the image stays a photograph
                while the text at the bottom is always legible. */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: "var(--nf-overlay-media)" }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-3/5"
              style={{ backgroundImage: "var(--nf-scrim-media)" }}
            />

            {/* ONE headline, ONE supporting line. Anything else on a slide
                somebody looks at for two seconds is a thing they will not
                read. */}
            <div className="absolute inset-x-0 bottom-0 px-6 pb-10 sm:px-10 sm:pb-14">
              <h2 className="nf-h1 max-w-[16ch] text-[var(--nf-content-on-media)]">
                {slide.title}
              </h2>
              <p className="mt-3 max-w-[36ch] text-[1rem] leading-relaxed text-[var(--nf-content-on-media-muted)]">
                {slide.body}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Skip, from the first frame, over the image, and it does not move
          between slides. `nf-safe-top` clears the notch. */}
      <div className="nf-safe-top absolute right-4 top-0 z-10 pt-3">
        <button
          type="button"
          onClick={onDone}
          data-testid="welcome-skip"
          className="nf-tap rounded-[var(--nf-radius-control)] border border-[var(--nf-border-on-media)] bg-[var(--nf-overlay-media)] px-3.5 py-2 text-[0.8125rem] font-semibold text-[var(--nf-content-on-media)] backdrop-blur-md"
        >
          {w.skip}
        </button>
      </div>

      {/* ------------------------------------------------------- foot */}
      <div className="shrink-0 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-10">
        {/* Real buttons, not painted dots. Each says which slide it goes to,
            and the current one says that it is current. */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => goTo(i)}
              aria-label={w.goTo.replace("{n}", String(i + 1))}
              aria-current={i === index ? "true" : undefined}
              className="nf-tap grid h-11 w-7 place-items-center"
            >
              <span
                aria-hidden="true"
                className="block h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? "1.5rem" : "0.375rem",
                  background:
                    i === index ? "var(--nf-brand-primary)" : "var(--nf-border-default)",
                }}
              />
            </button>
          ))}
        </div>

        <div className="mt-3">
          {index < last ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              full
              onClick={() => goTo(index + 1)}
              data-testid="welcome-next"
            >
              {t.common.next}
              <UiIcon name="arrow-right" size="md" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              full
              onClick={onDone}
              data-testid="welcome-done"
            >
              {w.start}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
