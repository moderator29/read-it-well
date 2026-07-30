import "server-only";

import { createAdminClient } from "../supabase/admin";
import { isSupabaseConfigured } from "../supabase/env";

/**
 * The one narrow door from the abuse controls to their Postgres functions.
 *
 * Both the durable rate limiter and the idempotency helper reach exactly four
 * service-role functions (`consume_rate_limit`, `claim_idempotency`,
 * `record_idempotency_result` and `release_idempotency`, defined in the pending
 * supabase/migrations/20260730013645_rate_limits_and_idempotency.sql). Everything
 * they share lives
 * here: the service-key check, a bounded call, and the rule that infrastructure
 * trouble is reported rather than thrown.
 *
 * Typing note. These four functions are reached by name over PostgREST rather
 * than through the generated typed surface, because each is a security control
 * whose call shape is fixed here and nowhere else. Narrowing the client to the
 * single method used, in one place, keeps that boundary explicit and keeps the
 * generated types untouched.
 */

type RpcError = { message?: string | null; code?: string | null };
type RpcCaller = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: RpcError | null;
  }>;
};

/** A call either produced a value, or could not run. Never a thrown error. */
export type RpcOutcome =
  | { ok: true; data: unknown }
  | { ok: false; reason: string };

/**
 * How long a security control may wait on Postgres before giving up.
 *
 * Deliberately short. These calls sit in front of a user action on a Nigerian
 * mobile connection, and a limiter that adds a visible pause is a worse problem
 * than a limiter that occasionally misses a count. On timeout the caller fails
 * open (see rate-limit.ts) and the request continues.
 */
const RPC_TIMEOUT_MS = 1_500;

/** True when a service-role write path is actually available in this process. */
export function hasServiceRole(): boolean {
  return isSupabaseConfigured() && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;
}

async function bounded(work: Promise<RpcOutcome>): Promise<RpcOutcome> {
  // Settle the work first so a late rejection can never surface as an unhandled
  // rejection after the timeout has already answered.
  const settled: Promise<RpcOutcome> = work.then(
    (value) => value,
    (error: unknown) => ({
      ok: false as const,
      reason: error instanceof Error ? error.message : "rpc threw",
    }),
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<RpcOutcome>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, reason: "timed out" }), RPC_TIMEOUT_MS);
  });

  try {
    return await Promise.race([settled, guard]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Call one of the security functions through the service role.
 *
 * Every failure mode collapses into `{ ok: false, reason }`: no service key
 * configured, the function not applied yet, a network drop, a timeout. The
 * caller decides what a missing answer means, and in both callers it means
 * "carry on", never "block the user".
 */
export async function callSecurityRpc(
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcOutcome> {
  if (!hasServiceRole()) return { ok: false, reason: "service role not configured" };

  return bounded(
    (async (): Promise<RpcOutcome> => {
      const client = createAdminClient() as unknown as RpcCaller;
      const { data, error } = await client.rpc(fn, args);
      if (error) {
        return { ok: false, reason: error.message ?? error.code ?? "rpc error" };
      }
      return { ok: true, data };
    })(),
  );
}
