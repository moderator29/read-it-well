import "server-only";

import { fail, type ActionResult } from "../actions/envelope";
import { IN_FLIGHT_MESSAGE, withIdempotency } from "../security/idempotency";
import { subjectForUser } from "../security/rate-limit";

/**
 * ONE ROW PER TAP, HOWEVER OFTEN IT IS SENT. V-40.
 *
 * A create that can arrive twice (a send whose answer was lost, then the
 * outbox replaying it when the signal comes back) carries the UUID the phone
 * minted when it was tapped. The first successful answer is remembered for
 * three days under that key and replayed to every later attempt; a failure is
 * not remembered, so it can be tried again. No key: the work runs as before.
 *
 * An attempt that meets the first one still running is refused with
 * `fieldErrors.idempotency = "in_flight"`, which the outbox reads as "try
 * again later", never as a refusal.
 */
export async function oncePerTap<T>(
  scope: string,
  userId: string,
  key: string | null | undefined,
  work: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const run = await withIdempotency<ActionResult<T>>(
    { scope, key: key ?? null, subject: subjectForUser(userId), ttlSeconds: 3 * 86_400, shouldRecord: (r) => r.ok },
    work,
  );
  if (run.status === "in-flight") return fail(IN_FLIGHT_MESSAGE, { idempotency: "in_flight" });
  return run.result;
}

/** A tap key as the phone sends it: a UUID, or nothing. */
export function tapKey(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}
