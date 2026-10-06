"use client";

import { useEffect, useRef, type RefObject } from "react";
import { feedback } from "@/lib/ui/feedback";

/**
 * THE FORM ERROR (the motion system's "form error", north star motion 24): the
 * refused field shakes 4px once, `whip` at 160ms, and its message fades in
 * beneath it. NEVER A DIALOG. The animation is CSS (auth.css, "MOTION"), keyed
 * by `data-shake`; this decides WHICH fields and WHEN, once per refusal.
 *
 * Pass the form's ref (or the screen's holding it) and tell the hook, after each answer, whether that answer refused something:
 *
 *   answer   anything that changes identity on every answer (the action's
 *            state object), so a second refusal with the same words still
 *            shakes again
 *   refused  whether this answer was a refusal
 *   tick     a counter for refusals the browser made before anything was sent
 *            (the sign-up form's own early checks)
 *   felt     whether the refusal also earns the error haptic. Only a genuine
 *            failure does (craft doctrine 6): a wrong password, yes; a
 *            missing field, no
 *
 * WHICH FIELDS: every field that carries `aria-invalid` (each one's message
 * is beneath it). A refusal that names no field (a wrong password is one
 * neutral sentence for the whole form) shakes the password field if the form
 * has one, else the first field, so the motion still says where to look.
 * `data-shake` alternates a and b so each refusal restarts the animation
 * instead of matching a rule that already ran.
 *
 * No state is set and nothing re-renders: the only writes are to the DOM and
 * to the haptic channel. Calm and Off draw no shake (auth.css answers it).
 */
/* A text field's box, or a tick's whole row (the terms and the 18+ statement). */
const FIELD_BOX = ".nf-auth-field__box";
const TICK_ROW = "label.nf-tap";
const BOX = [FIELD_BOX, TICK_ROW].join(",");

export function useRefusalShake(
  scope: RefObject<HTMLElement | null>,
  answer: unknown,
  refused: boolean,
  { tick = 0, felt = false }: { tick?: number; felt?: boolean } = {},
): void {
  const lastTick = useRef(tick);

  useEffect(() => {
    /* The browser's own refusals arrive as a new `tick`, whatever the last
       server answer was. */
    const local = tick !== lastTick.current;
    lastTick.current = tick;
    if (!refused && !local) return;
    const root = scope.current;
    if (!root) return;
    const invalid = Array.from(root.querySelectorAll<HTMLElement>('[aria-invalid="true"]'));
    let targets = Array.from(
      new Set(invalid.map((el) => el.closest<HTMLElement>(BOX)).filter((el): el is HTMLElement => el !== null)),
    );
    if (targets.length === 0) {
      const boxes = Array.from(root.querySelectorAll<HTMLElement>(FIELD_BOX));
      const password = boxes.find((box) => box.querySelector('input[type="password"]'));
      const fallback = password ?? boxes[0];
      targets = fallback ? [fallback] : [];
    }
    for (const box of targets) box.dataset.shake = box.dataset.shake === "a" ? "b" : "a";
    if (felt && targets.length > 0) feedback("error");
  }, [scope, answer, refused, tick, felt]);
}
