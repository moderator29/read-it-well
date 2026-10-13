"use client";

import { useSyncExternalStore } from "react";
import { ambientAllowed, motionQuiet } from "@/lib/motion/gate";
import { MOTION_EVENT } from "@/lib/motion/motion-pref";

/**
 * The motion setting, live, for components that move in script (Track M).
 *
 *   quiet    the system asks for less motion, or Settings > Appearance >
 *            Motion is Calm or Off: draw the final state and stop.
 *   ambient  a background may move on its own: not quiet, Living
 *            backgrounds on, data saver off.
 *
 * Both come from `lib/motion/gate.ts`, the one answer the stylesheets and
 * the cinema kit also use, and are re-read when the setting changes
 * (`MOTION_EVENT`), when the root's own motion or data-saver attributes
 * change by any hand (a `MutationObserver`, so a reader the event does not
 * reach is still right, D49.3), or the system preference flips, with no
 * reload. The
 * server snapshot is "may move", so the first paint is the normal page and
 * a quiet reader's client settles it on hydration.
 */
type Gate = { quiet: boolean; ambient: boolean };

const SERVER: Gate = { quiet: false, ambient: true };
let cached: Gate = SERVER;

function read(): Gate {
  const quiet = motionQuiet();
  const ambient = ambientAllowed();
  if (cached.quiet !== quiet || cached.ambient !== ambient) cached = { quiet, ambient };
  return cached;
}

/** The root attributes `gate.ts` reads. */
const GATE_ATTRIBUTES = ["data-motion", "data-motion-ambient", "data-save-data"];

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.addEventListener(MOTION_EVENT, onChange);
  mq.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: GATE_ATTRIBUTES });
  return () => {
    window.removeEventListener(MOTION_EVENT, onChange);
    mq.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

export function useMotionGate(): Gate {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}

/**
 * The same decision for an effect that sets itself up imperatively: runs
 * `setup` now and again whenever the setting changes, tearing the previous
 * setup down first. `setup` returns its own cleanup, or nothing when the
 * gate says it should not run.
 */
export function onMotionGate(setup: () => (() => void) | void): () => void {
  let teardown: (() => void) | void = setup();
  const again = () => {
    if (teardown) teardown();
    teardown = setup();
  };
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.addEventListener(MOTION_EVENT, again);
  mq.addEventListener("change", again);
  return () => {
    window.removeEventListener(MOTION_EVENT, again);
    mq.removeEventListener("change", again);
    if (teardown) teardown();
  };
}
