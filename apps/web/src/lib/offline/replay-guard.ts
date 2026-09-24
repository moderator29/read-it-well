import "server-only";

import { fail, ok, type ActionResult } from "../actions/envelope";
import { IN_FLIGHT_MESSAGE } from "../security/idempotency";
import { subjectForUser } from "../security/rate-limit";
import { callSecurityRpc, hasServiceRole } from "../security/service-rpc";

/**
 * ONE ROW PER TAP, HOWEVER OFTEN IT IS SENT. V-40.
 *
 * A create that can arrive twice (a send whose answer was lost, then the
 * outbox replaying it when the signal comes back) carries the UUID the phone
 * minted when it was tapped.
 *
 * THE CLAIM IS A LEASE, THE ANSWER IS KEPT. The key is claimed through the
 * audit's `claim_idempotency` with a two-minute ttl: that is how long an
 * attempt may hold it "in flight", so a function killed mid-work frees it
 * two minutes later rather than days later. A successful answer is recorded
 * with `record_idempotency_result_kept` (migration 20260924160700), which
 * extends the row to three days, as long as the outbox can hold a tap. A
 * failure is released at once, so it can be tried again. No key, or no
 * service role: the work runs as before. A claim that cannot be read runs
 * the work (the same fail-open rule as `withIdempotency`): a missed dedupe
 * is a rare twin, a refusal would be a lost tap.
 *
 * An attempt that meets the first one still running is refused with
 * `fieldErrors.idempotency = "in_flight"`, which the outbox reads as "try
 * again later", never as a refusal.
 *
 * `remember` picks what is stored for replay (a message keeps its id, thread
 * and time, never its words); a replayed answer is exactly that.
 */

const LEASE_SECONDS = 120;
const KEEP_SECONDS = 3 * 86_400;

export async function oncePerTap<T>(
  scope: string,
  userId: string,
  key: string | null | undefined,
  work: () => Promise<ActionResult<T>>,
  remember?: (data: T) => unknown,
): Promise<ActionResult<T>> {
  if (!key || !hasServiceRole()) return work();
  const subject = subjectForUser(userId);

  const claimed = await callSecurityRpc("claim_idempotency", { scope, subject, key, ttl_seconds: LEASE_SECONDS });
  const answer = claimed.ok && claimed.data && typeof claimed.data === "object" ? (claimed.data as Record<string, unknown>) : null;
  if (answer?.state === "in_flight") return fail(IN_FLIGHT_MESSAGE, { idempotency: "in_flight" });
  if (answer?.state === "replay" && answer.result && typeof answer.result === "object") {
    return answer.result as ActionResult<T>;
  }
  if (answer?.state !== "fresh") return work();

  let result: ActionResult<T>;
  try {
    result = await work();
  } catch (error) {
    await callSecurityRpc("release_idempotency", { scope, subject, key });
    throw error;
  }
  if (result.ok) {
    const stored = remember ? ok(remember(result.data)) : result;
    await callSecurityRpc("record_idempotency_result_kept", { scope, subject, key, result: stored, keep_seconds: KEEP_SECONDS });
  } else {
    await callSecurityRpc("release_idempotency", { scope, subject, key });
  }
  return result;
}

/** A tap key as the phone sends it: a UUID, or nothing. */
export function tapKey(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}
