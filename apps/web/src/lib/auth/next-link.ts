import { safeReturnPath } from "@/lib/security/return-path";

/**
 * UX-02: an auth door that keeps where the person was going.
 *
 * `withNext("/sign-up", "/listing/abc")` is `/sign-up?next=%2Flisting%2Fabc`.
 * A `next` that is not a safe same-origin path is dropped, not carried, so a
 * link built here can never become an open redirect.
 */
export function withNext(path: string, next: string | null | undefined): string {
  if (!next) return path;
  const safe = safeReturnPath(next, "");
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}

/**
 * The destination inside an auth address: `/sign-in?next=/search` gives
 * `/search`. A plain path is its own destination. Anything else gives null.
 */
export function destinationOf(next: string | null | undefined): string | null {
  if (!next) return null;
  if (/^\/sign-(?:in|up)(?:[/?#]|$)/.test(next)) {
    const inner = new URL(next, "https://x.invalid").searchParams.get("next");
    return inner ? safeReturnPath(inner, "") : null;
  }
  return safeReturnPath(next, "");
}
