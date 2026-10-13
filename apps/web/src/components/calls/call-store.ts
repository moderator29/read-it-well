"use client";

import { useSyncExternalStore } from "react";
import { newerSnapshot } from "@/lib/calls/lifecycle";
import { clockOffsetMs } from "@/lib/calls/screen";
import type { CallKind, CallSnapshot } from "@/lib/calls/types";

/**
 * THE ONE CALL ON THIS DEVICE, as a tiny store outside React.
 *
 * The thread header starts a call, the shell's incoming layer receives one,
 * a deep link resolves one, the admin desk starts one; all of them hand the
 * snapshot here, and the one `CallSurface` the shell mounts draws whatever is
 * here. A module store rather than a context, so a screen anywhere in the
 * tree can open the call without being under a provider, and a second screen
 * cannot open a second call: `showCall` for another id while one is live is
 * refused (the database allows one live call per person anyway).
 *
 * Snapshots merge through `newerSnapshot` (higher version wins, a finished
 * call never comes back), and the server-clock offset is refreshed from every
 * snapshot, so no screen ever counts on the device clock.
 *
 * Nothing here holds a token. Join credentials live in the call stage's own
 * memory for as long as the connection does.
 */

export type CallContext = {
  /** What the conversation is about: a listing or business title, "Stay booking". */
  line?: string | null;
};

export type ActiveCall = {
  snapshot: CallSnapshot;
  /** Server clock minus device clock, in ms, from the latest snapshot. */
  offsetMs: number;
  context: CallContext;
  /** How the callee answered: with video, or voice only. Null until they answer. */
  answeredWith: CallKind | null;
  /** Set when a deep link or a nudge found the call already over: the recovery screen. */
  recovery: "ended" | null;
  /**
   * Opened by a link or a nudge for a call already live and mine (a reload,
   * a push tap mid-call): media is asked for only after a tap on Rejoin,
   * never on page load.
   */
  resume: boolean;
};

type State = {
  active: ActiveCall | null;
  /** A deep link to a call that is not this person's, or no longer exists. */
  gone: boolean;
  /** Contexts the open thread registered, so a call from it carries the listing line. */
  contexts: Record<string, CallContext>;
};

let state: State = { active: null, gone: false, contexts: {} };
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function callState(): State {
  return state;
}

export function useCallStore(): State {
  return useSyncExternalStore(subscribe, callState, callState);
}

/** Open a call on the surface. Refused (false) while another call is open. */
export function showCall(
  snapshot: CallSnapshot,
  opts: { context?: CallContext; recovery?: "ended" | null; answeredWith?: CallKind | null; resume?: boolean } = {},
): boolean {
  const current = state.active;
  if (current && current.snapshot.id !== snapshot.id && !current.recovery && !isOver(current.snapshot)) return false;
  const merged = current && current.snapshot.id === snapshot.id ? newerSnapshot(current.snapshot, snapshot) : snapshot;
  const context =
    opts.context ?? (snapshot.conversationId ? state.contexts[snapshot.conversationId] : undefined) ?? current?.context ?? {};
  set({
    ...state,
    gone: false,
    active: {
      snapshot: merged,
      offsetMs: clockOffsetMs(snapshot.serverNow, Date.now()),
      context,
      answeredWith: opts.answeredWith ?? (current && current.snapshot.id === snapshot.id ? current.answeredWith : null),
      recovery: opts.recovery ?? null,
      resume: opts.resume ?? false,
    },
  });
  return true;
}

function isOver(s: CallSnapshot): boolean {
  return ["ENDED", "DECLINED", "CANCELLED", "MISSED", "BUSY", "FAILED", "EXPIRED"].includes(s.state);
}

/** A fresher view of the open call (heartbeat, nudge, action reply). Ignored for any other id. */
export function mergeSnapshot(snapshot: CallSnapshot): void {
  const current = state.active;
  if (!current || current.snapshot.id !== snapshot.id) return;
  const next = newerSnapshot(current.snapshot, snapshot);
  if (next === current.snapshot && snapshot.serverNow === current.snapshot.serverNow) return;
  set({
    ...state,
    active: { ...current, snapshot: next, offsetMs: clockOffsetMs(snapshot.serverNow, Date.now()) },
  });
}

export function setAnsweredWith(kind: CallKind): void {
  if (!state.active) return;
  set({ ...state, active: { ...state.active, answeredWith: kind } });
}

/** The person tapped Rejoin: media may now be asked for. */
export function confirmResume(): void {
  if (!state.active?.resume) return;
  set({ ...state, active: { ...state.active, resume: false } });
}

export function dismissCall(): void {
  if (!state.active && !state.gone) return;
  set({ ...state, active: null, gone: false });
}

/** The calm "this call is no longer available" screen. */
export function showGone(): void {
  if (state.active && !state.active.recovery && !isOver(state.active.snapshot)) return;
  set({ ...state, active: null, gone: true });
}

/** The open thread says what it is about, for the outgoing and incoming screens. */
export function registerContext(conversationId: string, context: CallContext): () => void {
  set({ ...state, contexts: { ...state.contexts, [conversationId]: context } });
  return () => {
    const { [conversationId]: _drop, ...rest } = state.contexts;
    void _drop;
    set({ ...state, contexts: rest });
  };
}

/** Tests and previews only: start from nothing. */
export function resetCallStore(): void {
  set({ active: null, gone: false, contexts: {} });
}
