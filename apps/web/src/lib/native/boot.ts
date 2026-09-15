"use client";

import { looksNative } from "./platform";

/**
 * The one entry point into everything native.
 *
 * `NativeRuntime` in `components/app/` mounts this once from the root layout
 * and nothing else in the application calls it. One entry point is not tidiness
 * for its own sake: it is the only way to be certain that the guard below is
 * asked before any plugin is touched, and that every listener started has a
 * teardown that runs.
 *
 * THE WEBSITE MUST NOT CHANGE AT ALL. The same bundle serves vallo.ng in a
 * phone browser and the shell on a device, and a visitor to the website pays
 * for exactly one thing here: the handful of bytes in `platform.ts`, which
 * reads a global and imports nothing. Every plugin, and every module that
 * imports one, is behind a dynamic import that a browser never requests, so
 * the Capacitor packages are not in the main bundle, are not evaluated, and
 * register nothing on the window.
 *
 * TWO GUARDS, DELIBERATELY. `looksNative()` reads the injected bridge without
 * importing anything, which is what keeps the website free. Then, once the
 * native chunk has arrived, the real `Capacitor.isNativePlatform()` is asked
 * again before a single listener is bound. The cost of a second check is one
 * function call on a phone; the cost of being wrong in the other direction is
 * a website with a hijacked click handler.
 *
 * ORDER MATTERS, AND ONLY FOR ONE OF THEM. The splash is started first, on its
 * own, before anything that could fail. It is the only piece here whose
 * absence traps somebody on a screen they cannot leave, so it must not be
 * waiting behind a plugin that is slow to answer or a chunk that never
 * arrives. Everything after it is an enhancement to a running application.
 *
 * FAILURE IS SILENT AND PARTIAL, NEVER TOTAL. Each feature is started inside
 * its own try, so a plugin missing from a particular build (a shell compiled
 * without the keyboard plugin, say) costs exactly that feature and leaves the
 * other four running. There is nothing useful to tell the person about it: a
 * status bar that did not repaint is not something they can act on.
 */

export type NativeRuntimeHandlers = {
  /**
   * Walk one step back through the application's own history.
   *
   * Passed in rather than reached for, because the Next router is a React
   * context and this module is not a component. The component that mounts this
   * owns the router and hands the one capability the runtime needs.
   */
  goBack: () => void;
};

const NOOP = (): void => {};

export function startNativeRuntime(handlers: NativeRuntimeHandlers): () => void {
  if (typeof window === "undefined") return NOOP;
  if (!looksNative()) return NOOP;

  let stopped = false;
  const teardowns: Array<() => void> = [];

  /*
   * Collect a teardown, or run it immediately if the runtime was already torn
   * down while this feature was still starting. Everything below is async, so
   * a fast unmount (React's development double invoke is the common one) can
   * genuinely land between the await and the assignment.
   */
  const collect = (teardown: () => void): void => {
    if (stopped) teardown();
    else teardowns.push(teardown);
  };

  void (async () => {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform() || stopped) return;

    /* First, and alone. See the note above about the splash. */
    try {
      const { startSplash } = await import("./splash");
      collect(startSplash());
    } catch {
      /* If this failed the splash is still up, and the failsafe inside it
         never got the chance to arm. Nothing here can improve on that. */
    }

    try {
      const { startStatusBar } = await import("./status-bar");
      collect(startStatusBar());
    } catch {
      /* The bar keeps the colour the config gave it at launch. */
    }

    try {
      const { startKeyboard } = await import("./keyboard");
      collect(await startKeyboard());
    } catch {
      /* `resize: "native"` in the config still does the heavy lifting. */
    }

    try {
      const { startBackButton } = await import("./back-button");
      collect(await startBackButton(handlers.goBack));
    } catch {
      /* Android's back button falls back to doing nothing, which is the
         behaviour of an unhandled web view. */
    }

    try {
      const { startExternalLinks } = await import("./external-links");
      collect(startExternalLinks());
    } catch {
      /* Capacitor's own navigation delegate still refuses to load a foreign
         origin in the shell, so payments and OAuth leave to the full browser
         application instead of an in-app tab. */
    }

    try {
      const { startDeepLinks } = await import("./deep-links");
      collect(await startDeepLinks());
    } catch {
      /* A returning universal link opens as an ordinary page instead of being
         handed to the running application. */
    }
  })();

  return () => {
    stopped = true;
    /* Last started, first torn down, so nothing is removed out from under
       something that was still relying on it. */
    while (teardowns.length > 0) {
      teardowns.pop()?.();
    }
  };
}
