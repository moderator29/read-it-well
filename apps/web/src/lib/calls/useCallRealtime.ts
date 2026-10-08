"use client";

import { useEffect, useRef } from "react";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/client";
import type { CallState } from "./types";

/**
 * REALTIME FOR CALLS, the two subscriptions the call screens need. The
 * database publishes `public.calls` and `public.call_participants` (VC1), and
 * Supabase Realtime applies their RLS per subscriber, so a person only ever
 * hears about calls they are on.
 *
 * A change is a NUDGE, not the truth: the row a change carries has no role,
 * no other person's name and no server clock. On every nudge the screen asks
 * `heartbeatCall` for the authoritative snapshot and keeps it with
 * `newerSnapshot` (higher version wins, a finished call never comes back to
 * life). If realtime drops, the heartbeat every `HEARTBEAT_SECONDS` still
 * carries the state, so a stale screen corrects itself within seconds.
 */

export type CallNudge = { callId: string; state: CallState | null; version: number | null };

function nudgeFrom(row: unknown, idKey: "id" | "call_id"): CallNudge | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = r[idKey];
  if (typeof id !== "string") return null;
  return {
    callId: id,
    state: typeof r.state === "string" && idKey === "id" ? (r.state as CallState) : null,
    version: typeof r.version === "number" ? r.version : null,
  };
}

/** One call's state changes, while its screen is open. */
export function useCallUpdates(callId: string | null, onNudge: (nudge: CallNudge) => void): void {
  const handler = useRef(onNudge);
  useEffect(() => {
    handler.current = onNudge;
  });
  useEffect(() => {
    if (!callId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`call-${callId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        (payload) => {
          const nudge = nudgeFrom(payload.new, "id");
          if (nudge) handler.current(nudge);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [callId]);
}

/**
 * Calls that reach this person: a new participant row is an invitation (a
 * ringing call, or a review call), an update is an answer elsewhere (the same
 * person answering on another device). Mount once in the signed-in shell.
 */
export function useIncomingCalls(userId: string | null, onNudge: (nudge: CallNudge) => void): void {
  const handler = useRef(onNudge);
  useEffect(() => {
    handler.current = onNudge;
  });
  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`call-invites-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_participants", filter: `user_id=eq.${userId}` },
        (payload) => {
          const nudge = nudgeFrom(payload.new, "call_id");
          if (nudge) handler.current(nudge);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
