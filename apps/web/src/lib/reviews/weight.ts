/**
 * WHICH REVIEWS A PUBLIC LIST READS (V-58).
 *
 * A review written by an account that shares an identity key with the lister
 * (a mailbox, a confirmed phone, a card, a bank account) is kept and does not
 * count. The register that says which reviews those are, `weight_withheld`, is
 * STAFF ONLY: a list of withheld review ids readable by anybody would be a
 * public accusation against the person who wrote each one.
 *
 * So public lists read `public.reviews_counted` instead of `reviews`: the same
 * rows the reviews select policy shows, less the withheld ones, and always
 * including the reader's own. The author of a withheld review still sees it,
 * and no read hands anybody a list of what was withheld.
 *
 * The stamp itself is a BEFORE INSERT trigger in the database, so the
 * catalogue's rating and the badge award (after-insert triggers) never count a
 * self-review either; nothing in this file is needed for those.
 *
 * FAILS OPEN, ONLY WHEN THE VIEW IS MISSING. Before the migration is applied
 * the view does not exist, and the read falls back to the table, which is the
 * state the page was in before V-58. Any other error is returned as it is, so
 * a failure never widens what a reader sees.
 */

export const COUNTED_REVIEWS = "reviews_counted";

type Result<T> = { data: T[] | null; error: unknown };

/** PostgREST's "no such relation" answers, before and after its schema cache. */
export function isMissingRelation(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "42P01" || code === "PGRST205";
}

/**
 * Run a read against the counted view, and against the table only when the
 * view does not exist yet.
 */
export async function readCountedReviews<T>(run: (table: string) => PromiseLike<Result<T>>): Promise<Result<T>> {
  const counted = await run(COUNTED_REVIEWS);
  if (counted.error && isMissingRelation(counted.error)) return run("reviews");
  return counted;
}
