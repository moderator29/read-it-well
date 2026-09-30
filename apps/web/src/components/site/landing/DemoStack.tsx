"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/components/motion/useInView";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { SPRING_SNAPPY, SPRING_SOFT, flickDirection, releaseVelocity, rubber, springTo } from "./spring";

/**
 * THE STACK YOU CAN MOVE BY HAND (the founder's reference 40, 29 September
 * 2026: "those containers, the content and stuff in it can be moved by hand
 * upward, down, sideways").
 *
 * A deck of cards, each a nested frame (a card on stacked plates) holding
 * one product moment drawn from the platform's own screens and labelled
 * Example. The cards behind the front one peek out above it as plates.
 *
 *   THE CARD   drag it sideways (pointer or touch) and let go: a throw past
 *              80px, or faster than 550px/s, flicks it to the back of the
 *              deck and brings the next one forward; anything less springs
 *              home. A mouse can also lift it up and down, on a rubber band.
 *   THE MOMENT the product fragment inside the card moves freely, up, down
 *              and sideways, on a rubber band, and springs back with a small
 *              bounce when released. It takes the touch for itself
 *              (`touch-action: none`), while the rest of the card leaves a
 *              vertical swipe to the page so a phone can still scroll past.
 *   KEYBOARD   the deck is a focusable region; Left and Right move through
 *              the cards; the dots and the arrows are buttons.
 *
 * Transform and opacity only, written straight to the element on each
 * pointer move and each spring frame (`spring.ts`), so a drag never
 * re-renders React and holds 60 frames a second. No dependency.
 *
 * UNDER REDUCED MOTION, CALM AND OFF there is no physics and no deck: the
 * cards are laid out as a plain list, every one visible and still.
 */
export type StackCard = {
  key: string;
  title: string;
  body: string;
  moment: ReactNode;
};

type Labels = {
  region: string;
  prev: string;
  next: string;
  /** "{n} of {total}" */
  position: string;
  hint: string;
};

type Drag = {
  id: number;
  mode: "card" | "moment";
  el: HTMLElement;
  x0: number;
  y0: number;
  x: number;
  y: number;
  samples: { t: number; x: number; y: number }[];
};

export function DemoStack({ cards, labels }: { cards: StackCard[]; labels: Labels }) {
  const { quiet } = useMotionGate();
  const hydrated = useHydrated();
  const [index, setIndex] = useState(0);
  const n = cards.length;
  const drag = useRef<Drag | null>(null);
  const cancels = useRef(new Map<HTMLElement, () => void>());
  const flinging = useRef(false);

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + n) % n), [n]);

  useEffect(() => {
    const running = cancels.current;
    return () => {
      for (const cancel of running.values()) cancel();
      running.clear();
    };
  }, []);

  if (hydrated && quiet) {
    return (
      /* A still row: swiped sideways on a phone (the native scroll, which
         is not motion the page makes), two columns from 48rem. Focusable so
         a keyboard can scroll it. */
      <ul className="nf-stack nf-stack--still" aria-label={labels.region} tabIndex={0}>
        {cards.map((c) => (
          <li key={c.key} className="nf-stack__card">
            <Frame card={c} />
          </li>
        ))}
      </ul>
    );
  }

  const place = (el: HTMLElement, x: number, y: number, mode: Drag["mode"]) => {
    el.style.transform =
      mode === "card" ? `translate3d(${x}px, ${y}px, 0) rotate(${(x * 0.035).toFixed(2)}deg)` : `translate3d(${x}px, ${y}px, 0)`;
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (flinging.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const card = e.currentTarget;
    const moment = (e.target as HTMLElement).closest<HTMLElement>(".nf-stack__moment");
    const mode: Drag["mode"] = moment && card.contains(moment) ? "moment" : "card";
    const el = mode === "moment" && moment ? moment : card;
    cancels.current.get(el)?.();
    cancels.current.delete(el);
    el.setPointerCapture?.(e.pointerId);
    el.dataset.dragging = "true";
    card.dataset.held = "true";
    drag.current = {
      id: e.pointerId,
      mode,
      el,
      x0: e.clientX,
      y0: e.clientY,
      x: 0,
      y: 0,
      samples: [{ t: e.timeStamp, x: 0, y: 0 }],
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (d.mode === "card") {
      d.x = dx;
      /* A touch leaves vertical movement to the page, so only a mouse lifts
         the card up and down. */
      d.y = e.pointerType === "mouse" ? rubber(dy, 48) : 0;
    } else {
      d.x = rubber(dx, 72);
      d.y = rubber(dy, 72);
    }
    d.samples.push({ t: e.timeStamp, x: dx, y: dy });
    if (d.samples.length > 8) d.samples.shift();
    place(d.el, d.x, d.y, d.mode);
  };

  const release = (e: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const card = d.el.closest<HTMLElement>(".nf-stack__card");
    if (card) delete card.dataset.held;
    delete d.el.dataset.dragging;
    const { vx, vy } = releaseVelocity(d.samples);
    const dir = cancelled || d.mode === "moment" ? 0 : flickDirection(d.x, d.y, vx);
    if (dir !== 0) {
      /* The flick: the card carries on out the way it was thrown, then
         drops to the back of the deck as the next one comes forward. */
      flinging.current = true;
      d.el.dataset.flung = "true";
      d.el.style.transform = `translate3d(${-dir * 115}%, ${d.y}px, 0) rotate(${-dir * 8}deg)`;
      window.setTimeout(() => {
        delete d.el.dataset.flung;
        d.el.style.transform = "";
        go(dir);
        flinging.current = false;
      }, 200);
      return;
    }
    const el = d.el;
    const mode = d.mode;
    const stop = springTo(
      { x: d.x, y: d.y },
      { x: 0, y: 0 },
      { vx: mode === "moment" ? vx * 0.4 : vx, vy: mode === "moment" ? vy * 0.4 : 0 },
      (x, y) => place(el, x, y, mode),
      () => {
        el.style.transform = "";
        cancels.current.delete(el);
      },
      mode === "moment" ? SPRING_SOFT : SPRING_SNAPPY,
    );
    cancels.current.set(el, stop);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const position = labels.position.replace("{n}", String(index + 1)).replace("{total}", String(n));

  return (
    <div
      className="nf-stack"
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.region}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="nf-stack__deck">
        {cards.map((c, i) => {
          const depth = (i - index + n) % n;
          const front = depth === 0;
          return (
            <article
              key={c.key}
              className="nf-stack__card"
              data-depth={Math.min(depth, 3)}
              aria-hidden={!front}
              inert={!front}
              style={{ "--nf-depth": Math.min(depth, 3) } as CSSProperties}
              onPointerDown={front ? onPointerDown : undefined}
              onPointerMove={front ? onPointerMove : undefined}
              onPointerUp={front ? (e) => release(e, false) : undefined}
              onPointerCancel={front ? (e) => release(e, true) : undefined}
            >
              <Frame card={c} />
            </article>
          );
        })}
      </div>
      <div className="nf-stack__nav">
        <Button variant="icon" round leadingIcon="arrow-left" aria-label={labels.prev} onClick={() => go(-1)} />
        <div className="nf-stack__dots">
          {cards.map((c, i) => (
            <button
              key={c.key}
              type="button"
              className="nf-stack__dot"
              aria-label={`${c.title}, ${labels.position.replace("{n}", String(i + 1)).replace("{total}", String(n))}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <Button variant="icon" round leadingIcon="arrow-right" aria-label={labels.next} onClick={() => go(1)} />
      </div>
      <p className="nf-stack__hint" aria-live="polite">
        <span className="sr-only">{position}. </span>
        {labels.hint}
      </p>
    </div>
  );
}

/** One card: the outer frame, the plates, the moment, then its words. */
function Frame({ card }: { card: StackCard }) {
  return (
    <div className="nf-stack__frame">
      <div className="nf-stack__inner">
        <div className="nf-stack__plates">
          <span className="nf-stack__plate nf-stack__plate--2" aria-hidden="true" />
          <span className="nf-stack__plate nf-stack__plate--1" aria-hidden="true" />
          <div className="nf-stack__moment">{card.moment}</div>
        </div>
        <h3 className="nf-stack__title">{card.title}</h3>
        <p className="nf-stack__body">{card.body}</p>
      </div>
    </div>
  );
}
