import {
  STORAGE_BUCKETS,
  STORAGE_LIST_PAGE,
  STORAGE_MAX_DEPTH,
  STORAGE_REMOVE_BATCH,
  USER_FOLDERED_BUCKETS,
  type StorageBucket,
} from "./constants";

/**
 * Purging the object store, which is the half of a deletion that is usually
 * missed.
 *
 * A row pointing at an object is not the object. Deleting `agent_documents`
 * removes the record that a passport photograph was uploaded; the photograph
 * is still in the bucket, still fetchable with a signed URL, still there in a
 * year. So every bucket is swept, and the request is not marked PURGED until
 * that has been attempted for every one of the nine.
 *
 * TWO SOURCES FOR THE SAME BUCKET, ON PURPOSE. The purge function hands back
 * every path it can see in `storage.objects`, which is exact. This module ALSO
 * walks the person's folder through the Storage API, which is what a bucket
 * actually contains. They should agree. Where they do not, the union is
 * removed, because an object the row table has forgotten is precisely the
 * object nobody would ever find again.
 *
 * `message-attachments` is foldered by CONVERSATION id rather than by user id,
 * so there is no folder of theirs to walk and its paths come from the purge
 * function alone. It is still in the list, still attempted, and still counted,
 * because a bucket left out of the loop is a bucket that quietly fills up.
 *
 * NOTHING HERE THROWS. A bucket that cannot be reached is reported as failed
 * and the sweep continues to the next one, because seven buckets emptied is
 * better than one exception and nothing emptied. The caller turns any failure
 * into an alert and leaves the request open for the next run.
 *
 * EVERY DEPENDENCY IS HANDED IN, so `storage.test.ts` can drive the whole
 * sweep, including the paging and the recursion, with no Supabase and no
 * network.
 */

/** One entry as a listing reports it. A folder has no id. */
export type StorageEntry = { name: string; id: string | null };

export type StorageDoor = {
  /** One page of a folder. `null` means the listing itself failed. */
  list(bucket: string, prefix: string, offset: number): Promise<StorageEntry[] | null>;
  /** Remove these exact paths. Answers with the paths it could not remove. */
  remove(bucket: string, paths: string[]): Promise<{ failed: string[] } | null>;
};

export type BucketOutcome = {
  bucket: StorageBucket;
  /** How many objects the sweep decided belonged to this person. */
  found: number;
  removed: number;
  /** True when the bucket could not be listed or a removal call failed outright. */
  failed: boolean;
};

export type StoragePurgeResult = {
  buckets: BucketOutcome[];
  /** True when every bucket was swept without a failure. */
  clean: boolean;
  /** Per-bucket object counts, for the audit line and the request row. Numbers only. */
  counts: Record<string, number>;
};

/**
 * Walk one folder to a bounded depth, collecting object paths.
 *
 * Supabase lists one level at a time and marks a folder with a null id, so the
 * recursion is ours to write. The depth bound is not decoration: an unbounded
 * walk over a bucket somebody has been creative with is a way to hang a
 * scheduled job.
 */
async function walk(
  door: StorageDoor,
  bucket: string,
  prefix: string,
  depth: number,
  into: Set<string>,
): Promise<boolean> {
  if (depth > STORAGE_MAX_DEPTH) return true;

  let offset = 0;
  for (;;) {
    const page = await door.list(bucket, prefix, offset);
    if (page === null) return false;
    if (page.length === 0) return true;

    let ok = true;
    for (const entry of page) {
      if (entry.name === "" || entry.name === "." || entry.name === "..") continue;
      const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.id === null) {
        const child = await walk(door, bucket, path, depth + 1, into);
        if (!child) ok = false;
      } else {
        into.add(path);
      }
    }
    if (!ok) return false;
    if (page.length < STORAGE_LIST_PAGE) return true;
    offset += page.length;
  }
}

/** Remove a set of paths in batches, answering with how many actually went. */
async function removeAll(
  door: StorageDoor,
  bucket: string,
  paths: string[],
): Promise<{ removed: number; failed: boolean }> {
  let removed = 0;
  let failed = false;
  for (let i = 0; i < paths.length; i += STORAGE_REMOVE_BATCH) {
    const batch = paths.slice(i, i + STORAGE_REMOVE_BATCH);
    const answer = await door.remove(bucket, batch);
    if (answer === null) {
      failed = true;
      continue;
    }
    removed += batch.length - answer.failed.length;
    if (answer.failed.length > 0) failed = true;
  }
  return { removed, failed };
}

/**
 * Sweep every bucket for one person.
 *
 * `explicit` is what `public.purge_account_rows` saw in `storage.objects`,
 * keyed by bucket. It may be empty for a bucket, and for
 * `message-attachments` it is the only source there is.
 */
export async function purgeStorage(
  door: StorageDoor,
  userId: string,
  explicit: Partial<Record<string, readonly string[]>>,
  /** The buckets to sweep; every bucket unless the caller keeps some. */
  only: readonly StorageBucket[] = STORAGE_BUCKETS,
): Promise<StoragePurgeResult> {
  const buckets: BucketOutcome[] = [];
  const counts: Record<string, number> = {};

  for (const bucket of STORAGE_BUCKETS) {
    if (!only.includes(bucket)) continue;
    const paths = new Set<string>();
    let failed = false;

    for (const path of explicit[bucket] ?? []) {
      if (typeof path === "string" && path.length > 0) paths.add(path);
    }

    if (USER_FOLDERED_BUCKETS.includes(bucket)) {
      const listed = await walk(door, bucket, userId, 0, paths);
      if (!listed) failed = true;
    }

    const ordered = [...paths];
    const outcome =
      ordered.length === 0
        ? { removed: 0, failed: false }
        : await removeAll(door, bucket, ordered);

    buckets.push({
      bucket,
      found: ordered.length,
      removed: outcome.removed,
      failed: failed || outcome.failed,
    });
    counts[`storage_${bucket.replace(/-/g, "_")}`] = outcome.removed;
  }

  return {
    buckets,
    clean: buckets.every((bucket) => !bucket.failed),
    counts,
  };
}

/**
 * The real door, over a service-role Supabase client.
 *
 * `list` and `remove` both answer rather than throw, so one unreachable bucket
 * cannot take the sweep down with it.
 */
export function supabaseStorageDoor(client: {
  storage: {
    from(bucket: string): {
      list(
        path: string,
        options: { limit: number; offset: number },
      ): PromiseLike<{ data: { name: string; id: string | null }[] | null; error: unknown }>;
      remove(paths: string[]): PromiseLike<{ data: unknown; error: unknown }>;
    };
  };
}): StorageDoor {
  return {
    async list(bucket, prefix, offset) {
      try {
        const { data, error } = await client.storage
          .from(bucket)
          .list(prefix, { limit: STORAGE_LIST_PAGE, offset });
        if (error || !data) return null;
        return data.map((entry) => ({ name: entry.name, id: entry.id }));
      } catch {
        return null;
      }
    },
    async remove(bucket, paths) {
      try {
        const { error } = await client.storage.from(bucket).remove(paths);
        if (error) return null;
        return { failed: [] };
      } catch {
        return null;
      }
    },
  };
}
