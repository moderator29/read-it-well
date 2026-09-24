/**
 * WHICH REVIEWS CARRY NO WEIGHT (V-58).
 *
 * A review written by an account that shares an identity key with the lister
 * (a mailbox, a phone, a device, a card, a bank account) is kept and does not
 * count. `public.weight_withheld` publishes the review ids, never the reasons,
 * so every public read of reviews can leave them out: the listing's list, its
 * average, and the landing page's quotes.
 *
 * FAILS OPEN, DELIBERATELY AND ONLY HERE. If the register cannot be read (the
 * migration not yet applied, a blip), nothing is excluded and the page shows
 * what it showed before V-58, which is the state it was already in. The
 * database side (the catalogue's rating, the agent band) never depends on this
 * read.
 */

type Reader = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        in(column: string, values: string[]): Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

export async function withheldReviewIds(supabase: unknown, reviewIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (reviewIds.length === 0) return out;
  try {
    const { data, error } = await (supabase as Reader)
      .from("weight_withheld")
      .select("subject_id")
      .eq("kind", "review")
      .in("subject_id", reviewIds);
    if (error || !Array.isArray(data)) return out;
    for (const row of data as { subject_id: string }[]) out.add(row.subject_id);
  } catch {
    return out;
  }
  return out;
}

/** The rows that count, in their order. */
export function withoutWithheld<T extends { id: string }>(rows: readonly T[], withheld: Set<string>): T[] {
  return rows.filter((row) => !withheld.has(row.id));
}
