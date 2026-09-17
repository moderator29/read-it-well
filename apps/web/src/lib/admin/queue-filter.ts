import "server-only";

/**
 * The read half of the console's one queue frame.
 *
 * `app/admin/_components/QueueFilters.tsx` is the write half: it puts a search
 * box, a status chip row, a date range and a pager into the address bar. This
 * is what a query does with what comes back out of it.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS A MODULE AND NOT THREE LINES IN EACH QUERY.
 *
 * Nineteen destinations, and the narrowing has to mean the same thing on all of
 * them or the console has nineteen dialects. Two decisions in particular are
 * easy to get quietly wrong in one place out of nineteen:
 *
 * THE DAY BOUNDARY. `created_at` is a `timestamptz` and the operator typed a
 * calendar date. A bare `.gte("2026-09-16")` is read by Postgres as UTC
 * midnight, which is 01:00 in Lagos, so a row created at half past midnight
 * Lagos time silently falls outside the range that was asked for. Everything
 * else in this console is anchored to Lagos and so is this.
 *
 * THE UNRECOGNISED STATUS. `?status=` is hand-editable. Passing an unknown
 * string straight into `.eq()` returns an empty queue, which an operator reads
 * as "there is no work here" rather than as "that is not a status". It is
 * dropped instead, so the queue answers with everything and the chip simply
 * shows as unselected. A console that is wrong about how much work is waiting
 * is worse than one that does not say.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY NOT HERE.
 *
 * No generic "apply this filter to any PostgREST builder" helper. The builders
 * are typed per table and per selected column set, and the only way to write
 * one function over all of them is a cast that throws away exactly the type
 * checking that stops a filter naming a column the table does not have. Each
 * query spends its own two lines and keeps its own types.
 */

/** One page of a queue. A support desk, not an export. */
export const QUEUE_PAGE_SIZE = 40;

/** Everything a console queue can be narrowed by. All of it optional. */
export type AdminQueueFilter = {
  /** Free text. What it searches is the queue's own business. */
  q?: string;
  /** One value of that queue's status enum. Anything else is ignored. */
  status?: string;
  /** Lagos calendar days, inclusive, against the queue's date column. */
  from?: string;
  to?: string;
  /** Rows already passed over. Always a multiple of the page size in practice. */
  offset?: number;
};

/** The first instant of a Lagos calendar day, as PostgREST wants it. */
export function lagosDayStart(day: string): string {
  return `${day}T00:00:00+01:00`;
}

/** The last instant of a Lagos calendar day. */
export function lagosDayEnd(day: string): string {
  return `${day}T23:59:59.999+01:00`;
}

/**
 * A status from the address bar, checked against that queue's real enum.
 *
 * `allowed` comes from the generated `Constants` in `database.types.ts` at every
 * call site, never from a list written by hand beside it. A hand-written list is
 * the thing that does not notice when a value is added, which is exactly how
 * `booking_status` ended up offering three chips for a five-value column.
 */
export function pickStatus<T extends string>(
  allowed: readonly T[],
  value: string | undefined,
): T | undefined {
  return allowed.find((status) => status === value);
}

/** The rows this page covers: `[from, to]` for a PostgREST `.range()`. */
export function pageRange(filter: AdminQueueFilter | undefined, pageSize = QUEUE_PAGE_SIZE): {
  from: number;
  to: number;
} {
  const offset = filter?.offset && filter.offset > 0 ? filter.offset : 0;
  /* One more than the page, so the caller can tell "there is another page" from
     "this is the last one" without a second count query. `QueuePager` offers
     Next only on that evidence, which is the only evidence a cursor read has. */
  return { from: offset, to: offset + pageSize };
}

/**
 * Trim the extra row off and say whether it was there.
 *
 * The read asks for `pageSize + 1` rows purely so this can answer `full`
 * honestly. Without it the console either prints a Next link that leads to an
 * empty page, or runs a `count` query on every load to avoid doing so.
 */
export function takePage<T>(rows: T[], pageSize = QUEUE_PAGE_SIZE): { rows: T[]; full: boolean } {
  return { rows: rows.slice(0, pageSize), full: rows.length > pageSize };
}

/** True when anything at all is narrowing this queue. */
export function isNarrowed(filter: AdminQueueFilter | undefined): boolean {
  if (!filter) return false;
  return Boolean(
    (filter.q && filter.q.trim().length > 0) || filter.status || filter.from || filter.to,
  );
}

/**
 * A search term, safe to interpolate into a PostgREST `.or()` expression.
 *
 * ---------------------------------------------------------------------------
 * `.ilike(col, value)` AND `.or(expression)` DO NOT ESCAPE THE SAME THINGS, and
 * the difference is invisible at the call site.
 *
 * `.ilike("body", "%lagos, ikeja%")` hands the value over as its own argument,
 * so the client encodes it and a comma is just a comma. `.or()` hands over a
 * whole FILTER EXPRESSION, and that grammar is comma-delimited: the client has
 * no way to know which characters in the string you meant as data. So an
 * interpolated value ends the condition wherever the operator happened to type
 * a comma.
 *
 * Proven by building the query and reading its URL rather than by argument.
 * Term `lagos, ikeja` produced:
 *
 *   or=(headline.ilike.%lagos,+ikeja%,standfirst.ilike.%lagos,+ikeja%)
 *
 * which PostgREST reads as four conditions, two of them (`+ikeja%`) not
 * conditions at all. The moderator gets an error, not results, and the term
 * that does it is an ordinary one: "lagos, ikeja" is how a person types two
 * places.
 *
 * WORSE, AND THE REASON THIS IS A FUNCTION RATHER THAN A NOTE. The grammar's
 * grouping characters go through too. Term `x)or(id.gt.0` produced:
 *
 *   or=(headline.ilike.%x)or(id.gt.0%,...)
 *
 * The `)` closes the group early. That is a user-supplied string changing the
 * SHAPE of the query rather than its values. Every caller here is behind
 * `requireAdmin()` and RLS still applies, so this is not a way into data, and a
 * console whose filters can be restructured by what somebody pastes into a
 * search box is still a console that cannot be trusted to have shown you
 * everything.
 *
 * The fix is PostgREST's own answer: wrap the value in double quotes, and
 * escape backslashes and inner double quotes so the quoting cannot itself be
 * closed early. Order matters, backslashes first.
 */
export function orSafe(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
