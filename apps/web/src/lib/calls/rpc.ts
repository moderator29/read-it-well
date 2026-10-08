import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { callErrorToken, callErrorWords } from "./errors";

/**
 * The narrow door from the calls code to its Postgres functions.
 *
 * The VC1 functions are reached by name over PostgREST, on the model of
 * `lib/cron/rpc.ts`, because the generated types do not know them until the
 * lead applies the migration and regenerates `database.types.ts`. Every call
 * shape is fixed in one file (`actions.ts`, `review-actions.ts`, `webhook.ts`,
 * `sweep.ts`) and nowhere else.
 *
 * The answer is never thrown: a refusal comes back with its machine token
 * (`call:blocked`) and the sentence for it, and anything else as the generic
 * sentence. A Postgres message never reaches a screen.
 */

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: { message?: string | null; code?: string | null } | null;
  }>;
};

export type RpcAnswer =
  | { ok: true; data: unknown }
  | { ok: false; token: string | null; words: string; code: string | null };

export async function callRpc(
  client: SupabaseClient<Database>,
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcAnswer> {
  try {
    const { data, error } = await (client as unknown as Rpc).rpc(fn, args);
    if (error) {
      return { ok: false, token: callErrorToken(error), words: callErrorWords(error), code: error.code ?? null };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, token: null, words: callErrorWords(null), code: null };
  }
}
