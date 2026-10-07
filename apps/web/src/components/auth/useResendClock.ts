"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  EMPTY_RECORD,
  parseRecord,
  remainingShare,
  resendState,
  secondsLeft,
  withRefusal,
  withSend,
  type ResendRecord,
  type ResendState,
} from "./resend-clock";
import { RESEND_RULES, type ResendFlow } from "./resend-rule";

/**
 * THE RESEND CLOCK ON THE SCREEN (W11, 6 October 2026): the memory of what was
 * sent to this address on this device, and the time left, both read from the
 * real rule (`resend-rule.ts`) through the pure clock (`resend-clock.ts`).
 *
 * THE MEMORY is `sessionStorage`, keyed by flow and address, so it survives a
 * reload and a tab that slept (the countdown picks up at the true remaining
 * time, never at the start) and goes when the tab does, which is when the code
 * stops mattering. It is read through `useSyncExternalStore`, so the server
 * and the first client render agree (nothing is known, `ready`) and the
 * stored record arrives on the next render without an effect setting state.
 * Storage that refuses (a private window, blocked site data) is the empty
 * record: no pace is shown, and the server's ceiling still governs.
 *
 * THE TICK is one timeout aimed at the next whole second of the remaining
 * time, re-aimed from the wall clock every time it fires, so a throttled
 * background tab shows the right number the moment it is looked at and the
 * clock never drifts. It runs only while a wait is on screen.
 */
const EVENT = "nf:resend-record";

const keyOf = (flow: ResendFlow, target: string) => `nf:resend:${flow}:${target.trim().toLowerCase()}`;

function read(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, record: ResendRecord) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(record));
  } catch {
    /* A refused write only loses the pace, never the ceiling. */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * For a screen that sends a code but is not the one that waits on it: the
 * sign-up form notes that a code is on its way the moment it submits, so the
 * code screen that opens next knows when it was sent and shows the true time
 * left, not a fresh thirty seconds. `forgetResendSend` takes it back when the
 * server refused the sign-up (a code that never went out has no pace).
 */
export function noteResendSend(flow: ResendFlow, target: string, kind: "first" | "resend" = "first") {
  const key = keyOf(flow, target);
  write(key, withSend(parseRecord(read(key)), Date.now(), RESEND_RULES[flow], kind));
}

export function forgetResendSend(flow: ResendFlow, target: string) {
  const key = keyOf(flow, target);
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* Nothing was written either. */
  }
  window.dispatchEvent(new Event(EVENT));
}

export type ResendClock = {
  state: ResendState;
  /** Whole seconds left on the wait on screen, 0 when ready. */
  seconds: number;
  /** How many resends this screen has made to this address (the ones the ceiling counts). */
  sendCount: number;
  /** 1 at the start of the wait, 0 at its deadline, for the hairline. */
  share: number;
  /** Milliseconds to the deadline, for the hairline's own transition. */
  msLeft: number;
  /** A code went out now. `first` is the send that opened the screen; `resend` is one the ceiling counts. */
  recordSend: (kind: "first" | "resend") => void;
  /** The server refused a send: the window is spent until it ends. */
  recordRefusal: () => void;
};

export function useResendClock(flow: ResendFlow, target: string): ResendClock {
  const rule = RESEND_RULES[flow];
  const key = keyOf(flow, target);
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "",
  );
  const record = raw ? parseRecord(raw) : EMPTY_RECORD;
  const [now, setNow] = useState(() => Date.now());
  const state = resendState(record, now, rule);

  /* One timeout, aimed at the next whole second of what is left. */
  const until = state.kind === "ready" ? null : state.until;
  useEffect(() => {
    if (until === null) return;
    const left = until - Date.now();
    /* A deadline already past ticks at once (a callback, not the effect body). */
    const timer = window.setTimeout(() => setNow(Date.now()), left <= 0 ? 0 : left % 1000 || 1000);
    return () => window.clearTimeout(timer);
  }, [until, now]);

  const recordSend = useCallback(
    (kind: "first" | "resend") => {
      const at = Date.now();
      setNow(at);
      write(key, withSend(parseRecord(read(key)), at, rule, kind));
    },
    [key, rule],
  );
  const recordRefusal = useCallback(() => {
    const at = Date.now();
    setNow(at);
    write(key, withRefusal(parseRecord(read(key)), at));
  }, [key]);

  return {
    state,
    seconds: secondsLeft(state, now),
    sendCount: record.resends.length,
    share: remainingShare(state, now),
    msLeft: until === null ? 0 : Math.max(0, until - now),
    recordSend,
    recordRefusal,
  };
}
