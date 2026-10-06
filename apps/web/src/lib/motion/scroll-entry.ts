import { useEffect, type RefObject } from "react";
import { motionQuiet } from "./gate";
import { isDataSaver } from "@/lib/ui/data-saver";

/**
 * CARDS FLOAT IN AS THEY SCROLL INTO VIEW, ONCE EACH (Session 3, R2;
 * MOTION_SYSTEM "Card entry on scroll": a 50 to 90px float, `land` 520ms,
 * the children of one row staggered 60ms).
 *
 * THE CARDS THE PAGE OPENS ON ARE NOT THIS ONE'S. The first screen's cards
 * already arrive with the list's own stagger (`nf-card-in`, the first six, 40ms
 * apart), and a second entrance on top of it would be the card arriving twice.
 * So the first thing this learns about a card is whether it was in view when
 * it mounted: if it was, it is left alone for good. If it was not, it is held
 * back (`data-entry="pending"`, drawn faded and floated by `list-views.css`,
 * with its own list stagger switched off) and released the first time it
 * scrolls into view (`data-entry="in"`), where the stylesheet plays the float.
 * One shot: the card is then unobserved.
 *
 * ONE OBSERVER FOR THE WHOLE LIST, AND NO LAYOUT READS. A long results list is
 * the densest scroll surface in the product, so this adds no scroll handler and
 * never measures an element: an IntersectionObserver reports visibility and the
 * rectangles it needs (for the row order) itself, off the main thread's layout
 * path. (No inset on the root: the float already offsets a held card, so the
observer sees it a little late without one.) Cards that arrive in one callback are ordered top to bottom, left to
 * right, and take 0, 60, 120ms and so on, capped at six, so a row lands as one
 * organism and a long jump does not queue.
 *
 * THE FLOAT IS SEEDED, NOT RANDOM: 50, 70 or 90px by the card's index (MOTION
 * principle 7), so the same list lands the same way on every visit.
 *
 * It does nothing under reduced motion, Calm, Off or data saving, and the
 * stylesheet repeats that for the root attributes and for print, so a card is
 * never left hidden. Nothing here touches a money figure.
 */
const FLOATS = [50, 70, 90] as const;
const STAGGER_MS = 60;

let shared: IntersectionObserver | null = null;
/** Elements whose first report (was it on screen at mount?) has been read. */
const reported = new WeakSet<Element>();

function observer(): IntersectionObserver {
  if (shared) return shared;
  shared = new IntersectionObserver(
    (entries) => {
      const arriving: IntersectionObserverEntry[] = [];
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (!reported.has(el)) {
          reported.add(el);
          if (entry.isIntersecting) {
            shared?.unobserve(el);
            delete el.dataset.entry;
          } else el.dataset.entry = "pending";
          continue;
        }
        if (entry.isIntersecting && el.dataset.entry === "pending") arriving.push(entry);
      }
      arriving
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left,
        )
        .forEach((entry, order) => {
          const el = entry.target as HTMLElement;
          el.style.setProperty("--nf-entry-delay", `${Math.min(order, 5) * STAGGER_MS}ms`);
          el.dataset.entry = "in";
          shared?.unobserve(el);
        });
    },
    { threshold: 0, rootMargin: "0px" },
  );
  return shared;
}

export function useScrollEntry(ref: RefObject<HTMLElement | null>, index: number | undefined): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || index === undefined) return;
    if (typeof IntersectionObserver === "undefined" || motionQuiet() || isDataSaver()) return;
    /* A sideways rail is not this one's: a card floated down inside an
       overflow-x container adds vertical overflow (the rail itself would
       scroll), and its slots would rise from below as it is swiped. */
    if (el.closest(".nf-scroll-x")) return;
    el.style.setProperty("--nf-entry-float", `${FLOATS[index % FLOATS.length]}px`);
    const io = observer();
    io.observe(el);
    return () => {
      io.unobserve(el);
      reported.delete(el);
      /* Never leave a card held: if the effect re-runs (its index changed),
         the next first report may find it on screen and not release it. */
      delete el.dataset.entry;
      el.style.removeProperty("--nf-entry-delay");
    };
  }, [ref, index]);
}
