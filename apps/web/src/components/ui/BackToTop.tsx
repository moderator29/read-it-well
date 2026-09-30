"use client";

import { useEffect, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { prefersCalm } from "@/lib/ui/calm";
import { shouldOfferTop } from "@/lib/ui/small-rules";

/**
 * SMART BACK TO TOP (details pass). A small pill above the dock that offers
 * the way up only when it is useful:
 *
 *   - the page is long (four screens or more), so a short page never shows it;
 *   - the reader is well down it (past two screens);
 *   - and they have just started scrolling UP, which is the moment somebody is
 *     looking for the top. Scrolling down (reading on) hides it again.
 *
 * It scrolls smoothly unless the reader asked for less motion, then moves
 * focus to the page's heading so a keyboard or screen reader lands at the top
 * too. It steps aside while a toast is up (details.css).
 */
export function BackToTop() {
  const label = useClientCopy().details.top.label;
  const [show, setShow] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    last.current = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        /* A few pixels of jitter is not a change of mind. */
        if (Math.abs(y - last.current) < 8) return;
        const next = shouldOfferTop({
          scrollY: y,
          viewport: window.innerHeight,
          pageHeight: document.documentElement.scrollHeight,
          scrollingUp: y < last.current,
        });
        last.current = y;
        setShow(next);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      className="nf-to-top"
      data-hidden={show ? undefined : ""}
      aria-hidden={show ? undefined : true}
      tabIndex={show ? 0 : -1}
      data-testid="back-to-top"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: prefersCalm() ? "auto" : "smooth" });
        setShow(false);
        const heading = document.querySelector<HTMLElement>("main h1");
        if (heading) {
          if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }}
    >
      <UiIcon name="arrow-up" size={16} />
      {label}
    </button>
  );
}
