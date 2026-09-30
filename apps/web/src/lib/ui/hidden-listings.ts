/**
 * LISTINGS HIDDEN ON THIS PHONE (details pass, 30 September 2026).
 *
 * The long-press menu on a listing card offers "Hide from my results". It is
 * a preference about this reader's own screen, so it lives on this device
 * only: nothing is sent, no lister is told, and clearing the browser's data
 * brings every card back. A saved listing is never hidden (the card checks),
 * because hiding something somebody chose to keep would be a contradiction.
 */
const KEY = "vallo_hidden_listings";
const EVENT = "vallo:hidden-listings";
/** Enough for a long search; the oldest drop off first. */
export const HIDDEN_MAX = 300;

let cache: Set<string> | null = null;

function read(): Set<string> {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    cache = new Set(Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

function write(next: Set<string>) {
  const list = [...next].slice(-HIDDEN_MAX);
  cache = new Set(list);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* Private mode or full storage: hidden for this visit only. */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function isHidden(id: string): boolean {
  if (typeof window === "undefined") return false;
  return read().has(id);
}

export function hideListing(id: string): void {
  const next = new Set(read());
  next.delete(id);
  next.add(id);
  write(next);
}

export function unhideListing(id: string): void {
  const next = new Set(read());
  if (next.delete(id)) write(next);
}

export function subscribeHidden(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = null;
      onChange();
    }
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
