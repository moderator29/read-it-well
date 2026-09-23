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

/**
 * THE SERVER-SIDE ENTRY (`/admin/enter`, a route handler), so the landing
 * rule holds with JavaScript off. The overview writes the entry cookie in the
 * browser; an operator without JavaScript never gets it and would be offered
 * the overview again at every desk. Every link that means "go on into the
 * console" (the overview's Continue, the gate's plain link) goes through
 * `/admin/enter?next=<target>`, which checks `requireAdmin`, sets the same
 * cookie on the server and answers 303 to the overview (never to a desk).
 * The gate's link goes through it; the overview's Continue is a plain link
 * to the desk, because by the time anyone presses it the cookie is set, by
 * the overview in the browser or by `/admin/enter` without JavaScript.
 */
export const ENTER_PATH = "/admin/enter";

/** The cookie as the browser writes it in `EntryGate`: session only, console path, Lax, readable by the page. */
export const ENTRY_COOKIE_OPTIONS = { path: "/admin", sameSite: "lax", httpOnly: false } as const;

/** The link that enters the console on the server and lands on `target`. */
export function enterHref(target: string): string {
  return `${ENTER_PATH}?next=${encodeURIComponent(target)}`;
}

/**
 * Where `/admin/enter` may send the operator: ONLY the overview, bare
 * (`/admin`) or carrying a desk (`/admin?next=<desk>`). Never a desk itself:
 * a typed, bookmarked or sent `/admin/enter?next=/admin/money` would
 * otherwise skip the overview, which R-E forbids (third closing audit). A
 * bare desk is turned into the overview carrying it; anything else (another
 * site, another part of the app, the entry route itself, a path that climbs
 * out with `..`) lands on the bare overview.
 */
export function enterTarget(next: string | null | undefined): "/admin" | `/admin?next=${string}` {
  if (!next) return "/admin";
  if (next === "/admin" || next === "/admin/") return "/admin";
  const desk = next.startsWith("/admin?")
    ? allowedDesk(new URLSearchParams(next.slice("/admin?".length)).get("next"))
    : allowedDesk(next);
  return desk ? `/admin?next=${encodeURIComponent(desk)}` : "/admin";
}

function allowedDesk(next: string | null): string | null {
  const desk = safeDesk(next);
  if (!desk) return null;
  const path = desk.split(/[?#]/)[0] ?? desk;
  if (path.split("/").some((part) => part === ".." || part === ".")) return null;
  if (path === ENTER_PATH || path.startsWith(`${ENTER_PATH}/`)) return null;
  return desk;
}
