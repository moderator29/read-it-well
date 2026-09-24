/**
 * OPS-17 / UI-16: A DETAIL PAGE FOR SOMETHING THAT IS NOT THERE IS A REAL 404,
 * DECIDED BEFORE RENDER.
 *
 * A page's `notFound()` runs after the root `loading.tsx` has started the
 * stream, so the status was already 200 and a missing listing, stay or
 * restaurant was a soft 404, indexed as a page and invisible to a link
 * checker. The proxy answers first: an id that cannot name anything, or one
 * that names nothing this caller can read, is rewritten to the not-found page
 * with a 404. Each check is the page's own read reduced to a count (the
 * caller's session and RLS, the same filters):
 *
 *   /listing/<id>     a PUBLISHED listing.
 *   /stay/<id>        an accommodation, or a PUBLISHED listing (the page
 *                     falls back to one, and redirects a tenancy).
 *   /restaurant/<id>  a restaurant business, or a PUBLISHED listing.
 *
 * Any read failure answers "exists" and lets the page decide, so an outage
 * never 404s a live page.
 */
const DETAIL_PAGE = /^\/(listing|stay|restaurant)\/([^/]+)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CountQuery = {
  eq: (column: string, value: string) => CountQuery;
} & PromiseLike<{ count: number | null; error: unknown }>;

export type ListingCounter = {
  from: (table: "listings" | "accommodations" | "businesses") => {
    select: (columns: string, options: { count: "exact"; head: true }) => CountQuery;
  };
};

type Check = { table: "listings" | "accommodations" | "businesses"; filters: [string, string][] };

function checksFor(page: string, id: string): Check[] {
  const listing: Check = { table: "listings", filters: [["status", "PUBLISHED"], ["id", id]] };
  if (page === "stay") return [{ table: "accommodations", filters: [["id", id]] }, listing];
  if (page === "restaurant") return [{ table: "businesses", filters: [["id", id], ["kind", "restaurant"]] }, listing];
  return [listing];
}

/** 1 or more, 0, or null when the read failed. */
async function count(reader: ListingCounter, check: Check): Promise<number | null> {
  try {
    let query = reader.from(check.table).select("id", { count: "exact", head: true });
    for (const [column, value] of check.filters) query = query.eq(column, value);
    const { count: n, error } = await query;
    return error || n === null ? null : n;
  } catch {
    return null;
  }
}

/** True only when `path` is a detail page for something that is not there. */
export async function detailIsMissing(path: string, reader: ListingCounter): Promise<boolean> {
  const match = DETAIL_PAGE.exec(path);
  if (!match) return false;
  let id: string;
  try {
    id = decodeURIComponent(match[2] ?? "");
  } catch {
    return true;
  }
  if (!UUID.test(id)) return true;
  for (const check of checksFor(match[1] ?? "listing", id)) {
    const n = await count(reader, check);
    if (n === null || n > 0) return false;
  }
  return true;
}

/** The listing page alone, kept for its callers. */
export async function listingIsMissing(path: string, reader: ListingCounter): Promise<boolean> {
  return /^\/listing\//.test(path) ? detailIsMissing(path, reader) : false;
}
