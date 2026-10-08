/**
 * THE PAGE'S SIDE OF THE KEPT PAGES (8 October 2026). `public/sw.js` keeps
 * every page a member opens so it opens again with no signal; this module is
 * the three things a page says to it, and the one thing it asks.
 *
 *   - `announceVisit`  a tap inside the app is a data fetch, not a page load,
 *                      so the worker never sees the page. The page tells it
 *                      the address, and the worker keeps a copy in the
 *                      background (never under Save-Data or on 2g; the worker
 *                      decides, and the server says whose page it is).
 *   - `forgetKeptPages` sign-out. Every kept page is deleted from here AND
 *                      the worker is told, so a shared phone never opens the
 *                      previous account's screens. Either hand alone is
 *                      enough; both run because a sign-out is the one moment
 *                      that must not depend on a worker being awake.
 *   - `servedFromKeptCopy` whether this document came from the phone rather
 *                      than the network (the worker marks it with a
 *                      Server-Timing entry), so the connection line can say so.
 *   - `onFreshCopy`    the worker found the network after all and kept a
 *                      fresh copy: the page refreshes itself in place.
 *
 * Every function is a no-op where there is no worker (a browser without one,
 * a private window, the development server), and none of them throws.
 */

/** Every page cache the worker writes is named with this prefix. */
export const PAGE_CACHE_PREFIX = "vallo-pages-";

/** The Server-Timing name the worker puts on a page it answered from the phone. */
export const KEPT_TIMING_NAME = "vallo-kept";

type WorkerMessage = { type: "vallo:visited"; path: string } | { type: "vallo:forget" };

function post(message: WorkerMessage): void {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.controller?.postMessage(message);
  } catch {
    /* No worker controls this page. */
  }
}

/** Tell the worker this page was opened, so it keeps a copy for offline. */
export function announceVisit(path: string): void {
  if (!path.startsWith("/") || path.startsWith("//")) return;
  post({ type: "vallo:visited", path });
}

/** Sign-out: delete every kept page, here and in the worker. */
export async function forgetKeptPages(): Promise<void> {
  post({ type: "vallo:forget" });
  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(PAGE_CACHE_PREFIX)).map((name) => caches.delete(name)));
  } catch {
    /* Storage refused: the worker's own hand still runs. */
  }
}

/** Whether this document was answered from the phone rather than the network. */
export function servedFromKeptCopy(): boolean {
  try {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return false;
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const timings = entry?.serverTiming ?? [];
    return timings.some((timing) => timing.name === KEPT_TIMING_NAME);
  } catch {
    return false;
  }
}

/** Call `listener` when the worker has kept a fresh copy of the page on screen. Returns the unsubscribe. */
export function onFreshCopy(listener: () => void): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => undefined;
  const handle = (event: MessageEvent) => {
    const data = event.data as { type?: unknown; path?: unknown } | null;
    if (!data || data.type !== "vallo:page-fresh") return;
    if (typeof data.path === "string" && data.path !== window.location.pathname) return;
    listener();
  };
  try {
    navigator.serviceWorker.addEventListener("message", handle);
  } catch {
    return () => undefined;
  }
  return () => {
    try {
      navigator.serviceWorker.removeEventListener("message", handle);
    } catch {
      /* Already gone. */
    }
  };
}
