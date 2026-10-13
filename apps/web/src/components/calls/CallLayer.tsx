"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { heartbeatCall } from "@/lib/calls/actions";
import { callPhase, isTerminal } from "@/lib/calls/lifecycle";
import { callIdFromParam } from "@/lib/calls/screen";
import { useIncomingCalls, type CallNudge } from "@/lib/calls/useCallRealtime";
import { callState, mergeSnapshot, showCall, showGone } from "./call-store";
import { CallSurface } from "./CallSurface";
import type { CallsCopy } from "./views";

/**
 * THE GLOBAL CALL LAYER, mounted once in each signed-in shell (the member
 * app, the agent workspace, the admin console), and only while the
 * `video_calls` switch is on. It does three things:
 *
 *  1. Listens for calls that reach this person (`useIncomingCalls`): a new
 *     participant row is an invitation. A nudge is never the truth, so each
 *     is resolved with `heartbeatCall`, and only a call that is ringing FOR
 *     this person opens the incoming screen, on whatever page they are on.
 *  2. Resolves a deep link's `?call=<id>` (a push tap, a notification row):
 *     ringing for me opens the incoming screen; live and mine offers Rejoin;
 *     finished shows the plain missed or ended screen with call back; an
 *     unknown, expired or not-mine id shows the same calm "no longer
 *     available" screen, never a 404 that would confirm it exists. The
 *     parameter is then taken out of the address, so a reload does not
 *     replay it.
 *  3. Draws the surface.
 *
 * Nothing here loads the media SDK: that waits for a call to need it.
 */
export function CallLayer({ userId, copy }: { userId: string; copy: CallsCopy }) {
  useIncomingCalls(userId, (nudge) => void resolveNudge(nudge));
  return (
    <>
      <Suspense fallback={null}>
        <DeepLinkWatcher />
      </Suspense>
      <CallSurface copy={copy} />
    </>
  );
}

async function resolveNudge(nudge: CallNudge): Promise<void> {
  const current = callState().active;
  if (current && current.snapshot.id !== nudge.callId && !current.recovery && !isTerminal(current.snapshot.state)) {
    /* Already on a call: the database answers the new one BUSY by itself. */
    return;
  }
  const answer = await heartbeatCall({ callId: nudge.callId }).catch(() => null);
  if (!answer?.ok) return;
  if (current && current.snapshot.id === nudge.callId) {
    mergeSnapshot(answer.data);
    return;
  }
  if (callPhase(answer.data.state, answer.data.role) === "incoming") showCall(answer.data);
}

/** Exported for the e2e harness and the tests; the watcher calls it. */
export async function resolveDeepLink(callId: string | null): Promise<void> {
  if (!callId) {
    showGone();
    return;
  }
  const answer = await heartbeatCall({ callId }).catch(() => null);
  if (!answer?.ok) {
    showGone();
    return;
  }
  const s = answer.data;
  const phase = callPhase(s.state, s.role);
  if (phase === "incoming") showCall(s);
  else if (phase === "ended") showCall(s, { recovery: "ended" });
  else showCall(s, { resume: true });
}

function DeepLinkWatcher() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("call");
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (raw === null || handled.current === raw) return;
    handled.current = raw;
    const next = new URLSearchParams(params.toString());
    next.delete("call");
    const rest = next.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname, { scroll: false });
    void resolveDeepLink(callIdFromParam(raw));
  }, [raw, params, pathname, router]);
  return null;
}
