"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motionQuiet } from "@/lib/motion/gate";

/**
 * Scroll reveal.
 *
 * Wraps a block and fades it up the first time it enters the viewport, so the
 * page assembles itself as you scroll rather than arriving all at once. Uses one
 * IntersectionObserver per block, disconnects after firing, and respects reduced
 * motion (and the Calm and Off motion settings) by never hiding at all. `delay`
 * staggers siblings.
 *
 * VISIBLE UNTIL JAVASCRIPT SAYS OTHERWISE. The server renders
 * `data-shown="true"`, so the first paint, a page whose scripts never run, a
 * print and a capture taken before hydration all show the content. Hiding only
 * happens on mount, only for a block whose top edge is below the fold, and it
 * is instant (no transition), so the hide itself is never on screen. When the
 * server emitted the hidden state instead, every block, above the fold
 * included, sat at `opacity: 0` until the chunks downloaded and hydrated: the
 * header painted and the body arrived later. `components/motion/Reveal.tsx`
 * follows the same rule.
 *
 * `data-instant` used to be set here too, feeding a second, scroll-driven
 * off for it entirely. Without that, the CSS view() timeline held the first
 * result card on /search at 56% opacity behind a 1.3px blur until the visitor
 * scrolled, because an animation outranks this component's revealed state in the
 * cascade and the card began life part way through its own entry range. Content
 * you have to scroll to still gets the full choreography; content you can
 * already see is simply legible.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "ul";
}) {
  const ref = useRef<HTMLElement | null>(null);
  /*
   * The hidden state is written straight onto the element rather than through
   * React state, as `components/motion/Reveal.tsx` does: React renders
   * `data-shown="true"` and never changes that prop, so a re-render cannot
   * reset what the effect wrote, and a reveal costs no second render.
   */

  useEffect(() => {
    if (motionQuiet()) return;
    const el = ref.current;
    if (!el) return;

    // Anything whose top edge is already inside the viewport on mount is
    // above the fold. There is no entry transit left for it to animate
    // through, so it stays as the server drew it.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    /*
     * NO OBSERVER, NO HIDING. F2-054.
     *
     * Everything below this line is an optimisation: it decides WHEN a section
     * animates in. The `opacity: 0` it is deciding for is content. If the
     * observer never runs, the section is not un-animated, it is absent, and a
     * visitor sees a blank band where the page's argument should be.
     *
     * `IntersectionObserver` is absent in older WebViews and in some privacy
     * browsers, and `new IntersectionObserver` THROWS there rather than
     * returning something inert. An exception thrown in an effect is not
     * caught by this component, so the old code did not merely fail to observe:
     * it took the render tree with it. Checked before constructed.
     */
    if (typeof IntersectionObserver === "undefined") return;

    // Hidden with the transition off, so the fade out is never played.
    el.style.transition = "none";
    el.dataset.shown = "false";

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.style.transition = "";
            el.style.transitionDelay = `${delay}ms`;
            el.dataset.shown = "true";
            io.disconnect();
          }
        }
      },
      /*
       * THRESHOLD 0, AND IT WAS 0.12, WHICH IS A TRIGGER THAT DEPENDS ON THE
       * SIZE OF THE THING BEING TRIGGERED.
       *
       * `threshold` is a fraction of the TARGET, not of the viewport. At 0.12 a
       * section had to get 12 per cent of ITSELF into view, so the taller the
       * section the further it had to travel, and a section more than about
       * eight viewports tall can never satisfy it at all: 12 per cent of it is
       * more than the whole screen, the entry fires zero times, and the band
       * stays at `opacity: 0` for ever. `Reveal` wraps whole landing-page
       * sections and a `ul`, so that is not a hypothetical shape.
       *
       * The intent behind 0.12 was "do not fire on the first pixel", and
       * `rootMargin` already delivers it in the unit that makes sense: -8 per
       * cent of the VIEWPORT off the bottom edge, which is the same delay for a
       * section of any height. So the size-dependent half goes and the
       * viewport-relative half stays.
       */
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      // Never leave a block hidden with nothing watching it: a re-run of this
      // effect decides afresh from where the block is now.
      el.style.transition = "";
      el.dataset.shown = "true";
    };
  }, [delay]);

  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      data-shown="true"
      className={`nf-reveal ${className ?? ""}`}
    >
      {children}
    </Comp>
  );
}
