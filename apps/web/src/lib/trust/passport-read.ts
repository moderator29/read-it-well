import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import { passportFrom, type PassportFacts } from "./passport";

/**
 * THE RENTER PASSPORT'S READS (V-100). Each answers null on any failure: a
 * passport that did not load is never drawn as an empty one.
 */

type Rpc = { rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };

async function client(): Promise<Rpc> {
  return (await createClient()) as unknown as SupabaseClient as unknown as Rpc;
}

export type MyPassport = { enabled: boolean; sharedIn: number; facts: PassportFacts };

/** The renter's own view, for settings. */
export async function readMyPassport(): Promise<MyPassport | null> {
  try {
    const { data, error } = await (await client()).rpc("my_renter_passport");
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    const facts = passportFrom(row);
    if (!row || !facts) return null;
    const r = row as Record<string, unknown>;
    return {
      enabled: r.enabled === true,
      sharedIn: typeof r.shared_in === "number" ? r.shared_in : 0,
      facts,
    };
  } catch {
    return null;
  }
}

/** The lister's view in one thread: null unless the renter shows it there. */
export async function readThreadPassport(conversationId: string): Promise<PassportFacts | null> {
  try {
    const { data, error } = await (await client()).rpc("renter_passport_for_thread", { p_conversation: conversationId });
    if (error) return null;
    return passportFrom(data);
  } catch {
    return null;
  }
}

/** The guest's own control in a thread: is it shown here, and is it on at all. */
export async function readPassportShareState(conversationId: string): Promise<{ enabled: boolean; shared: boolean } | null> {
  try {
    const rpc = await client();
    const [mine, here] = await Promise.all([
      rpc.rpc("my_renter_passport"),
      rpc.rpc("passport_shared_here", { p_conversation: conversationId }),
    ]);
    if (mine.error || here.error) return null;
    const row = (Array.isArray(mine.data) ? mine.data[0] : mine.data) as Record<string, unknown> | undefined;
    return { enabled: row?.enabled === true, shared: here.data === true };
  } catch {
    return null;
  }
}
