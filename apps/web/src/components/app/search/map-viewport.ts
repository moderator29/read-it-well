"use client";

/**
 * The map's viewport, in the address bar.
 *
 * A map link that does not carry where the map is looking is not a link to a
 * map, it is a link to the default view of Nigeria. Somebody who pans across
 * Lekki, finds three places on one street and sends the URL to the person they
 * are travelling with was, until now, sending them the whole country. The
 * position is the only part of a map view that is not already in the address:
 * the query, the filters, the sort and `view=map` all are.
 *
 * WRITTEN WITH `replaceState`, NEVER `pushState`, AND NEVER THROUGH THE
 * ROUTER. Both alternatives are actively harmful here:
 *
 *   pushState        a map fires `moveend` on every flick. One drag across a
 *                    city would bury the screen the person came from under
 *                    thirty history entries, and the back button, which was
 *                    only just made to work again, would need thirty taps to
 *                    escape. See `lib/ui/history.ts`.
 *   router.replace   re-runs the server component, which re-reads the whole
 *                    catalogue, on every frame of a pan.
 *
 * `replaceState` merges into the existing state object rather than replacing
 * it, so Next's router tree and the back-control stamp both survive. Verified
 * against this app: navigation continued to work and both survived a back
 * traversal.
 *
 * PRECISION IS DELIBERATELY FOUR DECIMAL PLACES, about eleven metres. Enough
 * to name a street corner, short enough that the URL stays something a person
 * can paste into a message without it wrapping over three lines.
 */

export const LAT_PARAM = "lat";
export const LNG_PARAM = "lng";
export const ZOOM_PARAM = "z";

const PRECISION = 4;

export type Viewport = { lat: number; lng: number; zoom: number };

function readNumber(params: URLSearchParams, key: string, min: number, max: number): number | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const value = Number(raw);
  /* `Number("")` is 0 and `Number(" ")` is 0, both of which are inside every
     range below and would silently drop somebody on the Gulf of Guinea. */
  if (raw.trim() === "" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

/**
 * The viewport the address asks for, or null when it does not ask for one.
 *
 * Every part must be present and sane. A half-stated viewport (a latitude with
 * no longitude, a zoom of 400) is rubbish rather than an instruction, and the
 * map falls back to fitting the results, which is what it did before any of
 * this existed.
 */
export function readViewport(search: string): Viewport | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  const lat = readNumber(params, LAT_PARAM, -90, 90);
  const lng = readNumber(params, LNG_PARAM, -180, 180);
  const zoom = readNumber(params, ZOOM_PARAM, 1, 20);
  if (lat === null || lng === null || zoom === null) return null;
  return { lat, lng, zoom: Math.round(zoom) };
}

/** Put the current view in the address, in place, without a history entry. */
export function writeViewport(view: Viewport): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(LAT_PARAM, view.lat.toFixed(PRECISION));
    url.searchParams.set(LNG_PARAM, view.lng.toFixed(PRECISION));
    url.searchParams.set(ZOOM_PARAM, String(Math.round(view.zoom)));
    const next = url.pathname + url.search;
    if (next === window.location.pathname + window.location.search) return;
    window.history.replaceState({ ...(window.history.state ?? {}) }, "", next);
  } catch {
    /* A sandboxed frame can refuse replaceState. The map still works; only the
       shareability of the link is lost. */
  }
}
