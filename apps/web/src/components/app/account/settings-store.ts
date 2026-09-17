"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CHROME_COLOUR, currentTheme } from "@/lib/native/theme";

/**
 * Device settings store.
 *
 * One JSON document under `nf_settings` holds every preference on this page,
 * so the settings surface reads and writes a single key instead of scattering
 * flags across storage. Loading always merges over the defaults, which means
 * a missing or malformed value can never crash a card, and new settings ship
 * without a migration. Theme is the one exception: it stays in `nf_theme`
 * because the root layout's before-paint script already reads that key.
 */

export const SETTINGS_KEY = "nf_settings";

export type TextSize = "s" | "m" | "l";
export type ThemeChoice = "system" | "light" | "dark";
export type DistanceUnit = "km" | "mi";
export type ProfileVisibility = "everyone" | "private";

export type NfSettings = {
  reduceMotion: boolean;
  textSize: TextSize;
  notifyPush: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  profileVisibility: ProfileVisibility;
  readReceipts: boolean;
  personalisedRecs: boolean;
  defaultCity: string;
  distanceUnit: DistanceUnit;
  appLock: boolean;
  /**
   * Spend less of this person's data.
   *
   * Read through `lib/ui/data-saver.ts` rather than from here, because the
   * full answer is this setting OR what the browser reports about the link,
   * and every surface has to reach the same conclusion. Off by default: the
   * platform does not decide on somebody's behalf that they are poor.
   */
  dataSaver: boolean;
};

export const SETTINGS_DEFAULTS: NfSettings = {
  reduceMotion: false,
  textSize: "m",
  notifyPush: true,
  notifyEmail: true,
  notifySms: false,
  notifyWhatsapp: true,
  profileVisibility: "everyone",
  readReceipts: true,
  personalisedRecs: true,
  defaultCity: "",
  distanceUnit: "km",
  appLock: false,
  dataSaver: false,
};

export function loadSettings(): NfSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...SETTINGS_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<NfSettings>;
    const out: NfSettings = { ...SETTINGS_DEFAULTS };
    for (const key of Object.keys(SETTINGS_DEFAULTS) as (keyof NfSettings)[]) {
      const value = parsed[key];
      if (value !== undefined && typeof value === typeof SETTINGS_DEFAULTS[key]) {
        (out as Record<keyof NfSettings, NfSettings[keyof NfSettings]>)[key] = value;
      }
    }
    return out;
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

function persist(next: NfSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the session keeps the in-memory value.
  }
}

/* ------------------------------------------------- the store, shared by all */

/**
 * ONE SNAPSHOT FOR EVERY READER, AND THERE USED TO BE ONE PER COMPONENT.
 *
 * This hook was `useState(SETTINGS_DEFAULTS)` plus an effect that loaded
 * storage on mount, which React 19 flags as a render-phase write. The warning
 * was the small half of it. The large half is that `SettingsGroups.tsx` calls
 * this hook FIVE TIMES on one screen - Appearance, Notifications, Privacy,
 * Search and Data each call it - so there were five independent copies of one
 * document, and `set` persisted the WHOLE document from its own copy's `prev`.
 *
 * So: open /settings, turn a notification off, then change a privacy toggle.
 * The privacy card's `prev` was loaded at mount and does not contain the
 * notification change, so persisting it writes the old value back. **The first
 * change is silently reverted in storage**, and neither card shows it, because
 * neither card is reading the other's copy. Reproducible with any two toggles
 * in two different cards, in one visit, and invisible until the next page load.
 *
 * `useSyncExternalStore` is the fix rather than a tidy-up: there is exactly one
 * snapshot, every reader gets the same object, and a write goes to storage and
 * then notifies everybody. Two cards cannot hold different ideas of one
 * document because there is only one.
 *
 * THE SNAPSHOT HAS TO BE REFERENTIALLY STABLE or React re-renders forever, so
 * the parsed document is cached against the RAW STRING it came from. Same
 * string, same object. That also makes a cross-tab `storage` event work for
 * free: the string differs, so the cache misses and everything re-reads.
 *
 * A FAILED WRITE STILL HOLDS FOR THE SESSION. `persist` swallows storage
 * errors, so after writing, the cache is set from the value we tried to write
 * rather than re-read from a store that may have refused it. Private mode keeps
 * working; it simply forgets on reload, which is what private mode is.
 */
let cachedRaw: string | null = null;
let cachedValue: NfSettings = SETTINGS_DEFAULTS;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): NfSettings {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = loadSettings();
  }
  return cachedValue;
}

/**
 * The server, and the first client render, see the defaults.
 *
 * A stable reference, deliberately the same object `cachedValue` starts at, so
 * hydration compares equal and the markup cannot disagree with itself. This is
 * the job the mount effect was doing, done where it belongs.
 */
function getServerSnapshot(): NfSettings {
  return SETTINGS_DEFAULTS;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  /* Another tab writing the same key. `e.key === null` is a `clear()`, which
     wipes this document too, so it counts. */
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SETTINGS_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function writeSetting<K extends keyof NfSettings>(key: K, value: NfSettings[K]): void {
  const next: NfSettings = { ...getSnapshot(), [key]: value };
  persist(next);
  cachedValue = next;
  cachedRaw = readRaw();
  for (const listener of listeners) listener();
}

/**
 * The settings document and one writer, shared by every card that reads it.
 */
export function useNfSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = useCallback(
    <K extends keyof NfSettings>(key: K, value: NfSettings[K]) => writeSetting(key, value),
    [],
  );
  return { settings, set };
}

/* --------------------------------------------------- document side effects */

/**
 * Motion preference lands on the root element so stylesheets can calm
 * animation app-wide. The legacy `nf_reduce_motion` flag is mirrored because
 * earlier builds of this device may still carry it.
 */
export function applyReduceMotion(on: boolean): void {
  if (on) document.documentElement.dataset.reduceMotion = "1";
  else delete document.documentElement.dataset.reduceMotion;
  try {
    window.localStorage.setItem("nf_reduce_motion", on ? "1" : "0");
  } catch {
    // The document attribute above still applies for this session.
  }
}

/**
 * Text size scales the root font size, so every rem-based measure in the app
 * follows: S reads denser, L reads larger, M is the designed default.
 */
export function applyTextSize(size: TextSize): void {
  document.documentElement.dataset.textSize = size;
  const scale = size === "s" ? "93.75%" : size === "l" ? "106.25%" : "";
  document.documentElement.style.fontSize = scale;
}

/**
 * Theme uses the same key and attribute the root layout's before-paint script
 * reads: `nf_theme` in storage, `data-theme="light"` on the root for light, no
 * attribute for dark.
 *
 * Dark is the platform default and only an explicit choice moves it. "system"
 * is now WRITTEN to storage rather than clearing it, which matters: the
 * before-paint script cannot tell "chose system" from "never chose anything" if
 * both look like an empty key, and it has to render dark for the second one.
 * Storing the word keeps someone who genuinely wants to follow their OS from
 * getting a flash of dark on every page load.
 */
export function applyTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem("nf_theme", choice);
  } catch {
    // The attribute below still flips this session's appearance.
  }
  const light =
    choice === "light" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
  if (light) document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  applyThemeColour();
}

/**
 * The browser's own chrome follows the theme.
 *
 * TWO FAULTS, AND THE SECOND ONE ONLY TURNED UP BECAUSE THE FIRST WAS FIXED
 * BADLY TWICE.
 *
 * THE FAULT. `<meta name="theme-color" media="(prefers-color-scheme: light)">`
 * answers the OPERATING SYSTEM, and this product's theme answers STORAGE.
 * Those are not the same question and they disagreed for exactly the visitor
 * the dark default was written for: somebody whose phone is set to light,
 * opening Vallo for the first time, got the dark canvas under a #F4F5F7
 * browser chrome, which is the hard seam the two-value metadata existed to
 * remove. Measured across all six combinations of stored choice and OS
 * preference; three of the six were mismatched.
 *
 * THE FIRST BAD FIX was a pair of hex literals here, and `nf/no-raw-colour`
 * called it. THE SECOND was reading `--nf-surface-canvas` instead, which is a
 * better instinct and still the wrong source, and only a measurement showed it:
 * the canvas is #000010 in dark, but the browser chrome sits above the TOP OF
 * THE PAGE and the top of the page is the sticky glass header, which samples
 * #090919. #010118 is neither of those and is closer to the header than the
 * canvas is, which is why it was chosen and why nobody wrote down that it was a
 * header colour rather than a canvas one.
 *
 * So the source is `CHROME_COLOUR`, which is the one place these two values
 * live and which `viewport.themeColor` and the Capacitor `StatusBar` block both
 * already mirror. A fourth opinion about the same colour was the whole problem.
 *
 * Called with no argument on purpose: it runs after `data-theme` has moved and
 * reads the theme the document is actually in, so it cannot disagree with the
 * screen.
 */
export function applyThemeColour(): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", CHROME_COLOUR[currentTheme()]);
}

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem("nf_theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Fall through to the platform default below.
  }
  // Nothing chosen means the brand's own theme, not the operating system's.
  return "dark";
}

/* ---------------------------------------------------------------- the theme */

/**
 * The chosen theme as a subscription, for the control that shows which one is on.
 *
 * ---------------------------------------------------------------------------
 * WHY THE THEME NEEDED ITS OWN STORE RATHER THAN JOINING `NfSettings`.
 *
 * It cannot live in the settings document, and the reason is the flash. A
 * before-paint script in the document head reads `nf_theme` and sets
 * `data-theme` before React exists, because a theme applied after hydration is
 * a white page that turns dark in front of the reader. That script cannot parse
 * a JSON settings blob and pick a field out of it cheaply enough to run in the
 * head, so the theme stays on its own key and `applyTheme` writes it.
 *
 * WHAT WAS WRONG WITH THE EFFECT. `SettingsGroups` initialised `useState` to
 * "dark", then read the real answer in a mount effect, so the theme row showed
 * Dark selected for one commit on a device set to light and then corrected
 * itself. On `/settings` that is a visible flicker on the row somebody opened
 * the screen to change. It was also `react-hooks/set-state-in-effect`, for the
 * exact reason the rule exists: the value came from outside React and was being
 * pushed into React's state instead of subscribed to.
 *
 * `getServerSnapshot` answers "dark" because the server has no storage and dark
 * is the platform default, which is what the markup is built for.
 */
const themeListeners = new Set<() => void>();

function themeSnapshot(): ThemeChoice {
  return readThemeChoice();
}

function themeServerSnapshot(): ThemeChoice {
  return "dark";
}

function themeSubscribe(onChange: () => void): () => void {
  themeListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === "nf_theme") onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/* `readThemeChoice` returns one of three string literals, so the snapshot is
   already compared correctly by identity and needs no caching. That is the one
   thing this store gets for free that the settings document does not. */
export function useThemeChoice(): {
  theme: ThemeChoice;
  chooseTheme: (next: ThemeChoice) => void;
} {
  const theme = useSyncExternalStore(themeSubscribe, themeSnapshot, themeServerSnapshot);
  const chooseTheme = useCallback((next: ThemeChoice) => {
    applyTheme(next);
    for (const listener of themeListeners) listener();
  }, []);
  return { theme, chooseTheme };
}
