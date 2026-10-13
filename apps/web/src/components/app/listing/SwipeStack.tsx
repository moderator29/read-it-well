"use client";

import { Children, useCallback, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { animate, type AnimationPlaybackControls } from "framer-motion";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { motionQuiet } from "@/lib/motion/gate";
import { feedback } from "@/lib/ui/feedback";
import "./swipe-stack.css";

/**
 * THE SWIPEABLE CARD STACK (the founder's travel-app reference, 7 October
 * 2026: "Popular with trailgoers"). Featured places as a stack, not a scroll
 * row: the front card is the one thing on the shelf, the next two peek behind
 * it, smaller, dimmer and lower (depth by stacking, reference 1), and a swipe
 * throws the front card away while the next rises into its place.
 *
 * SHARED, AND ONLY THE MECHANICS. It takes finished cards as children and
 * knows nothing about stays, homes or restaurants; `StackCardFace` beside it
 * is the face both markets draw. Built here for the Stays side ahead of the
 * Property side's own use (the discovery agent), so the two use one stack.
 *
 * MOTION (MOTION_SYSTEM 2b: one focal action, settles without bounce). The
 * front card follows the finger with a slight lean, written straight onto
 * the element (no React render per frame; framer-motion's `animate()` only,
 * D49.1). Past a third of its width or a firm flick it leaves in 240ms and
 * the stack steps forward (the cards behind rise on CSS, `entrance`);
 * released short, it returns on a critically damped spring. The two arrows
 * and the keyboard (left, right) do the same without a gesture, so the stack
 * never depends on a swipe. Under reduced motion, Calm and Off the cards
 * change in place with no travel; the order of ideas is the same.
 *
 * A drag never opens a card: the click that ends a drag is swallowed, and a
 * mostly vertical movement is left to the page's scroll (`touch-action:
 * pan-y`).
 */
export function SwipeStack({
  children,
  label,
  copy,
  testId,
}: {
  children: ReactNode;
  /** The shelf's accessible name. */
  label: string;
  copy: { next: string; previous: string; position: string };
  testId?: string;
}) {
  const cards = Children.toArray(children);
  const total = cards.length;
  const [front, setFront] = useState(0);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<{ x: number; y: number; t: number; dx: number; dragging: boolean; id: number } | null>(null);
  const swallowClick = useRef(false);
  const busy = useRef(false);
  /* The spring that returns a short release, held so a new touch or a throw
     can stop it instead of both writing the same transform. */
  const settle = useRef<AnimationPlaybackControls | null>(null);

  const place = useCallback((dx: number) => {
    const el = frontRef.current;
    if (el) el.style.transform = dx === 0 ? "" : `translateX(${dx}px) rotate(${dx / 30}deg)`;
  }, []);

  const advance = useCallback(
    async (direction: 1 | -1, from = 0) => {
      if (total < 2 || busy.current) return;
      settle.current?.stop();
      feedback("select");
      if (motionQuiet() || direction === -1) {
        place(0);
        setFront((current) => (current + direction + total) % total);
        return;
      }
      busy.current = true;
      const to = from > 0 ? 460 : -460;
      await animate(from, to, { duration: 0.24, ease: [0.4, 0, 1, 1], onUpdate: place });
      /* The thrown card goes to the back of the deck unseen: hidden before
         its transform clears, so it never flashes at the front, then let
         back in as the last card once it has been laid out there. */
      const thrown = frontRef.current;
      if (thrown) {
        thrown.style.transition = "none";
        thrown.style.opacity = "0";
      }
      place(0);
      setFront((current) => (current + 1) % total);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (thrown) {
            thrown.style.transition = "";
            thrown.style.opacity = "";
          }
        }),
      );
      busy.current = false;
    },
    [place, total],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (total < 2 || busy.current || motionQuiet()) return;
    settle.current?.stop();
    gesture.current = { x: event.clientX, y: event.clientY, t: event.timeStamp, dx: 0, dragging: false, id: event.pointerId };
    swallowClick.current = false;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      g.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    g.dx = dx;
    place(dx);
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !g.dragging) return;
    swallowClick.current = true;
    const width = event.currentTarget.offsetWidth || 320;
    const velocity = g.dx / Math.max(1, event.timeStamp - g.t);
    /* A throw still in flight (an arrow or a key began it mid-drag) would make
       `advance` a no-op and leave this card at the finger's offset, so the
       card springs home instead. */
    if (!busy.current && (Math.abs(g.dx) > width / 3 || Math.abs(velocity) > 0.6)) {
      void advance(1, g.dx);
      return;
    }
    settle.current = animate(g.dx, 0, { type: "spring", stiffness: 420, damping: 40, onUpdate: place });
  };

  if (total === 0) return null;
  const visible = Array.from({ length: Math.min(3, total) }, (_, depth) => (front + depth) % total);

  return (
    <section
      className="nf-stack"
      aria-roledescription="carousel"
      aria-label={label}
      data-testid={testId}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") void advance(1);
        if (event.key === "ArrowLeft") void advance(-1);
      }}
    >
      <div className="nf-stack__deck">
        {visible
          .slice()
          .reverse()
          .map((index) => {
            const depth = visible.indexOf(index);
            const isFront = depth === 0;
            return (
              <div
                key={index}
                ref={isFront ? frontRef : undefined}
                className="nf-stack__card"
                data-depth={depth}
                aria-hidden={!isFront}
                inert={!isFront}
                onPointerDown={isFront ? onPointerDown : undefined}
                onPointerMove={isFront ? onPointerMove : undefined}
                onPointerUp={isFront ? onPointerEnd : undefined}
                onPointerCancel={isFront ? onPointerEnd : undefined}
                onClickCapture={(event) => {
                  if (swallowClick.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    swallowClick.current = false;
                  }
                }}
              >
                {cards[index]}
              </div>
            );
          })}
      </div>

      {total > 1 ? (
        <div className="nf-stack__nav">
          <button type="button" className="nf-stack__arrow" aria-label={copy.previous} onClick={() => void advance(-1)}>
            <UiIcon name="arrow-left" size={18} />
          </button>
          <p className="nf-stack__count nf-numeric" aria-live="polite">
            {copy.position.replace("{n}", String(front + 1)).replace("{total}", String(total))}
          </p>
          <button type="button" className="nf-stack__arrow" aria-label={copy.next} onClick={() => void advance(1)}>
            <UiIcon name="arrow-right" size={18} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
