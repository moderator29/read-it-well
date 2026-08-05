"use client";

import { useEffect, type RefObject } from "react";

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
}: {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
  autoFocus?: boolean;
}): void {
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    const releaseScroll = lockBody();

    const panel = panelRef.current;
    if (autoFocus && panel) {
      const first = focusableWithin(panel)[0];
      (first ?? panel).focus?.();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

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
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      releaseScroll();
      // Only take focus back if it is still somewhere in the overlay we are
      // tearing down; a close that deliberately moved focus elsewhere wins.
      const panelNow = panelRef.current;
      const active = document.activeElement;
      if (!panelNow || !active || panelNow.contains(active) || active === document.body) {
        opener?.focus?.();
      }
    };
  }, [open, onClose, panelRef, autoFocus]);
}
