import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

/**
 * The narrow door from the deletion flow to its Postgres functions.
 *
 * The seven functions this flow reaches (`account_deletion_blockers`,
 * `open_account_deletion`, `schedule_account_deletion`,
 * `cancel_account_deletion`, `due_account_purges`, `purge_account_rows`,
 * `finish_account_purge` and `fail_account_purge`) are called BY NAME over
 * PostgREST rather than through the generated typed surface, on the model of
 * `lib/cron/rpc.ts` and `lib/security/service-rpc.ts`: the call shape is fixed
 * in this one file, and `lib/supabase/database.types.ts` stays untouched until
 * the LEAD regenerates it after applying the two migrations. A worker who
 * edited the generated types by hand would be inventing a schema.
 *
 * TWO KINDS OF CALLER, AND THEY FAIL DIFFERENTLY. `callDeletionRpc` is for a
 * person standing in front of a screen: it never throws and answers with a
 * reason, because a deletion screen that 500s has told somebody nothing about
 * whether their account still exists. `callDeletionRpcOrThrow` is for the
 * scheduled job, where a call that cannot reach Postgres IS the failure and
 * the cron reporter exists to record it.
 */

export type DeletionClient = SupabaseClient<Database>;

type RpcError = { message?: string | null; code?: string | null };
type RpcCaller = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: RpcError | null;
  }>;
};

export type RpcAnswer = { ok: true; data: unknown } | { ok: false; reason: string };

export async function callDeletionRpc(
  client: DeletionClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcAnswer> {
  try {
    const { data, error } = await (client as unknown as RpcCaller).rpc(fn, args);
    if (error) return { ok: false, reason: error.code ?? error.message ?? "rpc_error" };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "rpc_threw" };
  }
}

export async function callDeletionRpcOrThrow(
  client: DeletionClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await (client as unknown as RpcCaller).rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message ?? error.code ?? "rpc error"}`);
  return data;
}

/** Read a jsonb answer without trusting its shape. */
export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
