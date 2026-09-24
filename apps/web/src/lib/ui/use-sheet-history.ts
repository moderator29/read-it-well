"use client";

import { useEffect, useRef } from "react";
import { looksNative } from "@/lib/native/platform";

/**
 * UX-19: BACK CLOSES AN OPEN SHEET, ON THE WEB.
 *
 * A sheet pushed no history entry, so the browser's Back (the Android Chrome
 * gesture on the website or the installed PWA) skipped the sheet and left
 * the page. Opening a sheet now pushes one entry that carries a marker for
 * this sheet; Back pops it and the sheet closes; closing the sheet any other
 * way takes its own entry back off, so history is left as it was found.
 *
 * Inside the native shell this does nothing: Android's hardware Back is
 * already handled there (`lib/native/back-button.ts` closes the top overlay),
 * and handling it twice would close two things per press.
 *
 * A link followed from inside the sheet pushes the router's own entry, which
 * carries no marker, so the close that follows the navigation does NOT go
 * back (that would undo the navigation). The spent sheet entry stays behind
 * it, at the same address, which costs one extra Back and nothing else.
 */
const MARKER = "nfSheet";

type MarkedState = Record<string, unknown> & { [MARKER]?: string };

export function readSheetMarker(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as MarkedState)[MARKER];
  return typeof value === "string" ? value : null;
}

export function useSheetHistory(open: boolean, id: string, onClose: () => void): void {
  const pushed = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || looksNative()) return;

    const current = (window.history.state ?? {}) as MarkedState;
    window.history.pushState({ ...current, [MARKER]: id }, "");
    pushed.current = true;

    const onPop = (event: PopStateEvent) => {
      if (!pushed.current) return;
      if (readSheetMarker(event.state) === id) return;
      /* Back took our entry off: the sheet goes with it. */
      pushed.current = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      /* Closed by its own controls (or unmounted) while our entry is still on
         top: take it back off. Anything else on top, and we leave history
         alone. */
      if (pushed.current) {
        pushed.current = false;
        /* A tick later, so a navigation made in the same handler as the close
           (close, then router.push) has pushed its own entry first and is
           left alone. */
        window.setTimeout(() => {
          if (readSheetMarker(window.history.state) === id) window.history.back();
        }, 0);
      }
    };
  }, [open, id]);
}
