import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import { recordFrom, type RecordRow } from "./record";

/**
 * THE VALLO RECORD'S FOUR READS (V-34). Every one answers null on any failure
 * or when there is no row, because a null draws nothing: a Record that did not
 * load is not a Record with nothing in it, and the screen must not print one
 * as the other.
 *
 *   by listing   the listing page's agent card. `listings.agent_id` is
 *                readable, then `public.lister_record(agent)`.
 *   by person    the supplier page. `agents` is select own plus staff, so a
 *                visitor cannot walk from a person to an agent id; the
 *                function answers by person instead.
 *   by thread    the thread header, for a party to it.
 *   by code      `/record/[code]`, rate limited in the database.
 */

async function client(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

export async function readListingRecord(listingId: string): Promise<RecordRow | null> {
  try {
    const supabase = await client();
    const { data: listing, error } = await supabase
      .from("listings")
      .select("agent_id")
      .eq("id", listingId)
      .maybeSingle();
    const agentId = (listing as { agent_id?: string } | null)?.agent_id;
    if (error || !agentId) return null;
    const { data, error: rpcError } = await supabase.rpc("lister_record", { p_agent: agentId });
    if (rpcError) return null;
    return recordFrom(data);
  } catch {
    return null;
  }
}

export async function readUserRecord(userId: string): Promise<RecordRow | null> {
  try {
    const supabase = await client();
    const { data, error } = await supabase.rpc("lister_record_for_user", { p_user: userId });
    if (error) return null;
    return recordFrom(data);
  } catch {
    return null;
  }
}

export async function readThreadRecord(conversationId: string): Promise<RecordRow | null> {
  try {
    const supabase = await client();
    const { data, error } = await supabase.rpc("thread_counterpart_record", { p_conversation: conversationId });
    if (error) return null;
    return recordFrom(data);
  } catch {
    return null;
  }
}

export type RecordLookup =
  | { state: "found"; record: RecordRow }
  | { state: "missing" }
  | { state: "limited" }
  | { state: "failed" };

export async function readRecordByCode(code: string): Promise<RecordLookup> {
  try {
    const supabase = await client();
    const { data, error } = await supabase.rpc("lister_record_by_code", { p_code: code });
    if (error) {
      return (error as { hint?: string }).hint === "rate_limited" ? { state: "limited" } : { state: "failed" };
    }
    const record = recordFrom(data);
    return record ? { state: "found", record } : { state: "missing" };
  } catch {
    return { state: "failed" };
  }
}
