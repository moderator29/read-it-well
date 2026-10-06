"use client";

import { animate, motionValue } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type FormHTMLAttributes, type ReactNode } from "react";
import { motionQuiet } from "@/lib/motion/gate";
import { EASE } from "@/lib/motion/ease";

/**
 * SEARCH TO RESULTS: THE PILL BECOMES THE HEADER (MOTION_SYSTEM section 5,
 * "Search to results"; "the morphing pill is the signature of this
 * transition and it is worth the care").
 *
 * The search pill on home (and on the Stays home) is a plain GET form, so a
 * search works with no script and lands as an ordinary page load. That rules
 * out a shared `layoutId`: the two pills are never in one React tree. So the
 * movement is MEASURED, the way WAVE2 asks for shared movement without
 * `layoutId`:
 *
 *   1. `PillOrigin` sits inside the origin form. On submit it writes the
 *      form's rectangle and the moment it left to `sessionStorage`.
 *   2. `PillLanding` IS the results header's search form. On mount it reads
 *      that rectangle, measures itself, and starts drawn where the pill was
 *      (a translate plus a scale from its top-left corner), then glides home
 *      on `land` at 380ms, the route transition's own timing.
 *
 * WHY FRAMER HERE AND NOT CSS. The landing is interruptible: a person who
 * taps the field mid-flight is reaching for it, so the field must be where
 * their finger is. `animate()` on motion values stops cleanly and jumps to
 * rest on the first pointer or focus, which a CSS animation cannot do without
 * reading its own computed transform back. Everything else on this surface
 * (the chips' crossfade, the results' stagger) is CSS on a known track.
 *
 * NO `m` ELEMENT. LazyMotion's features arrive in a later chunk, and an `m`
 * element draws only its first frame until they do (the Session 3 audit; the
 * ported components were moved off it in the same way). The form is a plain
 * `<form>`; the motion values are plain objects that need no features, and
 * their changes are written to the element's own style from the layout
 * effect, so the first painted frame is already the origin's and the flight
 * runs whether or not the renderer has loaded. A form drawn by the
 * server's own HTML (a full document load, which is what a native GET
 * submit is) never flies: it has already painted at rest. `data-pill-landed` says a
 * flight happened, so the chips' crossfade (catalogue.css) runs only after
 * one.
 *
 * WHAT IT NEVER DOES. It never delays the page: the field is interactive from
 * the first frame and the motion is transform only. A stale record (older than
 * 2.5 seconds, or for another path) is ignored, so a reload or a back
 * navigation never replays it. Reduced motion, Calm and Off read `quiet` and
 * the field simply appears (`motionQuiet`), because `MotionConfig` does not
 * stop `animate()`.
 */

const KEY = "nf-search-pill";
const FRESH_MS = 2500;
const LAND_MS = 380;

type PillRecord = { x: number; y: number; w: number; h: number; at: number; path: string };

function readRecord(path: string): PillRecord | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const record = JSON.parse(raw) as PillRecord;
    if (record.path !== path || Date.now() - record.at > FRESH_MS) return null;
    if (!(record.w > 0 && record.h > 0)) return null;
    return record;
  } catch {
    return null;
  }
}

/**
 * Drawn inside the origin form: records where the pill was when it was sent.
 * Renders an empty, hidden span so it can find its form without a ref prop
 * crossing the server boundary.
 */
export function PillOrigin({ path }: { path: string }) {
  const anchor = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const onSubmit = () => {
      const box = form.getBoundingClientRect();
      try {
        const record: PillRecord = { x: box.left, y: box.top, w: box.width, h: box.height, at: Date.now(), path };
        window.sessionStorage.setItem(KEY, JSON.stringify(record));
      } catch {
        /* Storage refused (a private window): the results simply appear. */
      }
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [path]);
  return <span ref={anchor} hidden />;
}

/** Nothing external to subscribe to: only the server-or-client snapshot is read. */
const noSubscription = () => () => {};

/** The results header's search form, landing from wherever the pill was. */
export function PillLanding({
  path,
  children,
  className,
  ...form
}: { path: string; children: ReactNode; className?: string } & Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "children" | "className" | "style"
>) {
  const ref = useRef<HTMLFormElement | null>(null);
  /*
   * WAS THIS FORM DRAWN BY THE SERVER'S HTML, OR BY A CLIENT NAVIGATION?
   * `useSyncExternalStore` answers it: while React hydrates server markup it
   * reads the server snapshot (true), and when the component is first drawn
   * in the browser by a client-side arrival it reads the client one (false).
   * Held in a ref, so it is the answer for THIS mount only. A server-drawn
   * form has already painted at rest, with its chips visible; jumping it back
   * to the origin at hydration and flying it home would blink the pill and
   * restart the chips' fade from nothing, on exactly the slow phones where
   * hydration is late. (`performance` paint entries cannot say this: the
   * first-contentful-paint entry outlives every client navigation.)
   */
  const fromServerHtml = useRef(
    useSyncExternalStore(
      noSubscription,
      () => false,
      () => true,
    ),
  );

  /* Layout effect, so the first painted frame is already the origin's. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* Always read, so a stale record is cleared even when no flight plays. */
    const from = readRecord(path);
    if (fromServerHtml.current) return;
    /* Read the gate here rather than through the hook: during hydration the
       hook still holds the server's "may move" answer. */
    if (!from || motionQuiet()) return;
    const to = el.getBoundingClientRect();
    if (to.width === 0 || to.height === 0) return;
    const x = motionValue(from.x - to.left);
    const y = motionValue(from.y - to.top);
    const scaleX = motionValue(from.w / to.width);
    const scaleY = motionValue(from.h / to.height);
    const write = () => {
      el.style.transformOrigin = "0 0";
      el.style.transform = `translate(${x.get()}px, ${y.get()}px) scale(${scaleX.get()}, ${scaleY.get()})`;
    };
    const unsubscribe = [x, y, scaleX, scaleY].map((value) => value.on("change", write));
    el.setAttribute("data-pill-landed", "");
    write();
    const ease = EASE.land;
    const options = { duration: LAND_MS / 1000, ease } as const;
    const runs = [animate(x, 0, options), animate(y, 0, options), animate(scaleX, 1, options), animate(scaleY, 1, options)];
    /* Back at rest the element carries no transform at all. */
    let rested = false;
    const rest = () => {
      if (rested) return;
      rested = true;
      for (const stop of unsubscribe) stop();
      el.style.transform = "";
      el.style.transformOrigin = "";
    };
    /* The first touch or focus ends the flight where the field belongs. */
    const settle = () => {
      for (const run of runs) run.stop();
      rest();
    };
    Promise.all(runs).then(rest, rest);
    el.addEventListener("pointerdown", settle, { once: true });
    el.addEventListener("focusin", settle, { once: true });
    return () => {
      el.removeEventListener("pointerdown", settle);
      el.removeEventListener("focusin", settle);
      settle();
    };
    /* Once per mount: a later render is the same field at rest. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form ref={ref} {...form} className={className} data-pill-landing="">
      {children}
    </form>
  );
}
