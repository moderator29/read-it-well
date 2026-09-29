import { siteUrl } from "@/lib/site";

/**
 * IS THIS POST FROM OUR OWN PAGES?
 *
 * Server actions get Next's own Origin check. A route handler that acts on the
 * session cookie does not, so it asks here. SameSite=Lax already keeps the
 * cookie off a cross-site POST in current browsers; this is the second lock for
 * the browsers and embedded views where that is not true.
 *
 * A browser always sends `Origin` on a cross-site POST, so a present Origin
 * must be ours and `Sec-Fetch-Site` must not say cross-site. A request with
 * neither header is not a browser acting for somebody else, and it still has
 * to carry that person's session to do anything.
 */
export function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    /* no request origin */
  }
  try {
    allowed.add(new URL(siteUrl()).origin);
  } catch {
    /* no configured site */
  }
  return allowed.has(origin);
}
