"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/design-system/brand/Logo";
import { THRESHOLD_EVENT, thresholdAllowed, type ThresholdKind } from "@/lib/motion/threshold";

/**
 * THE STAGE THE THRESHOLD MOMENTS PLAY ON (Track M, 25 September 2026).
 *
 * Mounted once in the root layout, so it survives the navigation it is
 * covering: the "going" half plays on the page being left, the route changes
 * underneath it, and the "arriving" half plays over the page being entered.
 *
 *   door    A new account, verified. A tick draws, "Welcome to Vallo." comes
 *           out of depth, an arch of light opens from a slit, and the view
 *           moves THROUGH it; on the other side the light falls away and the
 *           first page settles forward out of the glow.
 *   leave   Signing out. The page recedes into depth, two panels close on
 *           the mark, and they part again on the front door.
 *   return  Back after more than ten minutes away. No overlay: the page
 *           settles forward once and a line of light crosses the top. Less
 *           than ten minutes and nothing happens, so it never nags.
 *
 * `playThreshold` (lib/motion/threshold.ts) is how the app asks for one. None
 * of them runs under reduced motion or data saving, and every one is
 * decoration: `aria-hidden`, and `pointer-events: none` once the going half
 * is done, so nothing can be trapped behind it.
 */
const ARRIVE_MS = 900;
const GIVE_UP_MS = 5000;
const RETURN_AFTER_MS = 10 * 60 * 1000;
const RETURN_MS = 900;
const SPLASH_GIVE_UP_MS = 4000;

export function ThresholdStage({ welcome }: { welcome: string }) {
  const pathname = usePathname();
  const [play, setPlay] = useState<{ kind: ThresholdKind; from: string; at: number } | null>(null);
  const hiddenAt = useRef<number | null>(null);
  /* Going until the route changes under it, arriving after. Derived rather
     than stored, so the change of phase is the change of route itself. */
  const arriving = play !== null && pathname !== play.from;

  useEffect(() => {
    const onPlay = (event: Event) => {
      const kind = (event as CustomEvent<ThresholdKind>).detail;
      setPlay({ kind, from: window.location.pathname, at: Date.now() });
    };
    window.addEventListener(THRESHOLD_EVENT, onPlay);
    return () => window.removeEventListener(THRESHOLD_EVENT, onPlay);
  }, []);

  /* The arrival ends itself; a navigation that never comes is given up on. */
  useEffect(() => {
    if (play === null) return;
    const root = document.documentElement;
    if (arriving) root.dataset.arrive = play.kind;
    const timer = window.setTimeout(
      () => {
        delete root.dataset.arrive;
        setPlay(null);
      },
      arriving ? ARRIVE_MS : GIVE_UP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [play, arriving]);

  /* The splash (root layout) hands the page back: after its door has opened
     the flag moves to "done", which hides it for good and releases the
     `--nf-splash-hold` delay so later entrances start on time. */
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.splash !== "on") return;
    const splash = document.querySelector(".nf-splash");
    const done = () => {
      root.dataset.splash = "done";
    };
    /* Released by the splash's own last keyframe, so a slow first frame can
       never cut it short; the timer only covers a splash that never paints. */
    const onEnd = (event: Event) => {
      if ((event as AnimationEvent).animationName === "nf-splash-gone") done();
    };
    /*
     * A PAGE THAT HYDRATES LATE MISSES THE EVENT. On a slow phone (or a cold
     * dev compile) the splash's last keyframe can end before this listener
     * exists, and the flag then stayed "on" for the life of the page. That
     * is not only a stuck flag: the page's own `both`-filled entrance leaves
     * `#main` holding a transform and a filter, and every `position: fixed`
     * child (the listing's pinned price bar, sheets) was laid out against
     * `#main` instead of the screen, a whole page down. So the state is read
     * as well as listened for: a finished (or absent) last keyframe releases
     * now. Filled animations still count in `getAnimations`, which is why
     * the old "no animations left" fallback never fired.
     */
    const settled = () => {
      const gone = splash
        ?.getAnimations()
        .find((a) => (a as CSSAnimation).animationName === "nf-splash-gone");
      return !gone || gone.playState === "finished";
    };
    if (!splash || settled()) {
      done();
      return;
    }
    splash.addEventListener("animationend", onEnd);
    const timer = window.setTimeout(() => {
      if (settled()) done();
    }, SPLASH_GIVE_UP_MS);
    return () => {
      splash?.removeEventListener("animationend", onEnd);
      window.clearTimeout(timer);
    };
  }, []);

  /* Coming back to the app. */
  useEffect(() => {
    let timer = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const away = hiddenAt.current === null ? 0 : Date.now() - hiddenAt.current;
      hiddenAt.current = null;
      if (away < RETURN_AFTER_MS || !thresholdAllowed()) return;
      const root = document.documentElement;
      root.dataset.arrive = "return";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (root.dataset.arrive === "return") delete root.dataset.arrive;
      }, RETURN_MS);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer);
    };
  }, []);

  if (play === null) return null;

  return (
    <div
      className={`nf-threshold nf-threshold--${play.kind}`}
      data-phase={arriving ? "arriving" : "going"}
      aria-hidden="true"
    >
      <div className="nf-threshold__veil" />
      {play.kind === "door" ? (
        <>
          <div className="nf-threshold__arch" />
          <div className="nf-threshold__center">
            <svg className="nf-threshold__tick" viewBox="0 0 64 64" width="64" height="64">
              <circle cx="32" cy="32" r="29" pathLength={1} />
              <path d="M20 33.5 28.5 42 45 24" pathLength={1} />
            </svg>
            <p className="nf-threshold__words">{welcome}</p>
          </div>
        </>
      ) : (
        <>
          <div className="nf-threshold__panel nf-threshold__panel--a" />
          <div className="nf-threshold__panel nf-threshold__panel--b" />
          <div className="nf-threshold__center">
            <LogoMark size={56} />
          </div>
        </>
      )}
    </div>
  );
}
