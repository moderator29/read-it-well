import { PURGE_BATCH_LIMIT } from "./constants";
import { purgeStorage, type StorageDoor, type StoragePurgeResult } from "./storage";
import type { DeletionAction, DeletionAuditDetail } from "./audit";

/**
 * What happens when the thirty days run out.
 *
 * EVERY DEPENDENCY IS HANDED IN. There is no Supabase client, no email client
 * and no clock in this file, because the one thing a purge must be is
 * provable, and a function that reaches for its own database can only be
 * proved against a database. `purge.test.ts` drives every branch here,
 * including the retry, with nothing but objects.
 *
 * THE ORDER, AND WHY IT IS THIS ORDER.
 *
 *   1. Read the address, BEFORE anything is destroyed. It is needed for the
 *      completion email and it is about to stop existing. It is held in a
 *      local for the length of one purge and is never stored, never logged and
 *      never written to the audit line.
 *   2. CLOSE THE FUTURE COMMITMENTS, before a single row is scrubbed. Every
 *      event of theirs that has not happened yet is cancelled and everybody
 *      going is told; every table still to come at a restaurant of theirs is
 *      cancelled and the guest is told; anything somehow still on the market
 *      comes off it. The founder's principle: past records anonymise and stay
 *      because they are history, but a future commitment is resolved before
 *      the account can go. It runs FIRST because the notices it sends name the
 *      event and the restaurant, and after step 3 there is nobody to send
 *      them on behalf of.
 *   3. Purge the rows, in one database transaction, which also hands back
 *      every storage path it can see.
 *   4. Purge the objects, through the Storage API, because deleting a
 *      `storage.objects` row from SQL orphans the file.
 *   5. Scrub the auth row through the admin API as well as in SQL. Two
 *      independent routes to the same end: if this database does not grant
 *      `postgres` write access to the auth schema, the API still removes the
 *      address, the telephone number, the password and the metadata, and bans
 *      the row. The SQL half additionally removes the identity providers,
 *      which the admin API cannot do for a last identity.
 *   6. Mark the request PURGED, and only then.
 *   7. Send the completion email.
 *
 * A FAILURE AT ANY STEP LEAVES THE REQUEST OPEN. `fail_account_purge` records
 * the reason and does not close the row, so the next scheduled run picks it up
 * again. Every step is idempotent, so a retry is safe: the deletes find
 * nothing, the scrubs are their own fixed point, and a request already PURGED
 * answers `already` and changes nothing. A half-finished deletion that
 * reported success would be the worst outcome available here, so it is the one
 * outcome this file cannot produce.
 */

export type DueRequest = {
  requestId: string;
  userId: string;
  attempts: number;
};

export type PurgeDeps = {
  /** The throwing PostgREST door. A job that cannot reach Postgres has failed. */
  rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
  storage: StorageDoor;
  /** The address to send the last email to, read before anything is destroyed. */
  readContact: (userId: string) => Promise<{ email: string | null; name: string | null }>;
  /** The admin-API half of the auth scrub. Answers false rather than throwing. */
  scrubAuth: (userId: string) => Promise<boolean>;
  sendCompleted: (to: string, name: string | null) => Promise<void>;
  audit: (
    action: DeletionAction,
    userId: string | null,
    requestId: string | null,
    detail?: DeletionAuditDetail,
  ) => Promise<void>;
};

export type PurgeOutcome = {
  requestId: string;
  /** "purged", "already", "retry" or "not_due". */
  result: "purged" | "already" | "retry" | "not_due";
  reason?: string;
  storage?: StoragePurgeResult;
};

/** Read a jsonb answer without trusting its shape. */
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/** The paths the database saw, per bucket, with anything odd dropped. */
export function storagePathsFrom(value: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const source = record(value);
  for (const [bucket, paths] of Object.entries(source)) {
    if (!Array.isArray(paths)) continue;
    out[bucket] = paths.filter((path): path is string => typeof path === "string" && path.length > 0);
  }
  return out;
}

/** Purge exactly one account. Never throws: every ending is a value. */
export async function purgeOne(deps: PurgeDeps, due: DueRequest): Promise<PurgeOutcome> {
  let contact: { email: string | null; name: string | null } = { email: null, name: null };
  try {
    contact = await deps.readContact(due.userId);
  } catch {
    // An unreadable address costs the person their last email and nothing
    // else. It is never a reason to leave an account undeleted.
  }

  let rows: Record<string, unknown>;
  try {
    await deps.audit("account.deletion.purge_started", due.userId, due.requestId, {
      attempt: due.attempts + 1,
    });

    /*
     * THE FUTURE COMMITMENTS, RESOLVED FIRST AND IN THEIR OWN TRANSACTION.
     *
     * A failure here leaves the request OPEN, like every other failure in this
     * file, so the next run tries again. It is safe to have run and then
     * failed: an event cancelled with notice to everybody going is not a harm
     * to anybody, and the function changes nothing the second time because
     * every statement in it is keyed on a state it has already left.
     *
     * It is a SEPARATE call rather than a step inside `purge_account_rows`
     * because re-emitting that function to add a step would put the twenty
     * character handle fix and the balance fix of ledger 11.10 back on the
     * table for a change that touches neither.
     */
    const closed = record(
      await deps.rpc("close_future_commitments", { p_request: due.requestId }),
    );
    if (closed["ran"] === true) {
      await deps.audit("account.deletion.commitments_closed", due.userId, due.requestId, {
        ...countsFrom(closed["counts"]),
      });
    }

    rows = record(await deps.rpc("purge_account_rows", { p_request: due.requestId }));
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 200) : "purge threw";
    await recordFailure(deps, due, reason);
    return { requestId: due.requestId, result: "retry", reason };
  }

  if (rows["already"] === true) {
    return { requestId: due.requestId, result: "already" };
  }
  if (rows["purged"] !== true) {
    const reason = typeof rows["reason"] === "string" ? rows["reason"] : "purge_refused";
    if (reason === "not_due") return { requestId: due.requestId, result: "not_due", reason };
    await recordFailure(deps, due, reason);
    return { requestId: due.requestId, result: "retry", reason };
  }

  const storage = await purgeStorage(
    deps.storage,
    due.userId,
    storagePathsFrom(rows["storage"]),
  );

  await deps.audit("account.deletion.purge_storage", due.userId, due.requestId, {
    ...storage.counts,
    buckets_clean: storage.clean,
  });

  // The API half of the auth scrub. The SQL half has already run inside the
  // transaction above and reported whether it could.
  let apiScrubbed = false;
  try {
    apiScrubbed = await deps.scrubAuth(due.userId);
  } catch {
    apiScrubbed = false;
  }
  const sqlScrubbed = rows["auth_scrubbed"] === true;

  if (!storage.clean || (!sqlScrubbed && !apiScrubbed)) {
    const reason = !storage.clean ? "storage_incomplete" : "auth_not_scrubbed";
    await recordFailure(deps, due, reason);
    return { requestId: due.requestId, result: "retry", reason, storage };
  }

  try {
    await deps.rpc("finish_account_purge", {
      p_request: due.requestId,
      p_storage: storage.counts,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 200) : "finish threw";
    await recordFailure(deps, due, reason);
    return { requestId: due.requestId, result: "retry", reason, storage };
  }

  await deps.audit("account.deletion.purge_completed", due.userId, due.requestId, {
    ...countsFrom(rows["counts"]),
    ...storage.counts,
    auth_scrubbed_sql: sqlScrubbed,
    auth_scrubbed_api: apiScrubbed,
  });

  if (contact.email) {
    try {
      await deps.sendCompleted(contact.email, contact.name);
    } catch {
      // The account is gone either way. A failed email is not a failed purge.
    }
  }

  return { requestId: due.requestId, result: "purged", storage };
}

async function recordFailure(deps: PurgeDeps, due: DueRequest, reason: string): Promise<void> {
  try {
    await deps.rpc("fail_account_purge", { p_request: due.requestId, p_reason: reason });
  } catch {
    // The reason is best effort; the request stays open regardless, which is
    // the part that matters.
  }
  await deps.audit("account.deletion.purge_failed", due.userId, due.requestId, { reason });
}

/** Counts, kept to numbers so nothing descriptive can leak into a line. */
function countsFrom(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record(value))) {
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = Math.trunc(raw);
  }
  return out;
}

export type PurgeRunResult = {
  due: number;
  purged: number;
  retried: number;
  /** Request ids that failed, for the alert. Opaque uuids, never a person. */
  failures: string[];
};

/** One scheduled run: take what is due, purge each, report. */
export async function runAccountPurges(
  deps: PurgeDeps,
  limit: number = PURGE_BATCH_LIMIT,
): Promise<PurgeRunResult> {
  const answer = record(await deps.rpc("due_account_purges", { p_limit: limit }));
  const raw = Array.isArray(answer["requests"]) ? answer["requests"] : [];

  const due: DueRequest[] = [];
  for (const entry of raw) {
    const row = record(entry);
    const requestId = row["request_id"];
    const userId = row["user_id"];
    if (typeof requestId !== "string" || typeof userId !== "string") continue;
    const attempts = typeof row["attempts"] === "number" ? row["attempts"] : 0;
    due.push({ requestId, userId, attempts });
  }

  let purged = 0;
  let retried = 0;
  const failures: string[] = [];

  for (const request of due) {
    const outcome = await purgeOne(deps, request);
    if (outcome.result === "purged" || outcome.result === "already") purged += 1;
    else if (outcome.result === "retry") {
      retried += 1;
      failures.push(outcome.requestId);
    }
  }

  return { due: due.length, purged, retried, failures };
}
