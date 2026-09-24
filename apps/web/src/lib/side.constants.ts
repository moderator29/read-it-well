/**
 * The side axis, shared by server and client.
 *
 * Vallo is one product with two faces. The PROPERTY side is rentals, sales,
 * agents and inspections; the STAYS side is hotels, serviced apartments, guest
 * houses, resorts, shortlets and restaurants. Same account, same wallet, same
 * inbox, same backend; two shells. A person flips between them with one
 * control and the whole app turns over.
 *
 * Built as an exact structural twin of the workspace mode pair
 * (`mode.constants.ts` and `mode.ts`): the constants here are client-safe, the
 * cookie reader in `side.ts` is server-only. `nf_mode` (personal or agent) is
 * a different axis and is not touched by anything in this file.
 *
 * THE SIDE IS A VIEW PREFERENCE, NEVER AN AUTHORISATION. Nothing reads it to
 * decide what somebody may do; RLS and the role reads decide that. It decides
 * what is painted.
 */
export const SIDE_COOKIE = "nf_side";

export type Side = "property" | "stays";

export const DEFAULT_SIDE: Side = "property";

export const SIDE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isSide(value: string | undefined | null): value is Side {
  return value === "property" || value === "stays";
}

export function otherSide(side: Side): Side {
  return side === "stays" ? "property" : "stays";
}

/** Where each side opens: the root the flip lands on. */
export const SIDE_HOME: Record<Side, string> = {
  property: "/home",
  stays: "/stays",
};

/**
 * The URL wins over the cookie, always.
 *
 * The cookie decides the shell for every shared route (wallet, messages,
 * settings, notifications, profile, feed). A side-owned route forces its
 * side regardless of the cookie, so a hotel link shared into a chat opens in
 * the Stays shell for everybody, and an agent deep link always lands in
 * Property. Notification taps obey the same rule. Everything shared returns
 * null and the cookie decides.
 *
 * `/home` and `/search` stay the Property roots on purpose: their URLs are
 * the product's muscle memory and every existing link. `/stays` and
 * `/stays/search` are the Stays roots.
 */
const STAYS_PATHS = /^\/(stays|stay|restaurants|restaurant|trips|host)(\/|$)/;
const PROPERTY_PATHS = /^\/(home|search|agent|listing|rent|inspections)(\/|$)/;

/**
 * Plans (`/bookings`) belongs to neither side, so the cookie decides, EXCEPT
 * for a DEEP LINK that says where it came from: `?from=stays` or
 * `?from=property` (a paid stay, a booked table, the inspections redirect).
 * Only `from` moves the shell. The page's own filter uses `?side=`, and
 * filtering Plans to one half must never flip the shell or the cookie
 * (V-76 review, twice).
 */
export function sideOfPlansQuery(
  pathname: string,
  params: { get(name: string): string | null },
): Side | null {
  if (!/^\/bookings(\/|$)/.test(pathname)) return null;
  const from = params.get("from");
  if (from === "stays") return "stays";
  if (from === "property") return "property";
  return null;
}

export function sideOfPath(pathname: string): Side | null {
  if (STAYS_PATHS.test(pathname)) return "stays";
  if (PROPERTY_PATHS.test(pathname)) return "property";
  return null;
}

/**
 * The cookie write, in one place, so the switch control and the deep-link
 * reconciler cannot spell it two ways.
 */
export function writeSideCookie(side: Side): void {
  document.cookie = `${SIDE_COOKIE}=${side}; path=/; max-age=${SIDE_COOKIE_MAX_AGE}; samesite=lax`;
}

/** Read the cookie on the client, for the reconciler only. */
export function readSideCookie(): Side | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIDE_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return isSide(value) ? value : null;
}
