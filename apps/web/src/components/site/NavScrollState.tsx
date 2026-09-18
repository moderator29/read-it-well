"use client";

import { useEffect } from "react";

/**
 * Writes `data-scrolled` on the marketing header once the page has moved.
 *
 * The landing header is transparent while the hero photograph is behind it
 * and becomes the chrome glass the moment content starts passing under it.
 * That is a scroll position, which CSS alone cannot read everywhere yet, so
 * this is the one line of JavaScript the header needs. It is passive, it
 * writes only when the state changes, and it leaves the attribute where it
 * was on unmount so a client navigation never flashes the bar.
 */
export function NavScrollState({ target }: { target: string }) {
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    let scrolled: boolean | null = null;
    const read = () => {
      const next = window.scrollY > 24;
      if (next !== scrolled) {
        scrolled = next;
        el.dataset.scrolled = next ? "true" : "false";
      }
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, [target]);
  return null;
}
