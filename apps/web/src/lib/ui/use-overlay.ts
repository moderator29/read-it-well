"use client";

import { useEffect, type RefObject } from "react";
import { isTopOverlay, joinOverlay, leaveOverlay } from "@/lib/ui/overlay-registry";

/**
 * The four things every overlay owes the person using it.
 *
 * A sweep across all twenty-two overlays in this app found the same three
 * defects distributed almost at random: `AppShell`'s drawer and the site
 * `MobileMenu` carried `aria-modal` and no Escape handler at all, four sheets
 * let the page scroll behind them, and NOT ONE of the twenty-two trapped Tab.
 * Every one of them had been written by hand, which is why no two agreed.
 *
 * So this is one implementation, and the contract is:
 *
 *  1. **Escape closes.** An overlay a keyboard cannot leave is a trap.
 *  2. **The body does not scroll behind it.** The most common mobile bug in
 *     the world: you flick to dismiss a sheet and the page underneath moves.
 *  3. **Tab stays inside.** Tabbing out of a modal into the page behind it
 *     leaves a screen reader reading content that is visually covered.
 *  4. **Focus comes back.** On close, focus returns to whatever opened the
 *     overlay, so the keyboard does not get dumped at the top of the document.
 *
 * NOT EVERY OVERLAY IS MODAL. A navigation menu that opens over the page and
 * does not hide it (`InnerNav`) must not lock the body, must not trap Tab and
 * must not pull focus away from where the person is. It passes `modal: false`
 * and keeps the two things that are still owed: Escape closes it (when focus
 * is inside it, or the Escape is Android Back's synthetic one), and it joins
 * the overlay registry, so the Android back button closes it too (a non-locking
 * overlay leaves no scroll lock for Back to find, which is why Back asks the
 * registry and not the lock). It makes no history entry, so the BROWSER's back
 * button is not part of this; that needs `use-sheet-history.ts`, deliberately
 * not used for a menu. A modal overlay (the default) behaves exactly as it
 * always has.
 *
 * The scroll lock counts openers rather than setting and clearing a flag,
 * because two overlays can legitimately be open at once (a sheet over a
 * drawer) and the naive version has the inner one restore scrolling when it
 * closes while the outer is still up.
 */

/** How many overlays currently want the body still. */
let lockCount = 0;
let restoreOverflow = "";

function lockBody(): () => void {
  if (lockCount === 0) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.body.style.overflow = restoreOverflow;
  };
}

/** Everything focusable inside a container, in document order. */
function focusableWithin(root: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type=hidden])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return [...root.querySelectorAll<HTMLElement>(selector)].filter((el) => {
    // Hidden nodes report zero-size rects, and a trap that cycles through
    // invisible controls is worse than no trap.
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function useOverlay({
  open,
  onClose,
  panelRef,
  /** Move focus into the panel on open. Off for a menu that owns its own. */
  autoFocus = true,
  /**
   * The default, and what every sheet, drawer and dialog is: the page behind
   * is locked, Tab is trapped and focus returns to the opener on close. Pass
   * `false` for a non-modal menu: no scroll lock, no Tab trap and no focus
   * handling (the menu moves its own), only Escape and Back.
   */
  modal = true,
}: {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
  autoFocus?: boolean;
  modal?: boolean;
}): void {
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    const releaseScroll = modal ? lockBody() : () => {};

    const panel = panelRef.current;
    if (modal && autoFocus && panel) {
      const first = focusableWithin(panel)[0];
      (first ?? panel).focus?.();
    }

    const token = joinOverlay();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopOverlay(token)) return;
      if (event.key === "Escape") {
        /* A non-modal menu is open beside the page, so a real Escape is the
           menu's only while focus is inside it: from a field elsewhere it is
           that field's (clearing a search, closing its own popup), and a menu
           left open must not swallow it. Android's Back button dispatches a
           synthetic Escape (`lib/native/back-button.ts`), which is not trusted
           and is always meant for the top overlay. */
        if (!modal && event.isTrusted && !panelRef.current?.contains(document.activeElement)) return;
        event.stopPropagation();
        onClose();
        return;
      }
      if (!modal || event.key !== "Tab") return;

      const root = panelRef.current;
      if (!root) return;
      const items = focusableWithin(root);
      if (items.length === 0) {
        // Nothing to land on, so keep focus on the panel rather than letting
        // it escape to the page underneath.
        event.preventDefault();
        root.focus?.();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      leaveOverlay(token);
      document.removeEventListener("keydown", onKeyDown, true);
      releaseScroll();
      /* A non-modal menu moved its own focus and took none from the page. */
      if (!modal) return;
      // Only take focus back if it is still somewhere in the overlay we are
      // tearing down; a close that deliberately moved focus elsewhere wins.
      const panelNow = panelRef.current;
      const active = document.activeElement;
      if (!panelNow || !active || panelNow.contains(active) || active === document.body) {
        opener?.focus?.();
      }
    };
  }, [open, onClose, panelRef, autoFocus, modal]);
}
