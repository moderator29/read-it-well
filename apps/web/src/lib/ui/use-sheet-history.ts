"use client";

import { useEffect, useRef } from "react";
import { looksNative } from "@/lib/native/platform";

/**
 * UX-19: BACK CLOSES AN OPEN SHEET, ON THE WEB.
 *
 * A sheet pushed no history entry, so the browser's Back (the Android Chrome
 * gesture on the website or the installed PWA) skipped the sheet and left
 * the page. Opening a sheet now pushes one entry; Back pops it and the sheet
 * closes; closing the sheet any other way takes its own entry back off, so
 * history is left as it was found.
 *
 * THE MARKER IS A STACK OF IDS, because sheets stack. A report sheet opened
 * over the comments sheet pushes an entry carrying both ids. Back pops to the
 * entry carrying only the comments' id: the report sheet's id is gone from it,
 * so the report closes, and the comments' id is still there, so the comments
 * stay. With a single id per entry the comments sheet read "not my marker"
 * and closed too, so one Back closed both.
 *
 * STRICTMODE-SAFE. The development double effect runs cleanup and then the
 * open again straight away. The cleanup's take-back is deferred a tick and
 * the re-open cancels it and reuses the entry it finds already carrying this
 * id, so the double effect costs no history and closes nothing.
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

type MarkedState = Record<string, unknown> & { [MARKER]?: string[] | string };

/** Every sheet id this history entry carries, oldest first. */
export function readSheetIds(state: unknown): string[] {
  if (!state || typeof state !== "object") return [];
  const value = (state as MarkedState)[MARKER];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return typeof value === "string" ? [value] : [];
}

/** The top sheet this entry carries, or null when it carries none. */
export function readSheetMarker(state: unknown): string | null {
  const ids = readSheetIds(state);
  return ids.length > 0 ? ids[ids.length - 1]! : null;
}

/**
 * Run `fn` once no sheet's entry is on top of history: at once when none is,
 * otherwise after the pop that takes the last one off.
 *
 * FOR A HISTORY WALK STARTED AS A SHEET CLOSES. The take-back below runs a
 * tick after the close; a `history.go(-n)` started in the same handler is
 * still in flight then, the top is still the sheet's entry, and the take-back
 * stacks one more step on the walk. In Chromium that landed one screen too far
 * back (the host wizard's "Discard" from its first step). Waiting for the
 * take-back first makes it one walk from a known place. A sheet whose entry
 * never comes off (its marker wiped by a router refresh) is waited for at
 * most `timeoutMs`.
 */
export function whenSheetsClosed(fn: () => void, timeoutMs = 1000): void {
  if (typeof window === "undefined" || readSheetIds(window.history.state).length === 0) {
    fn();
    return;
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener("popstate", onPop);
    window.clearTimeout(timer);
    fn();
  };
  const onPop = () => {
    if (readSheetIds(window.history.state).length === 0) finish();
  };
  window.addEventListener("popstate", onPop);
  const timer = window.setTimeout(finish, timeoutMs);
}

/** Take-backs deferred by a cleanup, so a StrictMode re-open can cancel them. */
const pendingTakeBack = new Map<string, number>();

export function useSheetHistory(open: boolean, id: string, onClose: () => void): void {
  const pushed = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || looksNative()) return;

    const waiting = pendingTakeBack.get(id);
    if (waiting !== undefined) {
      window.clearTimeout(waiting);
      pendingTakeBack.delete(id);
    }

    const current = (window.history.state ?? {}) as MarkedState;
    const ids = readSheetIds(current);
    if (!ids.includes(id)) {
      window.history.pushState({ ...current, [MARKER]: [...ids, id] }, "");
    }
    pushed.current = true;

    const onPop = (event: PopStateEvent) => {
      if (!pushed.current) return;
      if (readSheetIds(event.state).includes(id)) return;
      /* Back took our entry off: the sheet goes with it. */
      pushed.current = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (!pushed.current) return;
      pushed.current = false;
      /* A tick later, so a navigation made in the same handler as the close
         (close, then router.push) has pushed its own entry first and is left
         alone, and so a StrictMode re-open can cancel this. Only our own id
         is taken off: back() when our entry is on top, otherwise our id is
         removed from the entry without touching anybody else's. */
      const timer = window.setTimeout(() => {
        pendingTakeBack.delete(id);
        const state = (window.history.state ?? {}) as MarkedState;
        const now = readSheetIds(state);
        if (!now.includes(id)) return;
        if (now[now.length - 1] === id) {
          window.history.back();
        } else {
          window.history.replaceState({ ...state, [MARKER]: now.filter((v) => v !== id) }, "");
        }
      }, 0);
      pendingTakeBack.set(id, timer);
    };
  }, [open, id]);
}
