"use client";

import { useSyncExternalStore } from "react";
import { CHROME_COLOUR, CHROME_COLOUR_LIGHT } from "./chrome";
import { THEME_KEY, parseThemeChoice, resolveTheme, type ResolvedTheme, type ThemeChoice } from "./theme";

/** Fired on `window` whenever the applied theme changes, for the status bar and the maps. */
export const THEME_EVENT = "nf-theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

function prefersLight(): boolean {
  try {
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
  } catch {
    return false;
  }
}

export function readThemeChoice(): ThemeChoice {
  if (typeof document === "undefined") return "dark";
  return parseThemeChoice(document.documentElement.dataset.themeChoice);
}

export function readAppliedTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Paints a choice onto the document, without persisting it. */
export function applyTheme(choice: ThemeChoice): ResolvedTheme {
  const root = document.documentElement;
  const theme = resolveTheme(choice, prefersLight());
  root.dataset.theme = theme;
  root.dataset.themeChoice = choice;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? CHROME_COLOUR_LIGHT : CHROME_COLOUR);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme, choice } }));
  return theme;
}

/** Applies and remembers a choice: storage for the script, a cookie for the server. */
export function setThemeChoice(choice: ThemeChoice): ResolvedTheme {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* Private mode: the cookie below still carries it. */
  }
  try {
    /* The cookie flag that limits it to https, added off localhost. */
    const httpsOnly = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_KEY}=${choice}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${httpsOnly}`;
  } catch {
    /* A webview without cookies keeps storage. */
  }
  return applyTheme(choice);
}

/**
 * Keeps a "system" choice honest while the page is open: the OS flipping to
 * light at sunrise flips the page, and another tab's choice arrives here.
 * Returns the cleanup.
 */
export function watchSystemTheme(): () => void {
  const media = window.matchMedia?.("(prefers-color-scheme: light)");
  const onMedia = () => {
    if (readThemeChoice() === "system") applyTheme("system");
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) applyTheme(parseThemeChoice(event.newValue));
  };
  media?.addEventListener?.("change", onMedia);
  window.addEventListener("storage", onStorage);
  return () => {
    media?.removeEventListener?.("change", onMedia);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

/** The stored choice (Light, Dark or System), live. Server render answers dark. */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribeTheme, readThemeChoice, () => "dark");
}

/** The theme the page is painted in, live. Server render answers dark. */
export function useAppliedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeTheme, readAppliedTheme, () => "dark");
}
