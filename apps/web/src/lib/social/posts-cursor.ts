/**
 * THE FEED CURSOR, AND WHY IT CARRIES AN ID.
 *
 * A timeline pages by keyset rather than by offset, so a post arriving while
 * somebody reads cannot shift a page under them. The cursor used to be the
 * last row's `created_at` alone, read back with a strict `<`, which assumes
 * no two posts share an instant.
 *
 * THEY DO, IN BULK. `private.open_place_entries` writes two SYSTEM entries for
 * every place with `now()`, and `now()` is the TRANSACTION timestamp, so every
 * place opened by one migration carries the identical `created_at` down to the
 * microsecond. On the everywhere timeline that meant page one served twenty
 * rows at instant T and handed back T; page two asked for `created_at < T` and
 * stepped straight over every remaining row at T. Hundreds of posts were
 * unreachable and nothing said so: the feed simply ended early.
 *
 * So the read orders by `created_at desc, id desc`, which is a TOTAL order
 * because `id` is the primary key and no two rows can tie, and the cursor
 * names the exact row the page stopped on: its instant and its id. The next
 * page is everything strictly after that row in that order, an earlier instant
 * or the same instant with a smaller id. Nothing repeats, because the named
 * row is excluded; nothing is skipped, because the only rows excluded are the
 * ones already served.
 *
 * This module is pure and knows nothing about Supabase, so the shape is proved
 * without a database and both the read and the server action share one
 * definition of what a cursor is.
 */

/** A cursor as the feed reads it. `id` is null for a bare-instant cursor. */
export type FeedCursor = { at: string; id: string | null };

const SEPARATOR = "|";
const MAX_LENGTH = 120;

/** An ISO instant with an offset, as Postgres hands `timestamptz` back. */
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:?\d{2}|Z)$/;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The cursor a page hands back for the row it stopped on. */
export function encodeFeedCursor(at: string, id: string): string {
  return `${at}${SEPARATOR}${id}`;
}

/**
 * A cursor, or null for anything that is not one.
 *
 * A BARE INSTANT IS STILL A CURSOR. One minted by the previous deployment and
 * held in an open tab pages on exactly as it used to rather than being refused
 * mid-scroll, which would show somebody an error for reading too slowly.
 */
export function parseFeedCursor(raw: string | null | undefined): FeedCursor | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > MAX_LENGTH) return null;

  const cut = value.indexOf(SEPARATOR);
  if (cut === -1) return INSTANT_RE.test(value) ? { at: value, id: null } : null;

  const at = value.slice(0, cut);
  const id = value.slice(cut + 1);
  if (!INSTANT_RE.test(at) || !UUID_RE.test(id)) return null;
  return { at, id };
}
