"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "./verified-payoff.css";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { isDataSaver } from "@/lib/ui/data-saver";
import { markSeen, seenOnce } from "@/lib/ui/seen-once";

/**
 * THE VERIFICATION-PASSED PAYOFF (MOTION_SYSTEM "Verification passed: shield
 * assembles, tick embosses, pop"; principle 5, the one pop).
 *
 * `children` is the screen's own shield, and the plate is left exactly as it
 * was: the small tick disc this adds on the shield's corner (the same tick the
 * path draws for a passed rung) exists ONLY while the payoff plays, and is
 * invisible at rest and in every quiet mode. When `play` is true (the page says verification really did turn passed
 * recently, `approvedRecently`) and this device has not been shown it
 * (`seenKey`, `lib/ui/seen-once.ts`), the mark plays ONCE:
 *
 *    0 to 380ms    the shield assembles: it rises 8px and scales up from 0.86
 *                  on `land`. It does NOT fade in: the page is server
 *                  rendered, so the shield is already drawn (and may have sat
 *                  drawn behind the approval sheet for seconds) when this
 *                  runs, and restarting it from opacity 0 made it vanish and
 *                  come back. Opacity is held at 1 throughout (A8)
 *   380 to 620ms   the tick embosses: the disc scales in from 0.6 and the
 *                  tick draws along its own path (paint only, the technique
 *                  the path's ticks use)
 *   620 to 800ms   the pop: 1.0 to 1.04 to 1.0 over 180ms, on the whole mark
 *   800 to 960ms   the disc fades out, leaving the plate as it was
 *
 * Opacity and transform only (the tick's stroke draw aside, as in the path).
 * Every number is a token read from the root. Reduced motion, Calm, Off and
 * data saving play nothing (the final state is what is drawn), and it WAITS
 * while a modal dialog is open over the page (the approval sheet opens on the
 * same first visit), so the one payoff is seen and not spent behind a scrim.
 * No haptic: the moment arrives with the page, not from a touch (the approval
 * sheet on this route passes none either). No words of its own: the plate's
 * title and pill say what happened.
 */
function tokenMs(root: HTMLElement, name: string, fallback: number): number {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return raw.endsWith("ms") ? value : raw.endsWith("s") ? value * 1000 : fallback;
}

export function VerifiedPayoff({
  children,
  play,
  seenKey,
}: {
  /** The shield (the plate's own object). */
  children: ReactNode;
  /** The record says verification turned passed recently enough to be news. */
  play: boolean;
  seenKey: string;
}) {
  const root = useRef<HTMLSpanElement | null>(null);
  const shield = useRef<HTMLSpanElement | null>(null);
  const badge = useRef<HTMLSpanElement | null>(null);
  const tick = useRef<SVGPathElement | null>(null);
  const { quiet } = useMotionGate();

  useEffect(() => {
    if (!play || quiet || isDataSaver() || seenOnce(seenKey)) return;
    const mark = root.current;
    const art = shield.current;
    const disc = badge.current;
    const stroke = tick.current;
    if (!mark || !art || !disc || !stroke || typeof mark.animate !== "function") return;
    const docRoot = document.documentElement;
    const css = getComputedStyle(docRoot);
    const land = css.getPropertyValue("--nf-ease-entrance").trim() || "cubic-bezier(0.16, 1, 0.3, 1)";
    const glide = css.getPropertyValue("--nf-ease-standard").trim() || "cubic-bezier(0.22, 0.61, 0.36, 1)";
    const slow = tokenMs(docRoot, "--nf-duration-slow", 380);
    const fast = tokenMs(docRoot, "--nf-duration-fast", 160);
    const base = tokenMs(docRoot, "--nf-duration-base", 240);
    const pop = 180;
    const popEnd = slow + base + pop;
    const discSpan = popEnd - slow + fast;

    let observer: MutationObserver | null = null;
    const running: Animation[] = [];
    const covered = () => document.querySelector('[aria-modal="true"]:not([data-closing])') !== null;
    const run = () => {
      markSeen(seenKey);
      /* `backwards` fill holds each part's first frame through its delay, so
         nothing shows early and nothing is left changed afterwards. */
      running.push(
        art.animate(
          [
            { transform: "translateY(0.5rem) scale(0.86)" },
            { transform: "none" },
          ],
          { duration: slow, easing: land, fill: "backwards" },
        ),
        /* One animation for the disc's whole life: in, held through the pop,
           out. It rests at the stylesheet's `opacity: 0`, so nothing is left. */
        disc.animate(
          [
            { opacity: 0, transform: "scale(0.6)", offset: 0, easing: land },
            { opacity: 1, transform: "none", offset: fast / discSpan },
            { opacity: 1, transform: "none", offset: (popEnd - slow) / discSpan, easing: glide },
            { opacity: 0, transform: "none", offset: 1 },
          ],
          { duration: discSpan, delay: slow, fill: "backwards" },
        ),
        stroke.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: base,
          delay: slow,
          easing: glide,
          fill: "backwards",
        }),
        mark.animate([{ transform: "none" }, { transform: "scale(1.04)" }, { transform: "none" }], {
          duration: pop,
          delay: slow + base,
          easing: glide,
        }),
      );
    };
    const start = window.setTimeout(() => {
      if (!covered()) {
        run();
        return;
      }
      observer = new MutationObserver(() => {
        if (covered()) return;
        observer?.disconnect();
        observer = null;
        run();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal", "data-closing"] });
    }, 0);
    return () => {
      window.clearTimeout(start);
      observer?.disconnect();
      for (const animation of running) animation.cancel();
    };
  }, [play, quiet, seenKey]);

  return (
    <span ref={root} className="nf-vpass" data-testid="verified-mark">
      <span ref={shield} className="nf-vpass__shield">
        {children}
      </span>
      <span ref={badge} className="nf-vpass__badge" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path
            ref={tick}
            className="nf-vpass__tick"
            d="M4.2 8.4 6.9 11 11.8 5.4"
            pathLength={1}
            fill="none"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}
