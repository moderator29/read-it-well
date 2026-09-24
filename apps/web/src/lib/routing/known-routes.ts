/**
 * OPS-17: THE FIRST PATH SEGMENTS THIS APP ANSWERS AT.
 *
 * A signed-out request for a closed page is sent to sign-in, and so was a
 * request for an address that does not exist at all: every mistyped or dead
 * link became a 307 to a sign-in screen, and no signed-out 404 ever existed.
 * The proxy now answers an unknown first segment with the site's real 404
 * instead. `known-routes.test.ts` walks `src/app` and fails when a routable
 * directory is added or removed without this list following it. The
 * extra names are `next.config.ts` redirects (`/agents…`, `/support`, and
 * `/trips`, folded into Plans by V-76).
 */
export const KNOWN_TOP_SEGMENTS: ReadonlySet<string> = new Set([
  "about", "admin", "agent", "agents", "api", "areas", "around", "assistant", "auth", "bookings",
  "cancellations", "careers", "check", "checkout", "contact", "delete-account", "docs", "escrow",
  "eula", "forgot-password", "gallery", "help", "home", "home-or-landing", "host", "inspections",
  "landlord", "legal", "listing", "messages", "notifications", "offline", "open", "post",
  "preview", "price", "privacy", "profile", "r", "record", "rent", "reset-password", "restaurant",
  "restaurants", "s", "safe", "safety", "saved", "search", "settings", "sign-in", "sign-up",
  "standards", "start", "stay", "stays", "stories", "styleguide", "support", "tenancy", "terms",
  "trips", "u", "verification", "wallet", "welcome",
]);

/** The redirect sources in `next.config.ts`, which have no directory. */
export const REDIRECT_ONLY_SEGMENTS: ReadonlySet<string> = new Set(["agents", "support", "trips"]);

/** Whether the first segment of `path` is one this app can answer at. */
export function isKnownRoute(path: string): boolean {
  const first = path.split("/").filter(Boolean)[0];
  return first === undefined || KNOWN_TOP_SEGMENTS.has(first);
}
