/**
 * ONE PAGE OF THE CATALOGUE, FULL (OPS-11).
 *
 * The database narrows and orders; `matchesFilter` still has the last word
 * over every row (the budget is judged on the one price a row leads with, and
 * party size on what it sleeps). So a batch the database returns can shrink in
 * memory, and a page cut from one batch would come back short, which reads as
 * the end of the results when it is not.
 *
 * This keeps reading in order until the page is full or the source runs out.
 * The cursor moves over every row CONSUMED, kept or not, and never past the
 * last row the page shows, so the next page starts at exactly the next row
 * and nothing is shown twice or skipped.
 */

export type Batch<T, K> = { item: T; key: K }[];

export type PageFill<T, K> = {
  items: T[];
  /** The key the next page continues after, or null when there is no next page. */
  next: K | null;
};

export async function fillPage<T, K>(options: {
  pageSize: number;
  after: K | null;
  /** Rows strictly after `after`, in order, at most `limit` of them. */
  fetchBatch: (after: K | null, limit: number) => Promise<Batch<T, K>>;
  accept: (item: T) => boolean;
  /** Rows read per round trip. */
  batchSize?: number;
  /** A bound on round trips, so a filter the database cannot narrow cannot read the whole table. */
  maxBatches?: number;
}): Promise<PageFill<T, K>> {
  const { pageSize, accept } = options;
  const batchSize = Math.max(options.batchSize ?? pageSize * 2, 1);
  const maxBatches = options.maxBatches ?? 6;

  const items: T[] = [];
  let cursor = options.after;
  let lastShown: K | null = options.after;

  for (let round = 0; round < maxBatches; round++) {
    const batch = await options.fetchBatch(cursor, batchSize);
    for (const row of batch) {
      if (items.length === pageSize) {
        // The page is full. One more matching row means there is a next page.
        if (accept(row.item)) return { items, next: lastShown };
        cursor = row.key;
        continue;
      }
      cursor = row.key;
      if (accept(row.item)) {
        items.push(row.item);
        lastShown = row.key;
      }
    }
    if (batch.length < batchSize) {
      // The source ran out. Rows skipped after the last shown one match nothing.
      return { items, next: null };
    }
  }

  /* The round-trip bound was reached. A short page here would say "that is
     everything" when it is not, so the page continues from the last row read
     when it is not yet full, and from the last row shown when it is. */
  return { items, next: items.length === pageSize ? lastShown : cursor };
}
