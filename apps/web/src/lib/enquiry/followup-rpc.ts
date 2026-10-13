import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * AGENT-01: THE ONE TYPED DOOR TO `set_enquiry_followup` AND ITS TABLE.
 *
 * `database.types.ts` is the lead's file, regenerated after `p1_e` is applied;
 * until then the RPC and `enquiry_followups` are not in it. So the argument
 * shape is written out here, once, checked against
 * `supabase/migrations/pending/p1_e_enquiry_followups.sql`, and the cast lives
 * here and nowhere else. Not `server-only`, so a test can hand it a fake.
 */

export type SetFollowupArgs = {
  p_conversation: string;
  /** `YYYY-MM-DD`, or null to clear. */
  p_due: string | null;
  p_note: string | null;
};

export type RpcError = { message?: string; code?: string } | null;

/** The slice of the query builder the two reads use. */
export type FollowupSelect = {
  not: (column: string, op: "is", value: null) => FollowupSelect;
  eq: (column: string, value: string) => FollowupSelect;
  order: (column: string, opts: { ascending: boolean }) => FollowupSelect;
  limit: (n: number) => PromiseLike<{ data: unknown; error: RpcError }>;
  maybeSingle: () => PromiseLike<{ data: unknown; error: RpcError }>;
};

type Loose = {
  rpc: (fn: "set_enquiry_followup", args: SetFollowupArgs) => PromiseLike<{ error: RpcError }>;
  from: (table: "enquiry_followups") => {
    select: (columns: string) => FollowupSelect;
  };
};

/** Any Supabase client, seen through the types this file knows. */
export type AnySupabase = Pick<SupabaseClient, "rpc" | "from"> | object;

/** The client, seen through the types this file knows. */
export function looseDb(supabase: AnySupabase): Loose {
  return supabase as unknown as Loose;
}

export function callSetEnquiryFollowup(supabase: AnySupabase, args: SetFollowupArgs): PromiseLike<{ error: RpcError }> {
  return looseDb(supabase).rpc("set_enquiry_followup", args);
}
