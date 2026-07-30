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

import { useEffect, useRef } from "react";
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
