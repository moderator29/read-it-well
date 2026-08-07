"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@naijafinds/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Three cards, on the way in.
 *
 * The first thing somebody sees after confirming their address. Three sentences
 * about what this place is, and then it gets out of the way: it is a doorway,
 * not a tour, and a doorway you cannot walk past is a door.
 *
 * SLIDE OR SKIP, and both are real. The track is a native scroll container with
 * scroll snapping, so a thumb drags it exactly the way a thumb expects and the
 * platform's own momentum does the easing. That is deliberate rather than lazy:
 * a hand-rolled carousel with pointer maths is where the swipe stops feeling
 * native, where the keyboard stops working, and where a screen reader is handed
 * three panels it cannot reach. Here, arrow keys move it because it is a scroll
 * container, Tab reaches every card because they are in the document, and the
 * dots below are real buttons rather than decoration.
 *
 * Skip is on screen from the first frame, in the corner where a skip belongs,
 * and it never moves. Somebody who has read this once should be able to leave
 * without hunting, and somebody who is here to do a thing rather than read
 * about it should never be made to page through three cards first.
 */

type Card = {
  icon: BrandIconName;
  title: string;
  body: string;
};

export function WelcomeCards({
  t,
  onDone,
}: {
  t: Dictionary;
  /** Runs when the cards are finished with, by reading them or by skipping. */
  onDone: () => void;
}) {
  const w = t.welcomeCards;
  const cards: Card[] = [
    { icon: "home-search", title: w.one.title, body: w.one.body },
    { icon: "shield-check", title: w.two.title, body: w.two.body },
    { icon: "chat-duo", title: w.three.title, body: w.three.body },
  ];

  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = cards.length - 1;

  /* The card the reader is actually on, read off the scroll position rather
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

  /* Left and right on a keyboard, because a scroll container gives that away
     for nothing and a carousel that only answers to a thumb is a carousel half
     the people cannot use. */
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
      className="relative w-full max-w-[32rem]"
    >
      {/* Skip, from the first frame, and it does not move between cards. */}
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          data-testid="welcome-skip"
          className="nf-tap rounded-[var(--nf-radius-pill)] px-3 py-2 text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-primary)]"
        >
          {w.skip}
        </button>
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        /* `nf-snap-x` is the platform's own snapping row, already used by the
           category pills and the card carousels, so this reads and behaves as
           one of them rather than as a new thing. */
        className="nf-snap-x nf-focus-well flex snap-x snap-mandatory overflow-x-auto rounded-[var(--nf-radius-2xl)]"
      >
        {cards.map((card, i) => (
          <article
            key={card.title}
            data-testid="welcome-card"
            aria-hidden={i !== index ? true : undefined}
            className="nf-card w-full shrink-0 snap-center px-6 py-9 text-center sm:px-8"
          >
            {/* `nf-story-art`, not `nf-icon-tile`. The tile takes 9% padding,
                which resolves against the containing block rather than the
                element, so a 64px tile inside a 390px card was padding a 3D
                object down to nothing and painting an empty white chip. Every
                other empty state on this platform draws its object this way. */}
            <span className="nf-story-art mx-auto block h-20 w-20">
              <BrandIcon name={card.icon} fill />
            </span>
            <h2 className="nf-h3 mt-5">{card.title}</h2>
            <p className="mx-auto mt-2.5 max-w-[34ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {card.body}
            </p>
          </article>
        ))}
      </div>

      {/* Real buttons, not painted dots. Each one says which card it goes to,
          and the current one says that it is current. */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {cards.map((card, i) => (
          <button
            key={card.title}
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

      <div className="mt-5">
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
            <UiIcon name="arrow-right" size={20} />
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
    </section>
  );
}
