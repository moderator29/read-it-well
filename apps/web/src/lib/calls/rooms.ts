import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { CallProvider } from "./provider/types";
import { callRpc } from "./rpc";

/**
 * Server-side room housekeeping, with the service role. Two jobs:
 *
 *   closeEndedRooms   a finished call's room is deleted at the provider, so
 *                     nobody holding an old token can sit in it and nothing
 *                     keeps billing. Idempotent; a missing room is success.
 *   reconcilePresence the provider's own list of who is connected, written
 *                     into the call (never a client's word for it). Keeps a
 *                     call honest when webhooks are late, lost or not set up.
 */

type Admin = SupabaseClient<Database>;

export type CloseReport = { looked: number; closed: number; failed: number };

export async function closeEndedRooms(admin: Admin, provider: CallProvider, limit = 50): Promise<CloseReport> {
  const listed = await callRpc(admin, "calls_rooms_to_close", { p_limit: limit });
  if (!listed.ok || !Array.isArray(listed.data)) return { looked: 0, closed: 0, failed: 0 };
  const rows = (listed.data as Array<Record<string, unknown>>).filter(
    (r) => typeof r.call_id === "string" && typeof r.provider_room === "string",
  );
  const closed: string[] = [];
  let failed = 0;
  for (const row of rows) {
    try {
      await provider.endRoom(row.provider_room as string);
      closed.push(row.call_id as string);
    } catch {
      failed += 1;
    }
  }
  if (closed.length > 0) await callRpc(admin, "calls_mark_rooms_closed", { p_calls: closed });
  return { looked: rows.length, closed: closed.length, failed };
}

export async function reconcilePresence(admin: Admin, provider: CallProvider, callId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("calls" as never)
    .select("provider_room")
    .eq("id", callId)
    .maybeSingle();
  const room = !error && data ? (data as { provider_room?: unknown }).provider_room : null;
  if (typeof room !== "string") return false;
  let identities: string[];
  try {
    identities = await provider.listParticipants(room);
  } catch {
    return false;
  }
  const answer = await callRpc(admin, "call_provider_presence", { p_call: callId, p_identities: identities });
  return answer.ok;
}
