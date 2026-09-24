/**
 * ONE TYPED DOOR TO THE LANDLORD LINE'S FUNCTIONS, ON THE MODEL OF
 * `lib/price-check/rpc.ts`, and for the same reason: `database.types.ts` is a
 * shared generated file, these functions are not in it until whoever owns it
 * regenerates it after the migrations apply, and regenerating it from this
 * branch would drag every other worker's schema into this change.
 *
 * So the argument shapes are written out here, once, checked against
 * `supabase/migrations/2026092411*`, and the one cast lives here. A mistyped
 * parameter name is a silent null default in PostgREST, which is why they are
 * spelled out rather than left as a loose record.
 *
 * Deliberately NOT `server-only`: the pure halves of the drain and the inbound
 * handler take an `RpcCaller` so a test can hand them a fake.
 */

export type LandlordRpcArgs = {
  record_principal_consent: {
    p_mandate: string;
    p_answer: "given" | "withdrawn";
    p_sentence: string | null;
    p_note: string | null;
  };
  mandate_consents: { p_mandates: string[] };
  landlord_line_enqueue: Record<string, never>;
  landlord_line_issue: { p_limit: number };
  landlord_line_record: {
    p_ask: string;
    p_channel: string;
    p_body: string;
    p_ref: string | null;
    p_delivered: boolean;
  };
  landlord_line_read: { p_token: string };
  landlord_line_answer: { p_token: string; p_answer: string; p_note: string | null };
  landlord_line_stop: { p_token: string };
  landlord_line_inbound: { p_phone: string; p_code: string | null; p_digit: number; p_channel: string };
  landlord_line_stop_number: { p_phone: string; p_channel: string };
  rent_landlord_fact: { p_inspection: string };
  listing_landlord_facts: { p_listings: string[] };
  property_offers: { p_listing: string };
  property_candidates: { p_listing: string };
  property_join: { p_listing: string; p_other: string };
  property_keep_apart: { p_listing: string; p_other: string };
  property_split: { p_listing: string };
  close_listing: { p_listing: string; p_reason: string; p_rent_payment: string | null };
  /* The review fixes: migration 20260924110300. */
  landlord_line_requeue: Record<string, never>;
  landlord_line_claim: { p_ask: string };
  reopen_listing: { p_listing: string; p_note: string };
  closed_listing_count: Record<string, never>;
  /* Batch 2: migration 20260924110400. */
  owner_heartbeats_open: Record<string, never>;
  owner_heartbeat_answer: { p_listing: string };
  agent_lookup: { p_query: string };
  agent_lookup_opt_in: { p_phone: string | null };
  my_agent_lookup: Record<string, never>;
  safety_share_create: { p_inspection: string; p_minutes: number };
  safety_share_done: { p_inspection: string };
  safety_share_read: { p_token: string };
};

export type LandlordRpcName = keyof LandlordRpcArgs;

export type RpcError = { message?: string | null; code?: string | null };
export type RpcResult = { data: unknown; error: RpcError | null };

/** Anything with a PostgREST-shaped `rpc`: either Supabase client, or a test fake. */
export type RpcCaller = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
};

export async function callLandlordRpc<N extends LandlordRpcName>(
  db: unknown,
  fn: N,
  args: LandlordRpcArgs[N],
): Promise<RpcResult> {
  try {
    const result = await (db as RpcCaller).rpc(fn, args as Record<string, unknown>);
    return { data: result.data, error: result.error };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : "rpc threw" } };
  }
}
