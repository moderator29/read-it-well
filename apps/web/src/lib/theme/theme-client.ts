"use client";

import { useSyncExternalStore } from "react";
import { CHROME_COLOUR, CHROME_COLOUR_LIGHT } from "./chrome";
import { THEME_KEY, parseThemeChoice, resolveTheme, type ResolvedTheme, type ThemeChoice } from "./theme";
import { NIGHT_DOOR_ATTR, NIGHT_DOOR_VALUE } from "./night-door";

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

/** True while a night door (`night-door.ts`) is on screen. */
export function isNightDoorOpen(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset[NIGHT_DOOR_ATTR] === NIGHT_DOOR_VALUE;
}

/**
 * Paints a choice onto the document, without persisting it. While a night
 * door is on screen the document is painted dark and the choice is only
 * recorded, so it comes back the moment the door is left.
 */
export function applyTheme(choice: ThemeChoice): ResolvedTheme {
  const root = document.documentElement;
  const theme = isNightDoorOpen() ? "dark" : resolveTheme(choice, prefersLight());
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

/*
 * NIGHT DOORS, while mounted. Counted, because two can overlap for a frame
 * (a passcode lock opening over Get started, or a route transition keeping
 * the leaving page a moment): the root stays night until the last one goes.
 */
let openDoors = 0;

/** Marks the document as showing a night door and repaints; returns the undo. */
export function openNightDoor(): () => void {
  const root = document.documentElement;
  openDoors += 1;
  root.dataset[NIGHT_DOOR_ATTR] = NIGHT_DOOR_VALUE;
  applyTheme(readThemeChoice());
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    openDoors = Math.max(0, openDoors - 1);
    if (openDoors > 0) return;
    delete root.dataset[NIGHT_DOOR_ATTR];
    applyTheme(readThemeChoice());
  };
}
