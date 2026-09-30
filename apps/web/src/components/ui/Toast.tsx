"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dismissToast, toast as showToast } from "@/lib/ui/toast";

/**
 * The toast, and until now there was not one.
 *
 * Four surfaces had each invented their own. `ProfileShare.tsx`,
 * `ProfileMenu.tsx` and `StoryViewer.tsx` all held a `useState<string | null>`,
 * all ran their own `setTimeout` to clear it, all rendered
 * `<p role="status" className="nf-social-toast">`, and all three picked a
 * different dismissal delay (4000, 5000, 4000). `IntentTune.tsx:194` invented a
 * fifth shape entirely: an inline block with its own border, its own padding
 * and its own colour, stacked in the page rather than floating, so the same
 * event reads as a different kind of message depending on which screen fired
 * it. That is the uniqueness failure the research names, in miniature, in one
 * control.
 *
 * So: one material, one timing, one set of semantics, and the tone carried as a
 * PROP rather than as a second component. Two tones are both legitimate here.
 * A confirmation and a failure are not the same event and must not read the
 * same, but they are the same object.
 *
 * SEMANTICS, AND THEY ARE NOT INTERCHANGEABLE. `role="status"` is a polite live
 * region: a screen reader finishes what it is saying and then reads the toast.
 * `role="alert"` interrupts. A copied link is polite; a failed action is not,
 * because the person is about to act on the belief that it worked. The tone
 * picks the role, so a caller cannot get the pairing wrong by hand.
 *
 * THE MATERIAL IS `.nf-social-toast`, which is a platform object living in a
 * social stylesheet. It is worn rather than re-declared here, because the
 * stylesheets belong to another group this week. The rename to `.nf-toast` and
 * the move out of `app/social-feed.css` is handed over in the report rather
 * than taken.
 *
 * REDUCED MOTION is inherited: the class carries no animation of its own, and
 * the auto-dismiss is a state change rather than a transition, so there is
 * nothing here for `prefers-reduced-motion` to turn off. The timer is a
 * courtesy, not the only way out: the message is also readable for as long as
 * it is on screen and the caller may dismiss it early.
 */

export type ToastTone = "neutral" | "success" | "error";

/** The default dwell. Long enough to read a sentence, short enough not to sit
 *  over the dock while somebody is trying to use it. */
export const TOAST_DURATION_MS = 4000;


export type ToastProps = {
  /** The whole message. One sentence; a toast is not a panel. */
  message: string;
  tone?: ToastTone;
  /**
   * Forwarded so the existing test hooks survive the migration. Without it
   * every migrated call site would have to wrap the toast in a span, which is
   * the same defect `Switch` already fixed for itself.
   */
  "data-testid"?: string;
  className?: string;
};

export function Toast({
  message,
  tone = "neutral",
  "data-testid": testId,
}: ToastProps) {
  /*
   * DRAWN BY THE ONE HOST NOW (details pass, 30 September 2026). This used to
   * render its own `<p class="nf-social-toast">` wherever the caller sat, so a
   * toast fired inside a sheet was painted by that sheet and two could stack.
   * It now hands the message to `lib/ui/toast.ts`, and `ToastHost` (root
   * layout) draws it in the one place, with swipe to dismiss. The caller's
   * `useToast` still decides how long it stays: unmounting takes it down.
   */
  useEffect(() => {
    const id = showToast(message, {
      tone,
      durationMs: 60_000,
      ...(testId ? { "data-testid": testId } : {}),
    });
    return () => dismissToast(id);
  }, [message, tone, testId]);
  return null;
}

export type ToastState = { message: string; tone: ToastTone };

/**
 * The state behind a toast, so a call site does not hand-roll the timer again.
 *
 * Returns the current toast or null, a `show` that replaces whatever is up, and
 * a `dismiss`. The timer is restarted on every `show`, which is what a person
 * expects when two things happen in quick succession: the second message gets
 * its own full dwell rather than inheriting the remainder of the first one's.
 */
export function useToast(durationMs: number = TOAST_DURATION_MS) {
  const [toast, setToast] = useState<ToastState | null>(null);
  /* A counter rather than the message itself, so showing the SAME message twice
     restarts the timer. Keying the effect on the text alone would not. */
  const [tick, setTick] = useState(0);
  const timerRef = useRef<number | null>(null);

  const show = useCallback((message: string, tone: ToastTone = "neutral") => {
    setToast({ message, tone });
    setTick((n) => n + 1);
  }, []);

  const dismiss = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), durationMs);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    /* `tick` is the restart signal; `toast` is read but deliberately not the
       only dependency, for the reason above. */
  }, [toast, tick, durationMs]);

  return { toast, show, dismiss } as const;
}
