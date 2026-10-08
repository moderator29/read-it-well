/**
 * WHOSE PAGE THIS IS, FOR THE SERVICE WORKER (8 October 2026).
 *
 * `public/sw.js` keeps every page a member opens, so the screen they were just
 * on opens again with no signal, the way a native app does. A kept page is
 * personal, so the worker has to know whose it is, and it must not take a
 * page's word for that: a page is rendered by the server, and the server
 * stamps it as it goes out (`proxy.ts`), twice:
 *
 *   - the `x-vallo-viewer` RESPONSE header, which the worker reads before it
 *     reads a byte of the body; and
 *   - a `<meta name="x-vallo-viewer">` in the document head (`app/layout.tsx`),
 *     carrying the same value and the path the server rendered. This one is
 *     for the Android app: Capacitor fetches every document itself to put its
 *     bridge in, and hands the page its own default headers rather than ours,
 *     following any redirect on the way. The rendered path is what lets the
 *     worker refuse to keep a sign-in page under the address of a listing.
 *
 * The value is opaque: a digest of the account id under a fixed label, cut to
 * 16 hex characters, or `anon` for somebody signed out. It identifies nobody
 * to anybody who reads it; it only lets the worker tell two accounts on one
 * phone apart, keep each one's pages under its own name, and delete the
 * previous one's the moment a page names somebody else.
 *
 * No stamp at all means "do not keep this": a request whose session could
 * not be read (an auth outage), a response that sets a cookie (a refreshed
 * session), and every non-GET and RSC request.
 */

export const VIEWER_HEADER = "x-vallo-viewer";
/** The path the server rendered, carried to the layout beside the viewer. */
export const VIEWER_PATH_HEADER = "x-vallo-viewer-path";
export const ANON_VIEWER = "anon";

/** The header the worker sends when it warms a page in the background. */
export const WARM_HEADER = "x-vallo-warm";

/** What a stamp may look like; anything else is ignored. */
export const VIEWER_PATTERN = /^(anon|[a-f0-9]{16,64})$/;

const LABEL = "vallo-offline-viewer:";

/** The stamp for one reader: a 16-hex digest of their id, or `anon`. */
export async function viewerStamp(userId: string | null): Promise<string> {
  if (!userId) return ANON_VIEWER;
  const bytes = new TextEncoder().encode(LABEL + userId);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  let hex = "";
  for (let i = 0; i < 8; i += 1) hex += digest[i]!.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Whether a request's answer should carry the stamp: a plain GET for a page
 * (a document load or the worker's background warm), never an RSC fetch, a
 * prefetch or anything that writes.
 */
export function wantsViewerStamp(request: { method: string; headers: Headers }): boolean {
  if (request.method !== "GET") return false;
  const headers = request.headers;
  if (headers.get("rsc") === "1" || headers.has("next-router-prefetch") || headers.has("next-action")) return false;
  if (headers.get(WARM_HEADER) === "1") return true;
  const dest = headers.get("sec-fetch-dest");
  return dest === null || dest === "document";
}

/**
 * The meta tag's two values, read back from the request headers the proxy set
 * for this render, or null when this render carries no stamp. The path must
 * be a plain path: anything else is dropped rather than echoed into the head.
 */
export function viewerMeta(headers: { get(name: string): string | null }): { viewer: string; path: string } | null {
  const viewer = (headers.get(VIEWER_HEADER) ?? "").trim().toLowerCase();
  const path = headers.get(VIEWER_PATH_HEADER) ?? "";
  if (!VIEWER_PATTERN.test(viewer)) return null;
  if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/]*$/.test(path) || path.length > 512) return null;
  return { viewer, path };
}
