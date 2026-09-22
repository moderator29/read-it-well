/**
 * THE LANDING RULE, BY ADDRESS (lead ruling R-E).
 *
 * "Entering the console lands on the overview, every time, before any
 * desk", and that includes arriving by address: a typed or bookmarked desk
 * URL, a link somebody sent, or the sign-in bounce (`/sign-in?next=/admin/money`
 * returns to the desk). The first request to any `/admin/**` desk in a
 * browser session goes to `/admin?next=<desk>` first; the overview offers
 * the desk as its first link.
 *
 * HOW A SESSION IS KNOWN. The overview sets a session cookie (no expiry, so
 * the browser drops it when it closes) holding the operator's user id. The
 * layout reads it on every request: a cookie for a different user, or none,
 * is a new entry. The proxy is not touched; see `EntryGate.tsx`.
 */
export const ENTRY_COOKIE = "nf_admin_entry";

/** A desk path it is safe to offer back: under `/admin/`, no scheme, no `//`. */
export function safeDesk(next: string | null | undefined): string | null {
  if (!next) return null;
  let path: string;
  try {
    path = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (!path.startsWith("/admin/") || path.startsWith("//") || path.includes("://") || path.includes("\\")) return null;
  if (path.length > 300) return null;
  return path;
}

/**
 * Where a request should go. `entered` is whether this browser session has
 * already opened the overview as this operator.
 */
export function entryRedirect(pathname: string, search: string, entered: boolean): string | null {
  if (entered) return null;
  if (pathname === "/admin" || pathname === "/admin/") return null;
  if (!pathname.startsWith("/admin/")) return null;
  const desk = `${pathname}${search && search !== "?" ? (search.startsWith("?") ? search : `?${search}`) : ""}`;
  return `/admin?next=${encodeURIComponent(desk)}`;
}
