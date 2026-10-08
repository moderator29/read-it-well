"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { heartbeatCall } from "@/lib/calls/actions";
import { HEARTBEAT_SECONDS, overdueTransition } from "@/lib/calls/lifecycle";
import { useCallUpdates } from "@/lib/calls/useCallRealtime";
import type { CallSnapshot } from "@/lib/calls/types";
import { mergeSnapshot } from "./call-store";

/**
 * THE OPEN CALL'S PULSE: `heartbeatCall` every `HEARTBEAT_SECONDS`, and at
 * once on every realtime nudge (a nudge is never the truth, the heartbeat's
 * answer is). Each answer is merged into the store with `newerSnapshot`.
 *
 * Returns `beat`, so a screen can ask now: the call stage beats when the
 * media room says somebody joined or left, which is how a screen learns the
 * call is ACTIVE without waiting ten seconds.
 *
 * Overlapping beats are folded into one in flight: a burst of nudges is one
 * request, not five.
 */
export function useCallPulse(callId: string | null): () => Promise<void> {
  const inFlight = useRef<Promise<void> | null>(null);
  const beat = useCallback(async () => {
    if (!callId) return;
    if (inFlight.current) return inFlight.current;
    const run = (async () => {
      try {
        const answer = await heartbeatCall({ callId });
        if (answer.ok) mergeSnapshot(answer.data);
      } catch {
        /* Offline for a moment: the next beat tries again. */
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [callId]);

  useEffect(() => {
    if (!callId) return;
    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [callId, beat]);

  useCallUpdates(callId, () => void beat());
  return beat;
}

/**
 * The server's clock, ticking once a second on this device: `Date.now()`
 * plus the offset the latest snapshot measured. When a deadline the screen
 * can see has passed (a ring ran out, a reconnect grace ended), it asks the
 * server once instead of guessing what happened.
 */
export function useServerClock(snapshot: CallSnapshot | null, offsetMs: number, onOverdue?: () => void): number {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  const asked = useRef<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now() + offsetMs);
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [offsetMs]);
  useEffect(() => {
    if (!snapshot || !onOverdue) return;
    const due = overdueTransition(snapshot, new Date(now));
    const key = `${snapshot.id}:${snapshot.version}`;
    if (due && asked.current !== key) {
      asked.current = key;
      onOverdue();
    }
  }, [snapshot, now, onOverdue]);
  return now;
}
