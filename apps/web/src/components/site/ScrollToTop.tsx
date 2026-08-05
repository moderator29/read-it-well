"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { noteEntry } from "@/lib/ui/history";

/**
 * Scroll position, the big-app way: forward lands at the top, back lands where
 * you left off.
 *
 * THIS COMPONENT USED TO BE THE BUG. It was four lines that scrolled to
 * `(0, 0)` on every `pathname` change with no idea whether the change was a
 * push or a back, so a person who scrolled a long way down `/search`, opened a
 * place and came back was thrown to the top of the results every single time.
 * The browser had restored the position perfectly well; this component then
 * undid it. Measured on the real page at 390px: leave `/search` at scrollY
 * 502, come back at scrollY 153.
 *
 * The rule now:
 *
 *   push (a link, a form, a filter chip)   land at the top, instantly
 *   pop  (back or forward)                 land where that screen was left
 *
 * KEYED BY THE FULL URL, QUERY INCLUDED. `/search?q=Lagos&beds=2` and
 * `/search?q=Abuja` are two different screens to the person looking at them
 * and they scroll independently. Keying on `pathname` alone would hand one
 * search the other's position, which is worse than not restoring at all.
 *
 * WHY POPSTATE AND NOT A RENDER EFFECT. A `[pathname]` effect never fires when
 * only the query changes, so back from `?q=Abuja` to `?q=Lagos` would not be
 * seen at all. `popstate` fires on every traversal regardless, and by the time
 * it runs `location` already describes the entry being restored.
 *
 * WHY THE RETRY. On a traversal the restored page's markup is not on screen
 * yet, so the document is still short and a single `scrollTo(502)` clamps to
 * whatever currently fits and leaves the reader part-way up. That is precisely
 * the 502-to-153 measurement above. It re-applies for a few frames until the
 * document is tall enough to hold the position, then stops. Bounded, so a
 * genuinely shorter page settles instead of retrying for ever.
 *
 * It also stamps each history entry (`noteEntry`), because this is the one
 * component mounted on every screen in the app. See `lib/ui/history.ts` for
 * why back needed a stamp at all.
 */

const STORE_KEY = "nf_scroll_positions";
/** Positions remembered per tab. Enough for a deep hunt, not enough to bloat. */
const MAX_ENTRIES = 40;
/** How long to keep re-applying a restore while the page grows, in frames. */
const RESTORE_FRAMES = 40;
/**
 * How long after a traversal the push handler stays out of the way, in ms.
 * `popstate` runs before React re-renders, so the flag is always already set
 * by the time the `[pathname]` effect looks at it.
 */
const POP_GRACE_MS = 700;

function currentUrl(): string {
  return window.location.pathname + window.location.search;
}

function readPositions(): Record<string, number> {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writePositions(positions: Record<string, number>): void {
  try {
    const keys = Object.keys(positions);
    /* Oldest key first: JSON round-trips insertion order, and `remember`
       deletes a key before re-adding it, so the head really is the least
       recently touched screen. */
    if (keys.length > MAX_ENTRIES) {
      for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) delete positions[key];
    }
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(positions));
  } catch {
    /* Private browsing refuses session storage. Scroll memory is a courtesy,
       never a requirement, so it degrades to always landing at the top. */
  }
}

export function ScrollToTop() {
  const pathname = usePathname();
  const poppedAt = useRef(0);

  useEffect(() => {
    noteEntry();

    let frame = 0;
    let restoreBudget = 0;

    const remember = () => {
      frame = 0;
      const positions = readPositions();
      const url = currentUrl();
      delete positions[url];
      positions[url] = Math.round(window.scrollY);
      writePositions(positions);
    };

    /* rAF-throttled: scrolling fires dozens of times a second and every save
       is a JSON stringify into session storage. */
    const onScroll = () => {
      if (restoreBudget > 0) return;
      if (frame) return;
      frame = window.requestAnimationFrame(remember);
    };

    const restore = (target: number) => {
      restoreBudget = RESTORE_FRAMES;
      const step = () => {
        if (restoreBudget <= 0) return;
        restoreBudget -= 1;
        window.scrollTo({ top: target, left: 0, behavior: "instant" as ScrollBehavior });
        if (Math.abs(window.scrollY - target) <= 2) {
          restoreBudget = 0;
          return;
        }
        window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };

    const onPopState = () => {
      poppedAt.current = Date.now();
      noteEntry();
      const target = readPositions()[currentUrl()];
      if (typeof target === "number" && target > 0) restore(target);
      else window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      restoreBudget = 0;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  /* A push lands at the top. A traversal is `popstate`'s to handle, and it has
     already run by the time this fires. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    noteEntry();
    if (Date.now() - poppedAt.current < POP_GRACE_MS) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
