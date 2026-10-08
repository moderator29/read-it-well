import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { snapshotFromRow } from "./lifecycle";
import { callRpc } from "./rpc";
import type { CallSnapshot } from "./types";

/**
 * A thread's calls, for its history rows. Two bounded reads under the
 * reader's own session:
 *
 *   `call_history`      the calls themselves, per viewer (missed for the
 *                       callee, "no answer" for the caller), newest first
 *   `messages.call_id`  which message rows are a call's marker, so a marker
 *                       renders as a call row and a typed message that
 *                       happens to read "Video call, missed" never does
 *
 * `messages.call_id` is not in the generated types until they are
 * regenerated after VC1, so it is read through an untyped door, by name.
 * Any failure is an empty answer: the thread then draws the markers as the
 * plain words the database wrote, which is what an old client sees anyway.
 */
export type ThreadCalls = {
  /** Marker message id to call id. */
  markers: Map<string, string>;
  /** Call id to the reader's snapshot of it. */
  calls: Map<string, CallSnapshot>;
};

type Untyped = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        not(column: string, op: string, value: null): {
          limit(n: number): PromiseLike<{ data: { id: string; call_id: string | null }[] | null; error: unknown }>;
        };
      };
    };
  };
};

export async function readThreadCalls(supabase: SupabaseClient<Database>, conversationId: string): Promise<ThreadCalls> {
  const empty: ThreadCalls = { markers: new Map(), calls: new Map() };
  try {
    const [markerRead, history] = await Promise.all([
      (supabase as unknown as Untyped)
        .from("messages")
        .select("id, call_id")
        .eq("conversation_id", conversationId)
        .not("call_id", "is", null)
        .limit(200),
      callRpc(supabase, "call_history", { p_conversation: conversationId, p_limit: 200 }),
    ]);
    const markers = new Map<string, string>();
    for (const row of markerRead.data ?? []) if (row.call_id) markers.set(row.id, row.call_id);
    const calls = new Map<string, CallSnapshot>();
    if (history.ok && Array.isArray(history.data)) {
      for (const raw of history.data) {
        const snap = snapshotFromRow(raw);
        if (snap) calls.set(snap.id, snap);
      }
    }
    return { markers, calls };
  } catch {
    return empty;
  }
}

/**
 * Which of these message ids are call markers (the inbox's missed-call
 * line). One read, ids only; any failure is "none".
 */
export async function markerIds(supabase: SupabaseClient<Database>, messageIds: string[]): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();
  try {
    const { data } = await (supabase as unknown as {
      from(table: string): {
        select(columns: string): {
          in(column: string, values: string[]): {
            not(column: string, op: string, value: null): PromiseLike<{ data: { id: string }[] | null }>;
          };
        };
      };
    })
      .from("messages")
      .select("id")
      .in("id", messageIds)
      .not("call_id", "is", null);
    return new Set((data ?? []).map((r) => r.id));
  } catch {
    return new Set();
  }
}
