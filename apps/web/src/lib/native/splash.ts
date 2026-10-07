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
 * NOW, NOT AFTER A PAINTED FRAME (October 2026). This used to wait for the
 * window's `load` and then two animation frames, "the earliest honest
 * moment". On Android the splash plugin cancels the web view's draws (an
 * `OnPreDrawListener` answering false) until `hide()` is called, so those
 * frames could not come before the hide that was waiting on them, and the
 * splash came down on the failsafe instead: the founder's "logo for up to
 * eight seconds". By the time this module runs the page has hydrated, and
 * the startup's inline script (`components/startup/startup-script.ts`) has
 * normally hidden the splash already, on the document's first parse; this is
 * the second hand on the same rope, and a second hide is a no-op.
 *
 * THE FAILSAFE. The hide is a bridge call, and a bridge call can be refused
 * or lost. So a plain timer is armed the moment this runs and hides the
 * splash again regardless; whichever arrives first does the work and the
 * second finds it done.
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
 * Two seconds: short enough that a lost bridge call never reads as a hang,
 * and still ahead of `BRIDGE_FAILSAFE_MS` in `boot.ts`, which only matters
 * for the native chunk that never arrives.
 */
export const FAILSAFE_MS = 2_000;

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

  const timer = window.setTimeout(hide, FAILSAFE_MS);

  /* Straight away: no `load`, no frame. See the note above. */
  try {
    void SplashScreen.hide({ fadeOutDuration: 220 }).then(
      () => {
        hidden = true;
        window.clearTimeout(timer);
      },
      () => {},
    );
  } catch {
    /* The failsafe tries again. */
  }

  return () => {
    hide();
  };
}
