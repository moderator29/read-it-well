import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "../supabase/database.types";

/**
 * A block holds in messaging, both ways.
 *
 * `public.blocks` was written for the social surfaces: "bidirectional
 * invisibility, if either side has blocked the other, neither sees the other
 * anywhere". Messaging never read it, so a blocked person could still open a
 * thread on a listing and write to the person who had blocked them, which is
 * the one place a block matters most.
 *
 * WHY THE SERVICE ROLE READS IT. `blocks_select_own` lets a person see the
 * rows they wrote and nothing else, which is right for the social UI and
 * useless here: the question is "has EITHER of us blocked the other", and the
 * half that matters for safety is the half the caller cannot see. The read
 * is one indexed lookup over two ids, exposes nothing to the caller beyond a
 * refusal, and the database enforces the same rule underneath through the
 * restrictive insert policies in the b5 migration, so this file is the
 * sentence a person reads and the database is the wall.
 *
 * WHEN THE SERVICE ROLE IS ABSENT the caller's own half is checked through
 * their RLS client, which catches "I blocked them" and lets the database
 * policy catch "they blocked me". Never a thrown error: a block check that
 * crashed would take messaging down with it.
 */

export const BLOCKED_MESSAGE =
  "You cannot message this person. One of you has blocked the other, so messages do not go through in either direction.";

export const BLOCKED_THREAD_MESSAGE =
  "This conversation cannot be opened. One of you has blocked the other, so messages do not go through in either direction.";

type Db = SupabaseClient<Database>;

/** Pure: is there a block row in either direction between `a` and `b`? */
export function blockedInRows(
  rows: readonly { user_id: string; other_id: string }[],
  a: string,
  b: string,
): boolean {
  return rows.some(
    (row) =>
      (row.user_id === a && row.other_id === b) || (row.user_id === b && row.other_id === a),
  );
}

/**
 * True when either party has blocked the other. False when neither has, and
 * false when the answer could not be read, because the database policy is
 * the backstop and a read failure must not close every inbox.
 */
export async function blockedBetween(own: Db, me: string, other: string): Promise<boolean> {
  if (me === other) return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("blocks")
      .select("user_id, other_id")
      .or(`and(user_id.eq.${me},other_id.eq.${other}),and(user_id.eq.${other},other_id.eq.${me})`)
      .limit(2);
    if (!error) return blockedInRows(data ?? [], me, other);
  } catch {
    // Fall through to the caller's own half.
  }
  try {
    const { data } = await own
      .from("blocks")
      .select("user_id, other_id")
      .eq("user_id", me)
      .eq("other_id", other)
      .limit(1);
    return blockedInRows(data ?? [], me, other);
  } catch {
    return false;
  }
}

export type ConversationGuard =
  | { ok: true; otherId: string }
  | { ok: false; reason: "not_yours" | "blocked" | "unavailable" };

/**
 * Who the caller is writing to in this thread, and whether they may.
 *
 * Read under the caller's own RLS, so a thread they are not part of simply
 * does not come back and is answered as "not yours" rather than as a hint
 * that it exists. Every write into a thread (a message, a photo, a forwarded
 * card) should pass through here first, so the refusal reads the same on all
 * of them.
 */
export async function guardConversation(
  own: Db,
  me: string,
  conversationId: string,
): Promise<ConversationGuard> {
  const { data, error } = await own
    .from("conversations")
    .select("guest_id, agent_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) return { ok: false, reason: "unavailable" };
  if (!data) return { ok: false, reason: "not_yours" };
  const otherId = data.guest_id === me ? data.agent_id : data.guest_id;
  if (data.guest_id !== me && data.agent_id !== me) return { ok: false, reason: "not_yours" };
  if (await blockedBetween(own, me, otherId)) return { ok: false, reason: "blocked" };
  return { ok: true, otherId };
}
