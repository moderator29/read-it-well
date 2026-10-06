"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

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
export type DistanceUnit = "km" | "mi";

export type NfSettings = {
  /* `reduceMotion` STOOD HERE AND IS GONE (Track M). Its switch set a root
     flag no stylesheet read; the motion setting in lib/motion/motion-pref.ts
     replaced it and reads its old stored "on" as Calm. */
  textSize: TextSize;
  notifyPush: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  readReceipts: boolean;
  personalisedRecs: boolean;
  defaultCity: string;
  distanceUnit: DistanceUnit;
  /**
   * Spend less of this person's data.
   *
   * Read through `lib/ui/data-saver.ts` rather than from here, because the
   * full answer is this setting OR what the browser reports about the link,
   * and every surface has to reach the same conclusion. Off by default: the
   * platform does not decide on somebody's behalf that they are poor.
   */
  dataSaver: boolean;
  /**
   * B15: Increase contrast. Written to the root as `data-contrast="more"`
   * (`applyContrast`), which `app/css/member-kit.css` reads. Off by default;
   * the system's own `prefers-contrast: more` applies either way.
   */
  increaseContrast: boolean;
  /**
   * R3-15: Reduce transparency. Written to the root as
   * `data-transparency="reduced"` (`applyTransparency`), which
   * `app/css/a11y-prefs.css` reads: the glass drops its blur and takes a
   * solid surface. The system's `prefers-reduced-transparency` applies either
   * way. Off by default.
   */
  reduceTransparency: boolean;
};

export const SETTINGS_DEFAULTS: NfSettings = {
  textSize: "m",
  notifyPush: true,
  notifyEmail: true,
  notifySms: false,
  notifyWhatsapp: true,
  readReceipts: true,
  personalisedRecs: true,
  defaultCity: "",
  distanceUnit: "km",
  dataSaver: false,
  increaseContrast: false,
  reduceTransparency: false,
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
 * V-79: the data saver, written from outside a component (the lite switch in
 * `lib/ui/lite.ts` sets the cookie the server reads and this in one go).
 */
export function setDataSaverSetting(on: boolean): void {
  writeSetting("dataSaver", on);
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
 * Keeps the root in step with the stored Text size and Increase contrast.
 *
 * The FIRST frame is not this hook's job: `THEME_BOOT_SCRIPT`
 * (lib/theme/theme.ts) applies both from storage before paint. This hook
 * follows later changes (the Settings controls, another tab). It skips the
 * hydration pass, whose snapshot is the server's defaults object, because
 * applying the defaults there would undo the boot script for one frame and
 * the page would visibly reflow twice.
 */
export function useApplyDeviceSettings(): void {
  const { settings } = useNfSettings();
  const hydrating = settings === SETTINGS_DEFAULTS;
  useEffect(() => {
    if (!hydrating) applyTextSize(settings.textSize);
  }, [hydrating, settings.textSize]);
  useEffect(() => {
    if (!hydrating) applyContrast(settings.increaseContrast);
  }, [hydrating, settings.increaseContrast]);
  useEffect(() => {
    if (!hydrating) applyTransparency(settings.reduceTransparency);
  }, [hydrating, settings.reduceTransparency]);
}

/** R3-15: the Reduce transparency switch, on the root, like the contrast. */
export function applyTransparency(on: boolean): void {
  if (on) document.documentElement.dataset.transparency = "reduced";
  else delete document.documentElement.dataset.transparency;
}

/**
 * Text size scales the root font size, so every rem-based measure in the app
 * follows: S reads denser, L reads larger, M is the designed default.
 */
/** B15: the Increase contrast switch, on the root, like the text size. */
export function applyContrast(on: boolean): void {
  if (on) document.documentElement.dataset.contrast = "more";
  else delete document.documentElement.dataset.contrast;
}

export function applyTextSize(size: TextSize): void {
  if (size === "m") delete document.documentElement.dataset.textSize;
  else document.documentElement.dataset.textSize = size;
  const scale = size === "s" ? "93.75%" : size === "l" ? "106.25%" : "";
  document.documentElement.style.fontSize = scale;
}

/*
 * THE THEME IS NOT A SETTING ANY MORE, AND THIS IS WHAT USED TO BE HERE.
 *
 * `applyTheme`, `applyThemeColour`, `readThemeChoice`, the `ThemeChoice` type,
 * the `nf_theme` storage key, the `useSyncExternalStore` subscription behind
 * `useThemeChoice` and the `storage` listener that kept two tabs in step are
 * all deleted. The founder removed light mode from the platform on 23
 * September 2026: there is one palette, `html { color-scheme: dark }` in
 * `base.css` stops a light operating system painting its own white into the
 * controls a stylesheet cannot reach, and there is nothing left for a person
 * to choose.
 *
 * DELETED RATHER THAN PINNED TO "dark". A store that still reads a key and
 * still has a setter is a store somebody gives a second value back to, and the
 * whole point of removing a theme is that it cannot come back by accident.
 *
 * The chrome colour is now written once, on the server, by
 * `viewport.themeColor` in the root layout. Nothing rewrites it at runtime.
 */

