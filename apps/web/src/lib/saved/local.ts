"use client";

import {
  SAVED_COOKIE,
  SAVED_STORAGE_KEY,
  normaliseSaves,
  parseSavedCookie,
  serialiseSavedCookie,
  type LocalSave,
} from "./keys";

/**
 * The device half of the shortlist.
 *
 * Catalogue listings cannot be rows in saved_items, so a tap on their heart is
 * kept here: localStorage is the durable store, and every write mirrors the
 * same values into a cookie so the next server render already knows about
 * them. Signed-out taps land here too, which is why a save is never lost while
 * the sign-in prompt is on screen.
 */

const COOKIE_MAX_AGE = 31_536_000;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** The cookie mirror as this browser currently holds it. */
function readCookieSaves(): LocalSave[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie
    .split("; ")
    .find((pair) => pair.startsWith(`${SAVED_COOKIE}=`));
  if (!match) return [];
  return parseSavedCookie(decodeURIComponent(match.slice(SAVED_COOKIE.length + 1)));
}

function readStoredSaves(): LocalSave[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const saves: LocalSave[] = [];
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      saves.push({ id, savedAt: typeof at === "number" ? at : 0 });
    }
    return saves;
  } catch {
    return [];
  }
}

/**
 * Every save this device holds.
 *
 * The two stores are unioned rather than ranked, so a cleared localStorage or
 * an expired cookie loses nothing and the next write heals both. Newest wins
 * when the same id appears in both.
 */
export function readLocalSaves(): LocalSave[] {
  return normaliseSaves([...readStoredSaves(), ...readCookieSaves()]);
}

export function writeLocalSaves(saves: LocalSave[]): LocalSave[] {
  const next = normaliseSaves(saves);
  if (typeof window === "undefined") return next;
  try {
    const record: Record<string, number> = {};
    for (const save of next) record[save.id] = save.savedAt;
    window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // A full or blocked store must not break the tap; the cookie still carries
    // the shortlist for this session.
  }
  document.cookie = `${SAVED_COOKIE}=${serialiseSavedCookie(next)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  return next;
}

export function addLocalSave(id: string, savedAt = nowSeconds()): LocalSave[] {
  return writeLocalSaves([{ id, savedAt }, ...readLocalSaves()]);
}

export function removeLocalSave(id: string): LocalSave[] {
  return writeLocalSaves(readLocalSaves().filter((s) => s.id !== id));
}
