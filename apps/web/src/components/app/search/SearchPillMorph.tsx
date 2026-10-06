"use client";

import { animate, m, useMotionValue } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, type FormHTMLAttributes, type ReactNode } from "react";
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

/** The results header's search form, landing from wherever the pill was. */
export function PillLanding({
  path,
  children,
  className,
  ...form
}: { path: string; children: ReactNode; className?: string } & Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "children" | "className" | "style" | "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart"
>) {
  const ref = useRef<HTMLFormElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);

  /* Layout effect, so the first painted frame is already the origin's. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = readRecord(path);
    /* Read the gate here rather than through the hook: during hydration the
       hook still holds the server's "may move" answer. */
    if (!from || motionQuiet()) return;
    const to = el.getBoundingClientRect();
    if (to.width === 0 || to.height === 0) return;
    x.set(from.x - to.left);
    y.set(from.y - to.top);
    scaleX.set(from.w / to.width);
    scaleY.set(from.h / to.height);
    const ease = EASE.land;
    const options = { duration: LAND_MS / 1000, ease } as const;
    const runs = [animate(x, 0, options), animate(y, 0, options), animate(scaleX, 1, options), animate(scaleY, 1, options)];
    /* The first touch or focus ends the flight where the field belongs. */
    const settle = () => {
      for (const run of runs) run.stop();
      x.set(0);
      y.set(0);
      scaleX.set(1);
      scaleY.set(1);
    };
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
    <m.form
      ref={ref}
      {...form}
      className={className}
      style={{ x, y, scaleX, scaleY, transformOrigin: "0 0" }}
      data-pill-landing=""
    >
      {children}
    </m.form>
  );
}
