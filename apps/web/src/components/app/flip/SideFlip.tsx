"use client";

import type { ShellDictionary } from "@/lib/i18n/shell-dictionary";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { SIDE_HOME, writeSideCookie, type Side } from "@/lib/side.constants";
import { SideCover } from "./SideCover";

/**
 * The flip: the product's signature interaction.
 *
 * The founder's brief was that switching sides should feel like "a ring
 * turning to another side, or me turning my phone back". This is that, done
 * honestly on the web: a two-phase CSS 3D flip of the live viewport with a
 * DESIGNED back face, so nothing ever waits on the network to have something
 * to show.
 *
 *   1. PRESS (`--nf-duration-fast`, `--nf-ease-press`). The viewport card
 *      lifts: scales to 0.94, grows a radius and a shadow, and the page behind
 *      darkens. Input is shielded from this frame on (the card is `inert`, a
 *      transparent shield covers the stage) and the live region says
 *      "Switching to Stays". In the same tick the cookie is written and
 *      `startTransition(router.push + router.refresh)` fires: the exact recipe
 *      `ModeSwitcher` already ships.
 *   2. TURN (`--nf-duration-deliberate`, `--nf-ease-entrance`). The lifted
 *      card rotates on Y under a 1200px perspective, both faces
 *      `backface-visibility: hidden`. The front is the outgoing app, live until
 *      90 degrees. The back is the incoming side's cover, pre-mounted so it
 *      never pops. Property to Stays turns one way, Stays to Property turns
 *      back: the two sides are two faces of one object, not two destinations.
 *   3. HOLD, then REVEAL. When the turn lands the cover is what you see. The
 *      card snaps back to identity behind an identical fixed cover (invisible,
 *      the cover is opaque), and the moment the pushed route has committed the
 *      cover fades up into the real page. If the network is slow the cover
 *      holds on a quiet shimmer rather than replaying anything, with a hard
 *      ceiling so a dead connection never traps the reader.
 *
 * THE FRONT FACE IS THE REAL APP, not a snapshot. While the stage is fixed the
 * front face becomes the scroll container (its `scrollTop` is set to where the
 * page was) so the region being turned is the region the reader was looking
 * at, and fixed chrome (the dock) stays pinned to the card because the card is
 * its containing block for the duration. `overflow: hidden` cannot sit on the
 * same element as `preserve-3d` (it flattens it), so the card preserves and
 * each face clips.
 *
 * REDUCED MOTION: no rotation, no scale. The cover crossfades in, holds, and
 * crossfades out. Same lockout, same announcement, same ceiling. The duration
 * tokens collapse to 1ms globally under the media query, and this component
 * reads the tokens rather than hardcoding numbers, so its timers collapse
 * with them.
 *
 * FIRST FLIP: one bounded ceremony. The side name types in and the cover
 * holds one `--nf-duration-slow` longer. Stored in localStorage with
 * try/catch; losing it costs one extra nice moment and nothing else.
 *
 * No dependency on `startViewTransition`. Plain transforms, so it behaves the
 * same in every browser. The CSS (`side-flip.css`) lands in the same change as
 * this component, per the post mortems in `motion.css`.
 */

type Phase = "idle" | "lift" | "turn" | "hold" | "reveal";

type FlipApi = {
  /** Turn the app over to the other side. A no-op while a flip is in flight. */
  flip: (to: Side) => void;
  /** True from press to settle. Controls disable themselves on it. */
  pending: boolean;
  /** The side the shell is currently painted as. */
  side: Side;
};

const SideFlipContext = createContext<FlipApi | null>(null);

/** The same API, or null outside a `<SideFlip>` (a preview, a test). */
export function useOptionalSideFlip(): FlipApi | null {
  return useContext(SideFlipContext);
}

export function useSideFlip(): FlipApi {
  const api = useContext(SideFlipContext);
  if (!api) throw new Error("useSideFlip must be used inside <SideFlip>");
  return api;
}

const FIRST_FLIP_KEY = "nf_side_flipped";
/** The hold never outlives this; a dead connection reveals whatever is there. */
const HOLD_CEILING_MS = 8000;

/** Read a duration token in milliseconds, so reduced motion collapses these timers too. */
function tokenMs(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return fallback;
  return raw.endsWith("ms") ? value : value * 1000;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function firstFlip(): boolean {
  try {
    if (localStorage.getItem(FIRST_FLIP_KEY)) return false;
    localStorage.setItem(FIRST_FLIP_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export function SideFlip({
  side,
  t,
  children,
}: {
  side: Side;
  t: ShellDictionary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<Side | null>(null);
  const [ceremony, setCeremony] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [scrollAt, setScrollAt] = useState(0);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    const timerList = timers.current;
    return () => {
      for (const id of timerList) window.clearTimeout(id);
    };
  }, []);

  /*
   * While the stage is fixed the front face is the scroll container, so it
   * must show the region the reader was looking at. A layout effect, so the
   * scroll is set before the lifted frame paints.
   */
  useLayoutEffect(() => {
    if (phase === "lift" && frontRef.current) {
      frontRef.current.scrollTop = scrollAt;
    }
  }, [phase, scrollAt]);

  const flip = useCallback(
    (to: Side) => {
      if (phase !== "idle" || to === side) return;
      const motionOff = prefersReducedMotion();
      const first = firstFlip();
      setReduced(motionOff);
      setCeremony(first && !motionOff);
      setTarget(to);
      setScrollAt(window.scrollY);
      setAnnouncement(
        t.side.switching.replace("{side}", to === "stays" ? t.side.staysName : t.side.propertyName),
      );
      setPhase("lift");

      /* The cookie and the navigation fire at press. The pushed route renders
         under the new cookie and the refresh re-renders the server tree, so
         the shell that comes back is already the other side's. */
      writeSideCookie(to);
      startTransition(() => {
        /* `nf-flip` tells the route transition (RouteTransition.tsx) to stand
           down: the turn is the motion, and a page slide under it would be a
           second one. */
        router.push(SIDE_HOME[to], { transitionTypes: ["nf-flip"] });
        router.refresh();
      });

      const lift = tokenMs("--nf-duration-fast", 160);
      const turn = tokenMs("--nf-duration-deliberate", 620);
      later(() => setPhase("turn"), lift);
      later(() => setPhase("hold"), lift + turn);
    },
    [phase, side, t, router, later],
  );

  /*
   * SETTLE. The hold ends when the pushed segment has committed: the pathname
   * has moved onto the target side's root and the transition is no longer
   * pending. The ceremony adds one beat; the ceiling ends any hold.
   */
  const landed = target !== null && pathname.startsWith(SIDE_HOME[target]);
  useEffect(() => {
    if (phase !== "hold") return;
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      setPhase("reveal");
      const out = tokenMs("--nf-duration-base", 240);
      later(() => {
        setPhase("idle");
        setTarget(null);
        setCeremony(false);
        setAnnouncement(
          t.side.flipped.replace(
            "{side}",
            target === "stays" ? t.side.staysName : t.side.propertyName,
          ),
        );
      }, out);
    };
    let id: number;
    if (landed && !isPending) {
      id = window.setTimeout(reveal, ceremony ? tokenMs("--nf-duration-slow", 380) : 0);
    } else {
      id = window.setTimeout(reveal, HOLD_CEILING_MS);
    }
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [phase, landed, isPending, ceremony, later, t, target]);

  const api = useMemo<FlipApi>(
    () => ({ flip, pending: phase !== "idle", side }),
    [flip, phase, side],
  );

  const active = phase !== "idle";
  const dir = target === "stays" ? -1 : 1;

  return (
    <SideFlipContext.Provider value={api}>
      <div
        className="nf-flip-stage"
        data-phase={phase}
        data-reduced={reduced || undefined}
        style={{ "--nf-flip-dir": dir } as React.CSSProperties}
      >
        <div className="nf-flip-card">
          <div ref={frontRef} className="nf-flip-face nf-flip-face--front" inert={active}>
            {children}
          </div>
          {/* The back face, mounted only while a flip is in flight. The mark it
              needs is already in the document (the SideSwitch coin carries the
              other side's object), so it is warm in the cache before the turn. */}
          {target && (phase === "lift" || phase === "turn") && (
            <SideCover
              side={target}
              t={t}
              ceremony={ceremony}
              className="nf-flip-face nf-flip-face--back"
            />
          )}
        </div>
        {/* The fixed twin of the back face: covers the snap back to identity
            and fades out into the real page. */}
        {target && (phase === "hold" || phase === "reveal") && (
          <SideCover
            side={target}
            t={t}
            ceremony={ceremony}
            shimmer={phase === "hold" && (!landed || isPending)}
            settled
            className="nf-flip-cover--fixed"
          />
        )}
        {active && <div className="nf-flip-shield" aria-hidden="true" />}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </SideFlipContext.Provider>
  );
}
