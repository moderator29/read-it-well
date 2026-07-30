"use client";

/**
 * Realtime subscriptions for the communication loops.
 *
 * Two hooks over Supabase Realtime postgres_changes: new messages in the open
 * thread, and new notifications for the signed-in user. Both are env-guarded:
 * without Supabase config they subscribe to nothing and clean up nothing, so
 * the seed experience carries zero realtime machinery. RLS applies to the
 * change feed exactly as it does to queries, so a client only ever receives
 * rows it could have selected. Delivery is best effort by design: if the
 * socket drops, the next full load renders the truth from the database.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Database } from "../supabase/database.types";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/client";

export type LiveMessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type LiveNotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

/**
 * Subscribe to message inserts in one conversation. Pass null to stay inert.
 * The callback is kept in a ref so a new render never tears the socket down.
 */
export function useThreadRealtime(
  conversationId: string | null,
  onInsert: (row: LiveMessageRow) => void,
): void {
  const handler = useRef(onInsert);
  useEffect(() => {
    handler.current = onInsert;
  });

  useEffect(() => {
    if (!conversationId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          handler.current(payload.new as LiveMessageRow);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);
}

/** How long a typing signal is trusted before it decays back to quiet. */
const TYPING_TIMEOUT_MS = 3_000;
/** Floor between our own outgoing pings, so a keystroke storm sends one. */
const TYPING_PING_MS = 1_500;

/**
 * "Someone is typing", the real version: a Realtime broadcast on the thread's
 * own channel, not a postgres row and not a timer with nothing behind it.
 * `ping()` is fired as the local side drafts; the other side's pings flip
 * `typing` on and let it decay after a few quiet seconds, since a broadcast
 * has no natural "stopped" event to listen for. Inert without Supabase
 * config or a conversation id, exactly like the sibling hooks in this file,
 * so seed mode (no counterpart is ever really present) shows nothing rather
 * than a typing indicator with nobody behind it.
 */
export function useThreadTyping(
  conversationId: string | null,
  meId: string | null,
): { typing: boolean; ping: () => void } {
  const [typing, setTyping] = useState(false);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const decayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPing = useRef(0);

  useEffect(() => {
    setTyping(false);
    if (!conversationId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`typing-${conversationId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if ((payload as { from?: string } | null)?.from === meId) return;
        setTyping(true);
        if (decayTimer.current) clearTimeout(decayTimer.current);
        decayTimer.current = setTimeout(() => setTyping(false), TYPING_TIMEOUT_MS);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (decayTimer.current) clearTimeout(decayTimer.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, meId]);

  const ping = useCallback(() => {
    const now = Date.now();
    if (now - lastPing.current < TYPING_PING_MS) return;
    lastPing.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { from: meId },
    });
  }, [meId]);

  return { typing, ping };
}

/**
 * Subscribe to notification inserts for one user (the badge and inbox feed).
 * Pass null to stay inert.
 */
export function useNotificationsRealtime(
  userId: string | null,
  onInsert: (row: LiveNotificationRow) => void,
): void {
  const handler = useRef(onInsert);
  useEffect(() => {
    handler.current = onInsert;
  });

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          handler.current(payload.new as LiveNotificationRow);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
