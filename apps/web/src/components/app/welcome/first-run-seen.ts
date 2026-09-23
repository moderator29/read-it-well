import { safeReturnPath } from "@/lib/security/return-path";

/**
 * "Seen once", for somebody with no account yet.
 *
 * A signed-in person's first run is remembered on their profile row
 * (`settings.welcomeSeen`, written by `markWelcomeSeen`). A stranger has no
 * row, so the device remembers instead: one first-party cookie, readable by
 * the server so `/welcome` can decide BEFORE it paints whether to show the
 * slides, jump to the choice, or carry on to where the person was going.
 *
 * A cookie rather than localStorage for exactly that reason. Storage is only
 * visible to script after hydration, which would mean painting the first
 * slide and then snapping away from it on every return visit.
 *
 * Nothing in it identifies anybody: the value is the word `seen`.
 */
export const FIRST_RUN_COOKIE = "vallo_first_run";
export const FIRST_RUN_SEEN = "seen";

/* 400 days is the ceiling browsers now enforce on any cookie, so asking for
   longer is asking for this. */
export const FIRST_RUN_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * The query flag a first-run exit carries ONLY when the cookie would not
 * stick (storage blocked). A page that sends first-time visitors to
 * `/welcome` must honour it, or a browser that refuses cookies would bounce
 * between the two forever.
 */
export const FIRST_RUN_PASSED_PARAM = "welcomed";

export function isFirstRunSeen(value: string | null | undefined): boolean {
  return value === FIRST_RUN_SEEN;
}

/** The exact Set-Cookie style string the client writes. Exported for the test. */
export function firstRunCookieString(secure: boolean): string {
  return [
    `${FIRST_RUN_COOKIE}=${FIRST_RUN_SEEN}`,
    "Path=/",
    `Max-Age=${FIRST_RUN_MAX_AGE}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/**
 * Record that this device has been shown first run. Client only. Returns
 * whether the cookie is really there afterwards, so the caller can fall back
 * to the query flag rather than trust a write that a browser silently refused.
 */
export function rememberFirstRunSeen(): boolean {
  if (typeof document === "undefined") return false;
  try {
    document.cookie = firstRunCookieString(window.location.protocol === "https:");
    return document.cookie
      .split(";")
      .some((part) => part.trim() === `${FIRST_RUN_COOKIE}=${FIRST_RUN_SEEN}`);
  } catch {
    return false;
  }
}

/**
 * The destination a first run may hand somebody on to.
 *
 * Same-origin paths only, through the platform's one return-path guard, and
 * never back to `/welcome` or `/start` themselves, which would be a loop with
 * extra steps.
 */
export function firstRunNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const q = raw.indexOf("?");
  const pathname = q === -1 ? raw : raw.slice(0, q);
  const search = q === -1 ? "" : raw.slice(q);
  const safe = safeReturnPath(pathname, search);
  if (!safe) return null;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/welcome" || path === "/start") return null;
  return safe;
}

/** True when `next` is one of the two doors rather than a place inside. */
export function isAuthDoor(next: string | null): boolean {
  if (!next) return false;
  return /^\/sign-(?:in|up)(?:[/?#]|$)/.test(next);
}

/**
 * Where a page sends a first-time visitor so they meet first run, keeping
 * the address they asked for. For `sign-in` and `sign-up` to call (see the
 * request in `docs/SESSION_B_SCOPE.md`): `redirect(firstRunHref("/sign-up"))`
 * when the cookie is absent and the `welcomed` flag is not set.
 */
export function firstRunHref(next: string): string {
  return `/welcome?next=${encodeURIComponent(next)}`;
}

/** Append the passed flag to a same-origin path, for the storage-blocked case. */
export function withPassedFlag(path: string): string {
  const [base, hash = ""] = path.split("#", 2) as [string, string?];
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${FIRST_RUN_PASSED_PARAM}=1${hash ? `#${hash}` : ""}`;
}

/**
 * THE MARKET A STRANGER TAPPED, CARRIED TO THE QUESTION THAT ASKS FOR IT (V-18).
 *
 * A landing tile such as Apartments sends a stranger to `/search?type=apartment`,
 * which the wall turns into an account choice. After sign-up the interests
 * question asks which markets they came for, and it would be a small insult to
 * ask with nothing ticked. So the first run writes the tile's market here, and
 * `/welcome` reads it back to pre-tick that one card.
 *
 * It is a suggestion, not an answer: nothing is saved until the person presses
 * Continue, and a person who has already answered is never shown it. The value
 * is one `property_type` word, it identifies nobody, and it lasts a day.
 */
export const FIRST_INTEREST_COOKIE = "vallo_first_interest";
export const FIRST_INTEREST_MAX_AGE = 60 * 60 * 24;

/** The Set-Cookie style string for the carried market. Exported for the test. */
export function firstInterestCookieString(value: string, secure: boolean): string {
  return [
    `${FIRST_INTEREST_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${FIRST_INTEREST_MAX_AGE}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** Client only. Quiet: a refused cookie only means nothing is pre-ticked. */
export function rememberFirstInterest(value: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = firstInterestCookieString(value, window.location.protocol === "https:");
  } catch {
    /* Storage blocked; the question simply arrives unticked. */
  }
}
