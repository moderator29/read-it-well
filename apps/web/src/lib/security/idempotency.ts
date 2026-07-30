import "server-only";

import { callSecurityRpc, hasServiceRole } from "./service-rpc";

/**
 * Optional idempotency for mutating actions (RECOMMENDATIONS R-27 groundwork).
 *
 * Nigerian mobile networks drop mid-request as a matter of routine, and a person
 * whose Reserve or Withdraw tap appears to fail will tap again. Without a memory
 * of the first attempt, the second one does the work twice: two bookings, two
 * holds, two tickets. This wraps an action so a retry carrying the same
 * client-generated key replays the first answer instead.
 *
 * How it works. The claim is a single insert in Postgres, so two simultaneous
 * retries cannot both come back `fresh`. The winner runs the work and records
 * what it answered; later retries read that answer back. A retry arriving while
 * the first attempt is still running gets `in-flight`, and the honest thing to
 * tell that person is that their earlier attempt is still going through, never a
 * second write.
 *
 * FAIL OPEN, deliberately, exactly as the rate limiter does. No key from the
 * client, no service key in the environment, the function not applied yet, a
 * network drop: in every one of those cases the work simply runs. A retry guard
 * that cannot reach its store must not become a reason a person cannot transact.
 * That does mean the guard is only as good as its store: it removes the common
 * double-submit, it is not a substitute for the database-level uniqueness that
 * R-27 also asks for (the wallet's unique `reference`, a unique
 * `(guest_id, idempotency_key)` on bookings). Belt and braces, both wanted.
 *
 * Not wired into any action yet: the mutating actions that want it belong to
 * other agents this round. Intended call sites are listed in the handover
 * report.
 */

export type IdempotencyRequest<T> = {
  /** The action family, e.g. "booking.reserve" or "wallet.withdraw". */
  scope: string;
  /**
   * The client-generated key for this one submit. Absent or blank means the
   * caller did not opt in, and the work runs unguarded.
   */
  key: string | null | undefined;
  /** The acting user, namespaced: reuse `subjectForUser` from rate-limit.ts. */
  subject: string;
  /**
   * How long the answer stays replayable. Minutes, not days: this covers a
   * human retrying a dropped submit, not a permanent ledger.
   */
  ttlSeconds?: number;
  /**
   * Which results are worth remembering. Default: all of them. Actions that
   * answer with the `ActionResult` envelope should pass `(r) => r.ok`, so a
   * genuine failure stays retryable instead of being replayed for ever.
   */
  shouldRecord?: (result: T) => boolean;
};

export type IdempotentRun<T> =
  | {
      status: "done";
      result: T;
      /** True when this answer came from the first attempt's record. */
      replayed: boolean;
      /** True when the guard could not reach its store and ran the work anyway. */
      degraded: boolean;
    }
  | { status: "in-flight" };

/** Copy for the in-flight case: what happened, and what to do about it. */
export const IN_FLIGHT_MESSAGE =
  "Your earlier attempt is still going through. Give it a moment and check before trying again, so nothing is done twice.";

const DEFAULT_TTL_SECONDS = 15 * 60;
const MAX_KEY_LENGTH = 200;

type ClaimState = "fresh" | "replay" | "in_flight";

function readClaim(data: unknown): { state: ClaimState; result: unknown } | null {
  if (typeof data !== "object" || data === null) return null;
  const state = (data as Record<string, unknown>).state;
  if (state !== "fresh" && state !== "replay" && state !== "in_flight") return null;
  return { state, result: (data as Record<string, unknown>).result ?? null };
}

/** Best effort: a lost bookkeeping call must never fail the action itself. */
async function record(
  scope: string,
  subject: string,
  key: string,
  result: unknown,
): Promise<void> {
  await callSecurityRpc("record_idempotency_result", { scope, subject, key, result });
}

async function release(scope: string, subject: string, key: string): Promise<void> {
  await callSecurityRpc("release_idempotency", { scope, subject, key });
}

/**
 * Run `work` at most once per (scope, subject, key).
 *
 * The caller keeps full control of the copy: a `done` run is answered normally,
 * and an `in-flight` run should be refused with `IN_FLIGHT_MESSAGE` (or its own
 * wording), never retried silently.
 */
export async function withIdempotency<T>(
  request: IdempotencyRequest<T>,
  work: () => Promise<T>,
): Promise<IdempotentRun<T>> {
  const { scope, subject } = request;
  const key = (request.key ?? "").trim().slice(0, MAX_KEY_LENGTH);
  const ttlSeconds = Math.max(30, request.ttlSeconds ?? DEFAULT_TTL_SECONDS);

  if (!scope || !subject || !key || !hasServiceRole()) {
    return { status: "done", result: await work(), replayed: false, degraded: false };
  }

  const claimed = await callSecurityRpc("claim_idempotency", {
    scope,
    subject,
    key,
    ttl_seconds: ttlSeconds,
  });

  const claim = claimed.ok ? readClaim(claimed.data) : null;
  if (!claim) {
    // Store unreachable, or an answer this code does not recognise. Run the
    // work; see the fail-open note at the top of this file.
    return { status: "done", result: await work(), replayed: false, degraded: true };
  }

  if (claim.state === "in_flight") return { status: "in-flight" };

  if (claim.state === "replay") {
    // The stored value is the same shape this action returned the first time,
    // round-tripped through JSON by Postgres.
    return { status: "done", result: claim.result as T, replayed: true, degraded: false };
  }

  let result: T;
  try {
    result = await work();
  } catch (error) {
    // The work failed outright, so nothing is worth replaying. Free the key at
    // once rather than leaving the next honest retry stuck on "in flight".
    await release(scope, subject, key);
    throw error;
  }

  const keep = request.shouldRecord ? request.shouldRecord(result) : true;
  if (keep) {
    await record(scope, subject, key, result);
  } else {
    await release(scope, subject, key);
  }

  return { status: "done", result, replayed: false, degraded: false };
}
