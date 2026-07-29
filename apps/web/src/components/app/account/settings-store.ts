"use client";

import { useCallback, useEffect, useState } from "react";

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

/**
 * Hydrating hook over the settings document. First render uses the defaults so
 * server and client markup agree, then the stored values arrive on mount.
 */
export function useNfSettings() {
  const [settings, setSettings] = useState<NfSettings>(SETTINGS_DEFAULTS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const set = useCallback(<K extends keyof NfSettings>(key: K, value: NfSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persist(next);
      return next;
    });
  }, []);

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
 * reads: `nf_theme` in storage, `data-theme="light"` on the root for light,
 * no attribute for dark. System removes the stored choice and follows the
 * OS preference from that moment on.
 */
export function applyTheme(choice: ThemeChoice): void {
  try {
    if (choice === "system") window.localStorage.removeItem("nf_theme");
    else window.localStorage.setItem("nf_theme", choice);
  } catch {
    // The attribute below still flips this session's appearance.
  }
  const light =
    choice === "light" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
  if (light) document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
}

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem("nf_theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Fall through to system.
  }
  return "system";
}
