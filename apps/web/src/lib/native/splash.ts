"use client";

import { SplashScreen } from "@capacitor/splash-screen";

/**
 * Take the splash down, once the application is genuinely on screen.
 *
 * `capacitor.config.ts` sets `launchAutoHide: false` deliberately, and that
 * decision hands this file the only responsibility that can strand somebody:
 * NOTHING ELSE HIDES THE SPLASH. If this module does not run, or runs and
 * throws, the person is looking at a static navy image with no way past it and
 * no way to know the app is not broken. Every choice below is made against
 * that outcome.
 *
 * WHY NOT A TIMER, WHICH IS WHAT THE DEFAULT DOES. A timer has to guess, and
 * both guesses are wrong. Too short uncovers a blank web view on a slow
 * Nigerian mobile connection, which is the first thing a store reviewer sees
 * and the first thing a new user reads as "this app does not work". Too long
 * holds a frozen image over a page that has been ready for seconds, which is
 * the same app feeling slower than the website it wraps.
 *
 * WHAT "PAINTED" MEANS HERE, AND WHY IT IS TWO FRAMES. A `requestAnimationFrame`
 * callback runs BEFORE the frame it belongs to is painted, so hiding inside the
 * first one can still uncover an unpainted view. The second frame is requested
 * from inside the first, which means it can only be scheduled after the first
 * frame's work is committed, so by the time it runs the browser has genuinely
 * put a frame of our own markup on the glass. That is the earliest honest
 * moment, and it is typically a few milliseconds after hydration.
 *
 * THE FAILSAFE. Two things can stop the paint path ever completing: a
 * subresource that never settles, so `load` never fires, and a web view the
 * system has stopped animating, so no frame is ever produced. Neither is
 * hypothetical on a phone. So a plain timer is armed the moment this runs and
 * hides the splash regardless. It is deliberately long enough that it never
 * wins a normal launch and short enough that nobody sits on a dead screen
 * wondering: whichever path arrives first hides it, and the second one finds
 * the work already done.
 *
 * WHAT THIS CANNOT COVER, STATED PLAINLY. The failsafe is armed by JavaScript
 * inside the web layer, so it cannot help if the web layer never boots at all,
 * for example if the live origin is unreachable and the shell falls back to
 * the offline card in `native-shell/`. That fallback document has to hide the
 * splash itself, and it is not in this folder.
 */

/**
 * The failsafe window, in milliseconds.
 *
 * Four seconds is chosen against the launch this actually protects: an
 * ordinary cold start on a mid-range Android over 3G paints well inside it, so
 * the timer never fires in normal use, while four seconds of branded splash is
 * still recognisably a launch rather than a hang.
 */
const FAILSAFE_MS = 4_000;

/**
 * Start the dismissal, and hand back a teardown.
 *
 * The teardown hides the splash rather than leaving it up. If the runtime is
 * being torn down, the one state that must not survive is the one that covers
 * the whole screen.
 */
export function startSplash(): () => void {
  let hidden = false;

  const hide = (): void => {
    if (hidden) return;
    hidden = true;
    window.clearTimeout(timer);
    /* A short cross-fade rather than a cut, because the splash and the page
       behind it are the same navy: a hard swap reads as a flicker, a fade
       reads as one continuous surface. Failure is swallowed on purpose. If the
       plugin refuses, there is nothing useful to say and nothing to retry. */
    void SplashScreen.hide({ fadeOutDuration: 220 }).catch(() => {});
  };

  const hideAfterPaint = (): void => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(hide));
  };

  const timer = window.setTimeout(hide, FAILSAFE_MS);

  if (document.readyState === "complete") {
    hideAfterPaint();
  } else {
    window.addEventListener("load", hideAfterPaint, { once: true });
  }

  return () => {
    window.removeEventListener("load", hideAfterPaint);
    hide();
  };
}
