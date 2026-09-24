/**
 * THE CATALOGUE'S KEYSET CURSOR (OPS-11).
 *
 * The catalogue is read in one of two total orders, each ending in `id` so no
 * two rows share a position:
 *
 *   default   featured desc, published_at desc nulls last, created_at desc, id desc
 *   move-in   total_move_in_cost_minor asc nulls last, then the default order
 *
 * `listings_catalogue_keyset_idx` and `listings_move_in_keyset_idx` are those
 * orders, partial on published rows.
 *
 * A cursor is the sort key of the last row a page consumed. The next page is
 * every row strictly after it in the same order, written as one PostgREST
 * logic tree so the rest of the catalogue's filters still apply. A row-value
 * comparison cannot be used because the move-in order mixes directions and
 * `published_at` may be null; the tree spells out, column by column, what
 * "after" means, including where a null sorts. The same predicate, written in
 * SQL, is walked against the live catalogue by `supabase/tests/probes/ops-11.sql`.
 *
 * The cursor travels in the address (`?after=`), so everything decoded from it
 * is validated to a strict shape before it is put inside a filter: a value that
 * could close a quote or a group is refused, and a refused cursor reads as the
 * first page rather than as an error.
 */

export type CatalogueOrder = "default" | "move-in";

/** The sort key of one row, exactly as PostgREST returned it. */
export type CursorKey = {
  featured: boolean;
  /** Timestamps are carried as the database wrote them, to the microsecond, so equality holds. */
  publishedAt: string | null;
  createdAt: string;
  id: string;
  /** Only in the move-in order. */
  moveInMinor?: number | null;
};

/** The row fields a key is read from. Both catalogue selects carry all five. */
export type KeyedRow = {
  id: string;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  total_move_in_cost_minor: number | null;
};

export function keyOfRow(row: KeyedRow, order: CatalogueOrder): CursorKey {
  const key: CursorKey = {
    featured: row.featured,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    id: row.id,
  };
  if (order === "move-in") key.moveInMinor = row.total_move_in_cost_minor;
  return key;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)$/;

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && TIMESTAMP.test(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

type Wire = { v: 1; o: "d" | "m"; f: boolean; p: string | null; c: string; i: string; t?: number | null };

/** The opaque value that goes in `?after=`. */
export function encodeCursor(order: CatalogueOrder, key: CursorKey): string {
  const wire: Wire = { v: 1, o: order === "move-in" ? "m" : "d", f: key.featured, p: key.publishedAt, c: key.createdAt, i: key.id };
  if (order === "move-in") wire.t = key.moveInMinor ?? null;
  return Buffer.from(JSON.stringify(wire), "utf8").toString("base64url");
}

/**
 * The key a cursor names, or null when it is malformed, from another order, or
 * carries anything but the exact shapes a key is made of.
 */
export function decodeCursor(order: CatalogueOrder, raw: string | null | undefined): CursorKey | null {
  if (!raw || raw.length > 400 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  let wire: unknown;
  try {
    wire = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (wire === null || typeof wire !== "object") return null;
  const w = wire as Record<string, unknown>;
  if (w.v !== 1 || w.o !== (order === "move-in" ? "m" : "d")) return null;
  if (typeof w.f !== "boolean") return null;
  if (w.p !== null && !isTimestamp(w.p)) return null;
  if (!isTimestamp(w.c)) return null;
  if (typeof w.i !== "string" || !UUID.test(w.i)) return null;
  const key: CursorKey = { featured: w.f, publishedAt: w.p as string | null, createdAt: w.c, id: w.i };
  if (order === "move-in") {
    if (w.t !== null && !isSafeInteger(w.t)) return null;
    key.moveInMinor = w.t as number | null;
  }
  return key;
}

/* Every value is quoted, so a timestamp's `:` and `.` are data, not syntax.
   The validation above guarantees nothing inside can contain a quote. */
const q = (value: string | number | boolean) => `"${String(value)}"`;

/** created_at desc, id desc: strictly after (c, i). */
function afterCreated(key: CursorKey): string {
  return `or(created_at.lt.${q(key.createdAt)},and(created_at.eq.${q(key.createdAt)},id.lt.${q(key.id)}))`;
}

/** published_at desc nulls last, then created_at, then id. */
function afterPublished(key: CursorKey): string {
  if (key.publishedAt === null) {
    // Past the last dated row: only undated rows remain, in created_at order.
    return `and(published_at.is.null,${afterCreated(key)})`;
  }
  const p = q(key.publishedAt);
  return `or(published_at.lt.${p},published_at.is.null,and(published_at.eq.${p},${afterCreated(key)}))`;
}

/** The default order: featured desc first. */
function afterDefault(key: CursorKey): string {
  const sameFeatured = `and(featured.eq.${q(key.featured)},${afterPublished(key)})`;
  // Featured rows come first, so after a featured row the unfeatured ones all follow.
  return key.featured ? `or(featured.eq.${q(false)},${sameFeatured})` : `or(${sameFeatured})`;
}

/**
 * The filter for "strictly after this key", as the argument to one `.or()`.
 * PostgREST ANDs it with every other filter on the read.
 */
export function keysetFilter(order: CatalogueOrder, key: CursorKey): string {
  const tail = afterDefault(key);
  let tree: string;
  if (order === "default") {
    tree = tail;
  } else if (key.moveInMinor === null || key.moveInMinor === undefined) {
    // Past the last costed row: only uncosted rows remain, in the default order.
    tree = `and(total_move_in_cost_minor.is.null,${tail})`;
  } else {
    const t = q(key.moveInMinor);
    tree = `or(total_move_in_cost_minor.gt.${t},total_move_in_cost_minor.is.null,and(total_move_in_cost_minor.eq.${t},${tail}))`;
  }
  // `.or(x)` wraps its argument in or(...) itself, so the outer group is unwrapped.
  return unwrapOuter(tree);
}

/** `or(a,b)` becomes `a,b`; `and(a,b)` stays one term of a one-term or. */
function unwrapOuter(tree: string): string {
  return tree.startsWith("or(") ? tree.slice(3, -1) : tree;
}
