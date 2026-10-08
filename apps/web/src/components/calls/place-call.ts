"use client";

import { startCall } from "@/lib/calls/actions";
import { startOutcome, startRefusal, type StartOutcome, type StartRefusal } from "@/lib/calls/screen";
import type { CallKind, CallSnapshot } from "@/lib/calls/types";
import { showCall, type CallContext } from "./call-store";

/**
 * A v4 UUID for one tap. `crypto.randomUUID` exists only in a secure context,
 * so a page served over plain http (a phone on the LAN in development) builds
 * one from `getRandomValues`, which every browser has.
 */
export function newTapKey(): string | undefined {
  if (typeof crypto === "undefined") return undefined;
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type PlaceResult =
  | { ok: true; outcome: StartOutcome; snapshot: CallSnapshot }
  | { ok: false; refusal: StartRefusal; error: string };

/**
 * One tap on a call button, end to end, for every place that can start a
 * conversation call (the thread header, a call-back on a history row, the
 * ended screen). A fresh `tapKey` per tap, so a double tap or a retried
 * request is one call (`replayed`). The answer decides the screen:
 *
 *   outgoing  ringing them: the outgoing screen
 *   incoming  glare, they were already ringing me here: THEIR incoming call
 *   busy      they are on another call (the database records it and tells them)
 *   ended     a replayed tap whose call is already over: nothing opens
 *
 * A refusal comes back as the sentence plus its kind, so "they have not
 * replied yet" can be drawn as its own calm note.
 */
export async function placeCall(input: {
  conversationId: string;
  kind: CallKind;
  context?: CallContext;
}): Promise<PlaceResult> {
  const tapKey = newTapKey();
  let answer: Awaited<ReturnType<typeof startCall>>;
  try {
    answer = await startCall({ conversationId: input.conversationId, kind: input.kind, ...(tapKey ? { tapKey } : {}) });
  } catch {
    return { ok: false, refusal: "other", error: "The call did not go through just now. Please try again in a moment." };
  }
  if (!answer.ok) return { ok: false, refusal: startRefusal(answer.error), error: answer.error };
  const outcome = startOutcome(answer.data);
  if (outcome === "outgoing" || outcome === "incoming") {
    showCall(answer.data, input.context ? { context: input.context } : {});
  }
  return { ok: true, outcome, snapshot: answer.data };
}
