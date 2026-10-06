/**
 * WHERE THE STARTUP'S SETTLED LOCKUP ENDS, WHICH IS WHERE GET STARTED'S MARK
 * ALREADY IS (MOTION_SYSTEM.md section 4; directive D32).
 *
 * The startup sequence (section 3) is not built yet: it waits on Session 2's
 * deadline on `app/open/route.ts`. Get Started is built first, and it is built
 * to be inherited: its first frame has the mark already in position, and the
 * startup's last frame must put the mark in exactly that position, so the
 * handoff is one movement with no re-entrance. These numbers are that
 * position, written down once so the sequence is built to them rather than
 * measured off a screenshot.
 *
 *   top    from the top of the viewport, below the safe area: generous air
 *          (north star 14.5), a ninth of the screen, held between 48px on a
 *          short phone and 104px on a tall window
 *   size   the mark's width, small (D13): 44px, the 44px touch rung, so the
 *          mark is the size of a control and never competes with the line
 *
 * `get-started.css` declares the same two values as `--nf-lockup-top` and
 * `--nf-lockup-size` on the stage, and `lockup.test.ts` fails if the CSS and
 * this module ever disagree. The startup sequence reads the same custom
 * properties (or these constants) for its final frame.
 */
export const SETTLED_LOCKUP = {
  top: "calc(env(safe-area-inset-top, 0px) + clamp(3rem, 11dvh, 6.5rem))",
  size: "2.75rem",
} as const;
