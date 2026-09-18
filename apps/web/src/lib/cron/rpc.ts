import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

/**
 * The narrow door from a scheduled job to its Postgres function.
 *
 * The B4 functions (expire_booking_holds, complete_ended_stays,
 * record_booking_no_show, inventory_drift, cron_job_failures) are reached by
 * name over PostgREST rather than through the generated typed surface, on the
 * model of lib/security/service-rpc.ts: each call shape is fixed in one job
 * file and nowhere else, and the generated types stay untouched until the
 * lead regenerates them after applying the migration.
 *
 * Unlike the security door, this one THROWS. A rate limiter that cannot reach
 * Postgres should let the request through; a sweep that cannot reach Postgres
 * has failed, and a failed run is what the reporter exists to record.
 */

export type AdminClient = SupabaseClient<Database>;

type RpcError = { message?: string | null; code?: string | null };
type RpcCaller = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: RpcError | null;
  }>;
};

export async function callServiceFunction(
  admin: AdminClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await (admin as unknown as RpcCaller).rpc(fn, args);
  if (error) {
    throw new Error(`${fn}: ${error.message ?? error.code ?? "rpc error"}`);
  }
  return data;
}
