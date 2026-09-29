"use client";

import { useEffect } from "react";

/**
 * THE PILL STAYS ABOVE THE KEYBOARD.
 *
 * The earlier auth pass promised that the primary button of the chooser and
 * of the password step sits in view with the keyboard up. The curved block
 * gives most of that back by shortening while a field has focus (auth.css,
 * "THE KEYBOARD"); this closes the rest. When a field in an auth form takes
 * focus, and again when the visual viewport shrinks under the keyboard, the
 * page scrolls just far enough for the form's pill to clear the keyboard,
 * and never so far that the field being typed in leaves the top.
 *
 * Sign up is skipped: its pill already rides a bar pinned to the screen's
 * foot. Nothing is drawn; this only listens.
 */
export function KeepPillInView() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let timer = 0;

    const settle = () => {
      const field = active;
      if (!field || document.activeElement !== field) return;
      const pill = field.closest("form")?.querySelector<HTMLElement>(".nf-auth__actions");
      if (!pill || pill.classList.contains("nf-auth__actions--sticky")) return;
      const vv = window.visualViewport;
      const top = vv ? vv.offsetTop : 0;
      const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const over = pill.getBoundingClientRect().bottom + 12 - bottom;
      const room = field.getBoundingClientRect().top - top - 8;
      const by = Math.min(over, room);
      if (by <= 0) return;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollBy({ top: by, behavior: calm ? "auto" : "smooth" });
    };
    const later = () => {
      window.clearTimeout(timer);
      /* The keyboard and the shortening block both animate first. */
      timer = window.setTimeout(settle, 360);
    };
    const FIELD = ".nf-auth__body :is(input:not([type=checkbox]):not([type=hidden]), select, textarea)";
    const take = (el: Element | null) => {
      if (!(el instanceof HTMLElement) || !el.matches(FIELD)) return;
      active = el;
      later();
    };
    const onFocus = (event: FocusEvent) => take(event.target as Element | null);
    /* The password step focuses its field on arrival, before this listens. */
    take(document.activeElement);

    document.addEventListener("focusin", onFocus);
    window.visualViewport?.addEventListener("resize", later);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", onFocus);
      window.visualViewport?.removeEventListener("resize", later);
    };
  }, []);

  return null;
}
