import type { ActionResult } from "@/lib/actions/envelope";
import { REFUSAL } from "@/lib/money/balance-copy";

/**
 * A server action that throws (offline, a deploy mid-flight, a dropped
 * connection) becomes a refusal the sheet can show, never a spinner that
 * never stops or an unhandled rejection. `unreached` tells the caller the
 * answer never came back, so it keeps the same idempotency key: a retry of a
 * request that did land is then the same request, not a second one.
 */
export type Reached<T> = ActionResult<T> & { unreached?: true };

export async function reach<T>(call: () => Promise<ActionResult<T>>): Promise<Reached<T>> {
  try {
    return await call();
  } catch {
    return { ok: false, error: REFUSAL.noAnswer, unreached: true };
  }
}
