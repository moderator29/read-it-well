"use client";

/**
 * The theme, as the native chrome needs to see it.
 *
 * There is already exactly one source of truth for which theme this person is
 * looking at, and this file reads it rather than inventing a second one. That
 * matters more here than it looks: a status bar painted from a different
 * source than the page drifts out of step the moment somebody changes their
 * mind, and the result is navy chrome sitting above a paper-white page, which
 * is the single most obvious way for a shell to look unfinished.
 *
 * WHY THE ATTRIBUTE AND NOT `nf_theme` IN STORAGE. Storage holds a CHOICE,
 * which is one of "light", "dark" or "system". The root element's
 * `data-theme` holds the RESULT of that choice, and the result is what is
 * actually painted: the before-paint script in `src/app/layout.tsx` sets it,
 * `applyTheme` in `components/app/account/settings-store.ts` sets it, and
 * `ThemeToggle` sets it. Reading the choice would mean re-implementing the
 * "system" resolution here, in a third place, and being wrong about it the
 * first time somebody changes an operating system setting.
 *
 * There is also no event to listen to. Neither writer dispatches one, and the
 * `storage` event only fires in OTHER documents, never the one that wrote. So
 * the attribute is observed directly, which catches all three writers without
 * asking any of them to announce themselves.
 *
 * Dark is the default and the operating system does not override it. Absent
 * attribute means dark, which is the same rule the before-paint script obeys.
 */

export type AppTheme = "dark" | "light";

/**
 * What colour the chrome above and around the page should be, per theme.
 *
 * THESE TWO VALUES ARE MIRRORED IN TWO OTHER PLACES AND ALL THREE MUST MOVE
 * TOGETHER: `viewport.themeColor` in `src/app/layout.tsx`, which paints the
 * browser chrome on the web, and the `StatusBar` block in
 * `capacitor.config.ts`, which decides the colour the bar starts at before any
 * JavaScript has run. They are literals rather than a read of
 * `--nf-surface-canvas` because the native plugin wants a hex string and the
 * token resolves through `color-mix` in places, and because the value the bar
 * needs is the one at the very top of the page, which is what those other two
 * declarations already agree on.
 */
export const CHROME_COLOUR: Record<AppTheme, string> = {
  dark: "#010118",
  light: "#F4F5F7",
};

/** The theme currently painted, read from the root element. */
export function currentTheme(): AppTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * Call back whenever the painted theme changes, and return the teardown.
 *
 * Filtered to the one attribute, and de-duplicated against the last value, so
 * an unrelated write to the root element (text size, reduce motion, the
 * keyboard flag this folder sets itself) does not repaint the status bar for
 * no reason.
 */
export function watchTheme(onChange: (theme: AppTheme) => void): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }

  let last = currentTheme();
  const observer = new MutationObserver(() => {
    const next = currentTheme();
    if (next === last) return;
    last = next;
    onChange(next);
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => observer.disconnect();
}
