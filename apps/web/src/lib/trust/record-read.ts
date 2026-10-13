import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import { recordFrom, type RecordRow } from "./record";

/**
 * THE VALLO RECORD'S FOUR READS (V-34). Every one answers null on any failure
 * or when there is no row, because a null draws nothing: a Record that did not
 * load is not a Record with nothing in it, and the screen must not print one
 * as the other.
 *
 *   by listing   the listing page's agent card, `lister_record_for_listing`,
 *                which takes the listing and never an agent id.
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
    const { data, error } = await supabase.rpc("lister_record_for_listing", { p_listing: listingId });
    await reportReadError("read.trust-record.readListingRecord", error);
    if (error) return null;
    return recordFrom(data);
  } catch {
    return null;
  }
}

export async function readUserRecord(userId: string): Promise<RecordRow | null> {
  try {
    const supabase = await client();
    const { data, error } = await supabase.rpc("lister_record_for_user", { p_user: userId });
    await reportReadError("read.trust-record.readUserRecord", error);
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
    await reportReadError("read.trust-record.readThreadRecord", error);
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
      if ((error as { hint?: string }).hint === "rate_limited") return { state: "limited" };
      await reportReadError("read.trust-record.readRecordByCode", error);
      return { state: "failed" };
    }
    const record = recordFrom(data);
    return record ? { state: "found", record } : { state: "missing" };
  } catch {
    return { state: "failed" };
  }
}
