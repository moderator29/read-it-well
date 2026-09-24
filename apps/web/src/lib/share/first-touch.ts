/**
 * V-71: FIRST-TOUCH ATTRIBUTION, AS A COOKIE THE DEVICE KEEPS, PER LISTING.
 *
 * When somebody opens a lister's door, the device remembers which door and
 * when, for fourteen days, FOR THAT LISTING, and only if it is not already
 * remembering one for that listing: first touch, so the lister whose Status
 * brought them gets the credit, not whoever shared last. Review found the
 * first version kept one slot per device, so opening a second listing's door
 * lost nothing but also credited nothing; now the cookie is a small map,
 * listing id to door token and time, capped at `FIRST_TOUCH_MAX` entries
 * (the oldest goes first) so it stays well under a browser's cookie size.
 *
 * It holds ids, tokens and times, nothing about the person, and is only read
 * by the server when that person starts a conversation about one of those
 * listings (`attribute_conversation` checks the rest: the lister's own door,
 * that listing, within 14 days).
 */

export const FIRST_TOUCH_COOKIE = "vallo_via";
export const FIRST_TOUCH_DAYS = 14;
export const FIRST_TOUCH_MAX = 20;
const TOKEN = /^[23456789abcdefghjkmnpqrstvwxyz]{10}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FirstTouch = { token: string; at: number };
export type FirstTouches = Map<string, FirstTouch>;

function fresh(at: number, now: number): boolean {
  return Number.isFinite(at) && at <= now + 5 * 60_000 && now - at <= FIRST_TOUCH_DAYS * 86_400_000;
}

/** Every unexpired touch in the cookie, keyed by listing id. Anything malformed is dropped. */
export function readFirstTouches(value: string | null | undefined, now: number): FirstTouches {
  const out: FirstTouches = new Map();
  if (!value) return out;
  for (const entry of decodeURIComponent(value).split("|")) {
    const [listingId, token, at] = entry.split("~");
    const when = Number(at);
    if (!listingId || !UUID.test(listingId) || !token || !TOKEN.test(token) || !fresh(when, now)) continue;
    if (!out.has(listingId)) out.set(listingId.toLowerCase(), { token, at: when });
  }
  return out;
}

/** The touch for one listing, or null. */
export function firstTouchFor(value: string | null | undefined, listingId: string, now: number): FirstTouch | null {
  return readFirstTouches(value, now).get(listingId.toLowerCase()) ?? null;
}

/**
 * The cookie after opening `token` for `listingId`: unchanged when that
 * listing already has an unexpired touch (first touch wins), otherwise with
 * the new touch added and the oldest entries dropped past the cap.
 */
export function withFirstTouch(value: string | null | undefined, listingId: string, token: string, now: number): string | null {
  if (!UUID.test(listingId) || !TOKEN.test(token)) return null;
  const touches = readFirstTouches(value, now);
  if (touches.has(listingId.toLowerCase())) return null;
  touches.set(listingId.toLowerCase(), { token, at: now });
  const kept = [...touches.entries()].sort((a, b) => b[1].at - a[1].at).slice(0, FIRST_TOUCH_MAX);
  return kept.map(([id, t]) => `${id}~${t.token}~${t.at}`).join("|");
}

export function firstTouchCookie(value: string, secure: boolean): string {
  return [
    `${FIRST_TOUCH_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${FIRST_TOUCH_DAYS * 86_400}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
