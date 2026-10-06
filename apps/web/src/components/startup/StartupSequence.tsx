import "./startup.css";
import type { CSSProperties } from "react";
import { MARK_PATHS, MARK_VIEWBOX, WORDMARK_PATHS, WORDMARK_VIEWBOX } from "@/components/auth/vector-mark";
import { STARTUP_SCRIPT } from "./startup-script";

/**
 * THE APP OPENING: 1,500ms OF BRAND, THEN THE PRODUCT (directive D31,
 * MOTION_SYSTEM.md section 3, north star section 8).
 *
 * Built once Session 2 had bounded `/open` (R-1): the eight seconds the
 * founder saw were an unbounded `resolveSession()`, and an animation over that
 * would have been a longer hang with better production values. This replaces
 * the Track M splash in the same place in the root layout and keeps its gate
 * (the before-paint script there, `STARTUP_GATE_SCRIPT`: once per session,
 * which on the native shell is once per cold start; never on the console, the
 * auth callback or a shared link; never under Calm, Off, the splash switch or
 * data saver, where the app simply appears; and under the platform's reduced
 * motion, quietly: the still lockup and a 160ms crossfade).
 *
 * THE SIX BEATS, all CSS (`startup.css`), all transform, opacity and filter:
 *
 *     0     120   the navy ground, the native splash's own colour
 *     120   480   the mark assembles: its six facets arrive from depth and
 *                 lock while the mark turns 12 degrees to 0 and scales 0.86
 *                 to 1                                              land
 *     380   720   the wordmark's letters from depth, 24ms apart,
 *                 blur 6 to 0                                       glide
 *     640   900   the edge light sweeps the lockup once            glide
 *     900   1150  the lockup settles and breathes, 1.0 1.02 1.0    drift
 *     1150  1500  the door: the ground parts and the first screen
 *                 is revealed beneath                               leave
 *
 * WHY NOT BrandAssemble. It was built for this and it was tried first, but it
 * assembles the raster artwork (`vallo-mark.png`, 614px, and the wordmark
 * sliced five times out of one PNG), and turning and scaling a raster is
 * exactly what the north star says goes soft on a 3x screen. The vector mark
 * (`components/auth/vector-mark.ts`) is that sequence's prerequisite, so the
 * lockup here is drawn from it: each facet and each letter is its own inline
 * SVG, so each can arrive on its own beat. DepthWords is for words in the
 * reader's language and the lockup has none.
 *
 * WHERE IT ENDS. The settled lockup puts the mark exactly where Get Started
 * draws its own (`app/welcome/lockup.ts`): when the first screen is Get
 * Started the mark simply stays as the ground parts, with no re-entrance,
 * and Get Started's entrance plays out of the door. On any other first screen
 * the mark leaves with the wordmark.
 *
 * Decorative and `aria-hidden`. A tap anywhere or the first key opens the
 * door at once (the tap's own click is eaten, so it cannot land on what the
 * door reveals), and it is never on screen past four seconds whatever the
 * network does (`startup-script.ts`).
 */
export function StartupSequence({ nonce }: { nonce?: string | undefined }) {
  return (
    <>
      {/* `nf-splash` keeps the Track M splash's contract with the gate script
          and with `ThresholdStage`; everything it draws is `nf-startup`. */}
      <div className="nf-splash nf-startup" aria-hidden="true">
        <div className="nf-startup__leaf nf-startup__leaf--a" />
        <div className="nf-startup__leaf nf-startup__leaf--b" />
        <div className="nf-startup__lockup">
          <div className="nf-startup__mark">
            {MARK_PATHS.map((d, i) => (
              <svg
                key={d}
                className="nf-startup__facet"
                viewBox={MARK_VIEWBOX}
                fill="currentColor"
                focusable="false"
                style={{ "--nf-i": i } as CSSProperties}
              >
                <path d={d} />
              </svg>
            ))}
          </div>
          <div className="nf-startup__word">
            {WORDMARK_PATHS.map((d, i) => (
              <svg
                key={d}
                className="nf-startup__letter"
                viewBox={WORDMARK_VIEWBOX}
                fill="currentColor"
                focusable="false"
                style={{ "--nf-i": i } as CSSProperties}
              >
                <path d={d} fillRule={d.includes("Zm") ? "evenodd" : undefined} />
              </svg>
            ))}
          </div>
        </div>
      </div>
      <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: STARTUP_SCRIPT }} />
    </>
  );
}
