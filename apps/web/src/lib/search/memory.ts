/**
 * What the browser remembers between hunts.
 *
 * Three small memories, one module, because they are the same mechanism and
 * splitting them across three files is how two of them end up with different
 * pruning rules and a third with none:
 *
 *   the chosen view    list or map, in a COOKIE
 *   recent searches    the last few real hunts, in local storage
 *   recently viewed    the last few places opened, in local storage
 *
 * WHY THE VIEW IS A COOKIE AND THE OTHER TWO ARE NOT. The view has to be known
 * BEFORE the first byte of HTML: `/search` is rendered on the server, and a
 * map-preferring person arriving with no `view=` in the address must get the
 * map in that render, not a list that flips to a map a beat later. Only a
 * cookie is readable at that point. The other two are decoration on an already
 * correct page, so they can arrive after hydration, and keeping them out of
 * every request header is worth the flicker-free-ness they do not need.
 *
 * NOTHING HERE IS TRUSTED ON THE WAY BACK IN. Everything is read back through
 * a validator: local storage is user-writable, survives a deploy, and will
 * contain whatever shape this file wrote three versions ago. A bad entry is
 * dropped, never rendered and never thrown.
 */

import type { ViewKey } from "@/lib/listings/search-params";

/* --------------------------------------------------------------- the view */

/** Read by `app/(app)/search/page.tsx` on the server when `view=` is absent. */
export const VIEW_COOKIE = "nf_view";

/** A year: this is a preference, not a session. */
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isViewKey(value: string | undefined | null): value is ViewKey {
  return value === "list" || value === "map";
}

/** Remember the view the person is actually looking at. Client only. */
export function rememberView(view: ViewKey): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${VIEW_COOKIE}=${view}; path=/; max-age=${VIEW_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    /* Cookies can be refused outright. The URL still carries the view, so the
       only thing lost is the memory. */
  }
}

/* ---------------------------------------------------------------- storage */

function readList<T>(key: string, valid: (value: unknown) => value is T, max: number): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(valid).slice(0, max);
  } catch {
    return [];
  }
}

function writeList<T>(key: string, entries: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    /* Private browsing, or a full quota. Both are survivable: the feature is
       a convenience and the page is complete without it. */
  }
}

function clearKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* As above. */
  }
}

/* ------------------------------------------------------- recent searches */

export const RECENT_SEARCHES_KEY = "nf_recent_searches";

/**
 * Five. A recent list long enough to need scrolling has stopped being a
 * shortcut and become a second search problem.
 */
export const MAX_RECENT_SEARCHES = 5;

export type RecentSearch = {
  /** What the person reads on the chip, e.g. "Lagos, 2 beds". */
  label: string;
  /** The exact address that produced it, filters and all. */
  href: string;
};

function isRecentSearch(value: unknown): value is RecentSearch {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.label === "string" &&
    entry.label.length > 0 &&
    entry.label.length <= 80 &&
    typeof entry.href === "string" &&
    /* Same-origin, and specifically a search. An href read back from storage
       is attacker-controlled text, and it goes into a link. */
    entry.href.startsWith("/search")
  );
}

export function readRecentSearches(): RecentSearch[] {
  return readList(RECENT_SEARCHES_KEY, isRecentSearch, MAX_RECENT_SEARCHES);
}

/**
 * Record a hunt, newest first, de-duplicated by the address rather than by the
 * label. Two different filter sets can read the same on a chip, and offering
 * the wrong one of them back is worse than offering neither.
 */
export function rememberSearch(entry: RecentSearch): void {
  if (!isRecentSearch(entry)) return;
  const existing = readRecentSearches().filter((e) => e.href !== entry.href);
  writeList(RECENT_SEARCHES_KEY, [entry, ...existing].slice(0, MAX_RECENT_SEARCHES));
}

export function clearRecentSearches(): void {
  clearKey(RECENT_SEARCHES_KEY);
}

/* ------------------------------------------------------- recently viewed */

export const RECENT_LISTINGS_KEY = "nf_recent_listings";

export const MAX_RECENT_LISTINGS = 8;

export type RecentListing = {
  id: string;
  title: string;
  /** "Lekki, Lagos". Kept short: this is a chip, not a card. */
  place: string;
};

function isRecentListing(value: unknown): value is RecentListing {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    entry.id.length <= 120 &&
    /* The id becomes `/listing/${id}`, so it may only be an id: no slashes, no
       scheme, no `..`. */
    /^[A-Za-z0-9._-]+$/.test(entry.id) &&
    typeof entry.title === "string" &&
    entry.title.length > 0 &&
    typeof entry.place === "string"
  );
}

export function readRecentListings(): RecentListing[] {
  return readList(RECENT_LISTINGS_KEY, isRecentListing, MAX_RECENT_LISTINGS);
}

export function rememberListing(entry: RecentListing): void {
  if (!isRecentListing(entry)) return;
  const existing = readRecentListings().filter((e) => e.id !== entry.id);
  writeList(RECENT_LISTINGS_KEY, [entry, ...existing].slice(0, MAX_RECENT_LISTINGS));
}

export function clearRecentListings(): void {
  clearKey(RECENT_LISTINGS_KEY);
}
