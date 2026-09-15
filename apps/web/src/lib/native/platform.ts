"use client";

/**
 * Am I the native shell, or am I the website?
 *
 * EVERY OTHER FILE IN THIS FOLDER DEPENDS ON THIS ANSWER BEING RIGHT, AND ON
 * IT COSTING THE WEBSITE NOTHING. The same bundle serves vallo.ng in a
 * browser and the Capacitor shell on a phone, and the website must not change
 * at all: no extra bytes fetched, no plugin registered, no listener bound, no
 * global touched. So the first gate reads a value the native runtime injected
 * and imports nothing whatsoever.
 *
 * WHY THE GLOBAL RATHER THAN `import { Capacitor } from "@capacitor/core"`.
 * That import is not free and it is not inert: it evaluates the core package,
 * which creates the `Capacitor` object and its plugin registry on the window
 * of every visitor to the website, most of whom are on a phone browser on
 * metered data and will never install anything. Reading the injected bridge
 * instead is the same question asked without paying for the answer.
 *
 * The global is present on native because both platforms inject Capacitor's
 * bridge script into the web view before the page runs, which is the same
 * mechanism `@capacitor/core` itself detects. It is absent in a browser
 * because nothing injects it there.
 *
 * THIS IS THE CHEAP GATE, NOT THE AUTHORITATIVE ONE. `boot.ts` asks the real
 * `Capacitor.isNativePlatform()` a second time, after the native-only chunk has
 * been fetched and before a single plugin is started. Two gates because the
 * cost of a false positive on the web is a broken website, and the cost of a
 * second check on a phone is nothing.
 */

/** The shape of the bridge object, narrowed to the two things asked of it. */
type InjectedBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function injectedBridge(): InjectedBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: InjectedBridge }).Capacitor;
}

/**
 * True only inside the iOS or Android shell.
 *
 * Fails closed in every uncertain case, including the server render, a browser
 * with no bridge, and a bridge that throws while answering. False means the
 * whole native runtime stays asleep, which is exactly what the website wants.
 */
export function looksNative(): boolean {
  try {
    return injectedBridge()?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * Which shell, for the handful of behaviours that genuinely differ.
 *
 * The hardware back button exists on Android and not on iOS, and the status
 * bar background colour is settable on Android and ignored on iOS. Everything
 * else in this folder is deliberately written to be platform agnostic, because
 * a per-platform branch is a per-platform bug waiting to be found by whichever
 * device we own fewer of.
 */
export function nativePlatform(): "ios" | "android" | "unknown" {
  try {
    const name = injectedBridge()?.getPlatform?.();
    if (name === "ios" || name === "android") return name;
  } catch {
    // Fall through to unknown, which every caller already handles.
  }
  return "unknown";
}
