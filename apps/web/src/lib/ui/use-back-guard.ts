"use client";

import { useEffect, useRef, useState } from "react";
import { looksNative } from "@/lib/native/platform";
import { overlayIsOpen } from "@/lib/ui/overlay-registry";
import { readSheetIds } from "@/lib/ui/use-sheet-history";

/**
 * THE BROWSER'S BACK, ASKED ABOUT LIKE EVERY OTHER WAY OUT OF A FORM.
 *
 * A form that guards unsaved changes (the host wizard) asks before its own
 * Back, a step jump, a link, a reload or closing the tab. The browser's Back
 * button and the Android Chrome back gesture were the gap: a `popstate` cannot
 * be cancelled, so they left the page and the typed answers with it.
 *
 * So while there is something unsaved, one history entry is pushed at the same
 * address (the GUARD, stamped `nfUnsaved`). The browser's Back takes the guard
 * off instead of leaving, the page is still there, and `onBack` asks the
 * person (Save and go back, Discard, or Stay). Leaving after that is the
 * form's own Back (`useBack`, docs/BACK_NAVIGATION.md), which steps over every
 * entry at this address, the guard included. Stay pushes a guard again.
 *
 * THE GUARD IS FOUND BY ITS NAVIGATION API KEY, NOT BY ITS STAMP. Every save
 * ends in `router.refresh()`, and Next replaces the top entry's state with
 * its own when it does, which wipes any custom key. The entry's key survives
 * a replace. Without the Navigation API (no proof of which entry is which)
 * this does nothing, the same answer `previousEntry()` gives there: the
 * drawn Back, links, reload and tab close are still asked about.
 *
 * Once nothing is unsaved the guard is left where it is, and a Back that takes
 * it off goes on back at once, so the press is never spent on nothing.
 *
 * Inside the native shell this does nothing, as `useSheetHistory` does not:
 * Android's hardware back is answered by `lib/native/back-button.ts`.
 */
export const GUARD_STATE_KEY = "nfUnsaved";

type EntryLike = { key: string; index: number };
type NavigationWithKeys = {
  currentEntry: EntryLike | null;
  entries: () => ReadonlyArray<EntryLike>;
};

function navigationWithKeys(): NavigationWithKeys | null {
  if (typeof window === "undefined") return null;
  const nav = (window as unknown as { navigation?: Partial<NavigationWithKeys> }).navigation;
  if (!nav || typeof nav.entries !== "function" || !nav.currentEntry || typeof nav.currentEntry.key !== "string") return null;
  return nav as NavigationWithKeys;
}

/** Whether this history entry is a guard this hook pushed. */
export function isGuardEntry(state: unknown): boolean {
  return Boolean(state && typeof state === "object" && (state as Record<string, unknown>)[GUARD_STATE_KEY] === true);
}

export function useBackGuard(dirty: boolean, onBack: () => void): void {
  const guard = useRef<{ key: string; path: string } | null>(null);
  const onBackRef = useRef(onBack);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    onBackRef.current = onBack;
    dirtyRef.current = dirty;
  });
  /* A pop re-runs the arming check: after Stay, and after a sheet closes. */
  const [pops, setPops] = useState(0);

  /* Arm: push the guard while something is unsaved and none is on top. */
  useEffect(() => {
    const nav = navigationWithKeys();
    if (!nav || looksNative()) return;
    const current = nav.currentEntry;
    if (!current) return;
    /* Back on a guard left by an earlier visit: adopt it rather than stack another. */
    if (!guard.current && isGuardEntry(window.history.state)) {
      guard.current = { key: current.key, path: window.location.pathname };
    }
    if (!dirty || guard.current) return;
    /* Never over an open sheet: its entry is its own to take back, and a
       guard above it would be the entry it took. The pop that closes it
       brings this check round again. */
    if (overlayIsOpen() || readSheetIds(window.history.state).length > 0) return;
    window.history.pushState({ ...(window.history.state ?? {}), [GUARD_STATE_KEY]: true }, "");
    const pushed = nav.currentEntry;
    if (pushed) guard.current = { key: pushed.key, path: window.location.pathname };
  }, [dirty, pops]);

  /* Watch: a pop that lands behind the guard is the browser's Back. */
  useEffect(() => {
    const nav = navigationWithKeys();
    if (!nav || looksNative()) return;
    const onPop = () => {
      const armed = guard.current;
      const current = nav.currentEntry;
      if (armed && current && current.key !== armed.key) {
        const entry = nav.entries().find((candidate) => candidate.key === armed.key);
        if (!entry) {
          /* A newer push replaced it: nothing of ours is left to take off. */
          guard.current = null;
        } else if (entry.index > current.index) {
          guard.current = null;
          /* Left for another address (a back control's `history.go(-n)`
             steps over the guard): that leave was already asked about. */
          if (window.location.pathname === armed.path) {
            if (dirtyRef.current) onBackRef.current();
            else window.history.back();
          }
        }
      }
      setPops((n) => n + 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}
