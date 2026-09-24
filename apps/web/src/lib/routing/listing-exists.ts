/**
 * OPS-17: A LISTING THAT DOES NOT EXIST IS A REAL 404, DECIDED BEFORE RENDER.
 *
 * The listing page's `notFound()` runs after the root `loading.tsx` has
 * started the stream, so the status was already 200 and a missing listing was
 * a soft 404, indexed as a page and invisible to a link checker. The proxy
 * answers first: an id that cannot be a listing, or one that names no
 * published listing this caller can read, is rewritten to the not-found page
 * with a 404. It is the same read the page makes (`status = PUBLISHED`, the
 * caller's own session and RLS), reduced to a count. Any read failure answers
 * "exists" and lets the page decide, so an outage never 404s a live listing.
 */
const LISTING_PAGE = /^\/listing\/([^/]+)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CountQuery = {
  eq: (column: string, value: string) => CountQuery;
} & PromiseLike<{ count: number | null; error: unknown }>;

export type ListingCounter = {
  from: (table: "listings") => {
    select: (columns: string, options: { count: "exact"; head: true }) => CountQuery;
  };
};

/** True only when `path` is a listing page for a listing that is not there. */
export async function listingIsMissing(path: string, reader: ListingCounter): Promise<boolean> {
  const match = LISTING_PAGE.exec(path);
  if (!match) return false;
  let id: string;
  try {
    id = decodeURIComponent(match[1] ?? "");
  } catch {
    return true;
  }
  if (!UUID.test(id)) return true;
  try {
    const { count, error } = await reader
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "PUBLISHED")
      .eq("id", id);
    if (error || count === null) return false;
    return count === 0;
  } catch {
    return false;
  }
}
