/**
 * V-71: FIRST-TOUCH ATTRIBUTION, AS A COOKIE THE DEVICE KEEPS.
 *
 * When somebody opens a lister's door, the device remembers which door and
 * when, for fourteen days, and only if it is not already remembering one:
 * FIRST touch, so the lister whose Status brought them gets the credit, not
 * whoever shared last. The cookie holds a door token and a time, nothing about
 * the person, and it is only ever read by the server when that person later
 * starts a conversation about the same listing (`attribute_conversation`
 * checks the rest: the lister's own door, that listing, within 14 days).
 */

export const FIRST_TOUCH_COOKIE = "vallo_via";
export const FIRST_TOUCH_DAYS = 14;
const TOKEN = /^[23456789abcdefghjkmnpqrstvwxyz]{10}$/;

export type FirstTouch = { token: string; at: number };

export function readFirstTouch(value: string | null | undefined, now: number): FirstTouch | null {
  if (!value) return null;
  const [token, at] = value.split(".");
  const when = Number(at);
  if (!token || !TOKEN.test(token) || !Number.isFinite(when)) return null;
  if (when > now + 5 * 60_000 || now - when > FIRST_TOUCH_DAYS * 86_400_000) return null;
  return { token, at: when };
}

export function firstTouchCookie(token: string, now: number, secure: boolean): string {
  return [
    `${FIRST_TOUCH_COOKIE}=${token}.${now}`,
    "Path=/",
    `Max-Age=${FIRST_TOUCH_DAYS * 86_400}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
