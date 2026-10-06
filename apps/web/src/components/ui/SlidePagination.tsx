"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import "@/app/css/ported.css";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { cn } from "@/lib/cn";
import { feedback } from "@/lib/ui/feedback";
import { SPRING_SNAP, springFor, useDrive } from "./ported-motion";
import { paginationRange } from "./slide-pagination";

/**
 * SLIDE PAGINATION: A PAGE SWITCHER WHOSE INDICATOR TRAVELS.
 *
 * Rebuilt from the founder's `slide-pagination.tsx`. The sliding indicator is the
 * part worth keeping: the eye follows the selection from one page to the next
 * instead of losing it.
 *
 * WHY IT IS NOT `layoutId`. The original gets the travel from framer-motion's
 * shared `layoutId`, which is a layout-animation feature and lives in the
 * `domMax` bundle. The platform loads `domAnimation` only (MotionProvider, D39),
 * so a `layoutId` here would render and never animate. The indicator is instead
 * ONE absolutely positioned element whose `x` is a motion value, measured
 * against the real page buttons and moved with `animate()` on a snappy spring.
 * That keeps what `layoutId` gave (a shared element travelling between slots,
 * interruptible mid-flight: click page 9 while it is still moving to page 4 and
 * it turns round from where it is) with no layout measurement per frame and no
 * extra bundle. The value is written into the element by `useDrive`
 * (ported-motion.ts), not through an `m` element, because `m` shows nothing but
 * its first frame until the lazily loaded features arrive. Every slot is the same 44px width, so the indicator never has to
 * change size, only position.
 *
 * WHERE: desktop tables. Admin tables, transaction history, search results on a
 * wide screen, audit logs. NOT ON A PHONE: there, infinite scroll with a shaped
 * skeleton is right, so this hides itself below 48rem and there is deliberately
 * no prop to show it (a full page row with a prev and next is wider than a
 * 390px screen once the numbers are four digits). It renders an honest `nav`,
 * so when it is hidden it is hidden from assistive technology too.
 *
 * CONTROLLED OR NOT, as the original: pass `page` and `onChange`, or
 * `defaultPage` and let it keep its own.
 *
 * SHAPE. A track at Card radius (18) holding radius-14 segments at a 4px inset,
 * so the corners stay concentric; previous and next are circular icon controls.
 * D2 names segments as a place a pill is allowed, but check-css-tokens rule 10
 * ("a capsule on a control") is stricter and still enforced, so every segment
 * that carries text is a radius-14 rectangle.
 *
 * ACCESSIBLE: a `nav` with an accessible name, real buttons, `aria-current="page"`
 * on the current one, previous and next that disable at the ends. Every string is
 * a prop (four locales) and none has a default. The first paint never slides:
 * the indicator is placed with a jump, and only later moves are sprung. Quiet
 * readers (system reduced motion, Calm, Off) get a jump every time.
 */
/* Module level and stable, as `useDrive` requires. */
const writeThumb = (el: HTMLElement, v: number) => {
  el.style.transform = `translate3d(${v}px, 0, 0)`;
};

export function SlidePagination({
  pageCount,
  page: controlledPage,
  defaultPage = 1,
  onChange,
  siblingCount = 1,
  showControls = true,
  label,
  previousLabel,
  nextLabel,
  pageLabel,
  className,
  "data-testid": testId,
}: {
  pageCount: number;
  /** The current page, 1-based (controlled). */
  page?: number;
  /** The starting page when uncontrolled. */
  defaultPage?: number;
  onChange?: (page: number) => void;
  /** Pages shown either side of the current one. */
  siblingCount?: number;
  /** Previous and next. */
  showControls?: boolean;
  /** The navigation's accessible name, e.g. the table it pages. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** The accessible name of a page button, e.g. "Page 3". */
  pageLabel: (page: number) => string;
  className?: string;
  "data-testid"?: string;
}) {
  const { quiet } = useMotionGate();
  const [inner, setInner] = useState(defaultPage);
  const value = controlledPage ?? inner;
  const current = Math.min(Math.max(1, value), Math.max(1, pageCount));
  const slots = useMemo(() => paginationRange(current, pageCount, siblingCount), [current, pageCount, siblingCount]);
  const listRef = useRef<HTMLOListElement | null>(null);
  const refs = useRef(new Map<number, HTMLButtonElement>());
  const x = useMotionValue(0);
  const thumbRef = useDrive<HTMLLIElement, number>(x, writeThumb);
  const [placed, setPlaced] = useState(false);
  const first = useRef(true);

  /* Place the indicator under the current page. The first placement is a jump;
     every later one is a spring from wherever the indicator is right now. */
  useLayoutEffect(() => {
    const list = listRef.current;
    const target = () => {
      const el = refs.current.get(current);
      /* From the track's padding edge, where the indicator is positioned from.
         Rects rather than `offsetLeft`: the slots are positioned and would
         become the button's offset parent. */
      return el && list ? el.getBoundingClientRect().left - list.getBoundingClientRect().left - list.clientLeft : null;
    };
    const to = target();
    if (to === null) return;
    let controls: ReturnType<typeof animate> | undefined;
    if (first.current) {
      x.jump(to);
      first.current = false;
      setPlaced(true);
    } else {
      controls = animate(x, to, springFor(quiet, SPRING_SNAP));
    }
    /* A resize moves the slots under a settled indicator: follow with a jump.
       An observer reports once as soon as it starts watching, which is not a
       resize, and a jump then would cut the spring we have just started. */
    let watching = false;
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            if (!watching) {
              watching = true;
              return;
            }
            const next = target();
            if (next !== null) x.jump(next);
          });
    if (list) resize?.observe(list);
    return () => {
      controls?.stop();
      resize?.disconnect();
    };
  }, [current, slots, quiet, x]);

  const go = (next: number) => {
    const clamped = Math.min(Math.max(1, next), pageCount);
    if (clamped === current) return;
    feedback("select");
    if (controlledPage === undefined) setInner(clamped);
    onChange?.(clamped);
  };

  if (pageCount < 1) return null;

  return (
    <nav aria-label={label} className={cn("nf-slidepag", className)} data-testid={testId}>
      {showControls ? (
        <button
          type="button"
          className="nf-slidepag__step"
          aria-label={previousLabel}
          disabled={current <= 1}
          onClick={() => go(current - 1)}
        >
          <UiIcon name="arrow-left" size={20} />
        </button>
      ) : null}
      <ol ref={listRef} className="nf-slidepag__track">
        <li ref={thumbRef} aria-hidden="true" className="nf-slidepag__thumb" data-placed={placed || undefined} />
        {slots.map((slot) =>
          typeof slot === "number" ? (
            <li key={slot} className="nf-slidepag__slot">
              <button
                ref={(el) => {
                  if (el) refs.current.set(slot, el);
                  else refs.current.delete(slot);
                }}
                type="button"
                className="nf-slidepag__page"
                aria-label={pageLabel(slot)}
                aria-current={slot === current ? "page" : undefined}
                onClick={() => go(slot)}
              >
                {slot}
              </button>
            </li>
          ) : (
            <li key={slot} className="nf-slidepag__slot nf-slidepag__gap" aria-hidden="true">
              {"…"}
            </li>
          ),
        )}
      </ol>
      {showControls ? (
        <button
          type="button"
          className="nf-slidepag__step"
          aria-label={nextLabel}
          disabled={current >= pageCount}
          onClick={() => go(current + 1)}
        >
          <UiIcon name="arrow-right" size={20} />
        </button>
      ) : null}
    </nav>
  );
}
