"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The dock, out of the way while somebody is reading.
 *
 * Inbox item 212. The tab bar is a floating dock roughly 64px tall sitting
 * over the bottom of a 390px screen, which is a real fraction of a phone, and
 * it sits there permanently. Reading a list of places is exactly when
 * navigation is not the question, and exactly when the bottom eighth of the
 * screen is worth the most.
 *
 * Scrolling down hides it. Scrolling up brings it straight back, because
 * reaching for navigation IS an upward gesture: the thumb flicks up, the dock
 * arrives under it. No delay, no timer, nothing to wait for.
 *
 * Four rules stop it becoming a guessing game:
 *
 *   It never hides in the top 96px of a page. A dock that vanishes on the
 *   first flick of a screen the reader has barely entered reads as a glitch
 *   rather than as an affordance.
 *
 *   It never hides at the bottom of a page. Somebody who has scrolled to the
 *   end of a list should not have to scroll back up to leave.
 *
 *   It ignores movements under 8px, so a rubber-band bounce, a momentum
 *   settle or a thumb resting on the glass does not flicker it.
 *
 *   It comes back on focus, in CSS, so a keyboard reaching the dock while it
 *   is hidden reveals it rather than tabbing into something invisible.
 *
 * A NEW SCREEN ALWAYS STARTS WITH THE DOCK IN PLACE, and it used to be done by
 * remounting. The call site keyed this component on the active route, so a
 * navigation threw the node away and built a new one. That was the right answer
 * to a real problem, and two softer approaches had been tried and measured and
 * failed the same way: a dock hidden when the reader tapped Explore was still
 * hidden on the search screen, at scroll position zero, with nothing to scroll
 * up from. Resetting the state during render is not enough, because an app
 * navigation is a transition and the render that resets it is not the one that
 * commits. Waiting for the first scroll event is not enough, because a
 * navigation to the top of a page fires none.
 *
 * THE REMOUNT HAD A COST NOBODY HAD CHARGED IT FOR. The tab bar's highlight is
 * a single element that travels from the old tab to the new one, and an element
 * that is destroyed and rebuilt cannot travel: it can only appear, already
 * arrived. So the bar cut between destinations and no amount of CSS was going
 * to fix it, because the DOM node the CSS would have animated did not survive
 * the navigation.
 *
 * So the reset is an EFFECT ON THE ROUTE, which is the third approach and the
 * one neither of the first two was. It runs after the navigation has committed,
 * which is exactly what resetting during render could not do, and it does not
 * wait for a scroll event, which is what the second approach got wrong. The
 * node survives, the pill travels, and a new screen still starts with the dock
 * in place.
 *
 * The one thing it does not do is reset BEFORE the first paint of the new
 * screen. If somebody scrolls down, hides the dock and taps a tab, the new
 * screen can show one frame with the dock still out of view, and then it slides
 * back in on its own transition. That reads as the dock returning rather than
 * as a glitch, and it is the price of the node surviving.
 *
 * The wrapper is a client component holding only this behaviour. The dock
 * itself stays a server component, which matters: it is handed the whole
 * dictionary, and turning it into a client component would serialise all of it
 * into the payload of every app page.
 */

/** Never hide within this distance of the top of the page. */
const SHOW_ABOVE = 96;
/** Never hide within this distance of the bottom of the page. */
const SHOW_NEAR_END = 48;
/** Movements smaller than this are noise, not a decision. */
const JITTER = 8;

export function AutoHideDock({
  label,
  route,
  className,
  children,
}: {
  label: string;
  /** The active route. Changing it puts the dock back on screen. */
  route: string;
  className?: string;
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  /* The reset, after the navigation has committed. See the note above. */
  useEffect(() => {
    lastY.current = window.scrollY;
    setHidden(false);
  }, [route]);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;

      /*
       * WHERE the page is, before HOW it got there.
       *
       * These two guards used to sit behind the jitter check, and that was
       * wrong in a way only a browser found: `html` sets `scroll-behavior:
       * smooth`, so arriving at the foot of a page is an animation that ends
       * in a run of one and two pixel steps. Every one of those was under the
       * jitter threshold and returned early, so the last position the dock
       * ever acted on was somewhere mid-flight, scrolling down, hidden. The
       * page was at its very end with the dock off the screen and the rule
       * saying it must be there. Real momentum scrolling settles the same way.
       *
       * Jitter is a guard on the DIRECTION decision, which is the only thing a
       * two pixel wobble can get wrong. It has no business gating a fact.
       */
      const atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - SHOW_NEAR_END;
      if (y <= SHOW_ABOVE || atEnd) {
        lastY.current = y;
        setHidden(false);
        return;
      }

      const delta = y - lastY.current;
      if (Math.abs(delta) < JITTER) return;
      lastY.current = y;
      setHidden(delta > 0);
    };

    /* Coalesced into one frame: a scroll event fires far more often than the
       compositor paints, and setting state on each one is work nobody sees. */
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav aria-label={label} data-dock-hidden={hidden ? "true" : undefined} className={className}>
      {children}
    </nav>
  );
}
