import type { ResendRule } from "./resend-rule";

/**
 * THE RESEND CLOCK, AS A PURE FUNCTION (W11, 6 October 2026).
 *
 * "Send a new code" is governed by two real limits (`resend-rule.ts`): a
 * pace after any send, and a ceiling per fixed server window. This turns the
 * screen's memory of what it has sent into what to show NOW: ready, waiting
 * out the pace until an instant, or out of sends until the window ends.
 * Everything is an absolute time in milliseconds since the epoch, never a
 * counter that is decremented, so a tab that slept, a timer that ran late and
 * a reload all land on the same, true remaining time.
 *
 * WHAT IT WILL NOT DO is invent a deadline. If the screen does not know when
 * a code was last sent (a page reload on a device that never saw the send),
 * the pace is unknown and the state is `ready`: the server's own ceiling still
 * governs, and a refusal from it is recorded (`withRefusal`) and shown as the
 * real window end. A countdown that was not derived from a real send or a real
 * refusal does not exist here.
 *
 * Pure and deterministic, so `resend-clock.test.ts` holds every edge.
 */
export type ResendRecord = {
  /** When a code was last sent to this address, or null when not known. */
  lastSentAt: number | null;
  /** When the RESENDS (the ones the ceiling counts) were made, newest last. */
  resends: readonly number[];
  /** When the server last refused a send, or null. */
  refusedAt: number | null;
};

export const EMPTY_RECORD: ResendRecord = { lastSentAt: null, resends: [], refusedAt: null };

export type ResendState =
  | { kind: "ready" }
  /** The pace: wait until `until` since the last send. `from` is that send. */
  | { kind: "gap"; from: number; until: number }
  /** The ceiling: every send in this window is spent; it ends at `until`. */
  | { kind: "window"; from: number; until: number };

const MS = 1_000;

/** The fixed window an instant belongs to, as the server numbers them. */
export function windowIndex(at: number, windowSeconds: number): number {
  return Math.floor(at / MS / windowSeconds);
}

/** The instant the window containing `at` ends, which is also when the next one starts. */
export function windowEnd(at: number, windowSeconds: number): number {
  return (windowIndex(at, windowSeconds) + 1) * windowSeconds * MS;
}

export function resendState(record: ResendRecord, now: number, rule: ResendRule): ResendState {
  const current = windowIndex(now, rule.windowSeconds);
  const sameWindow = (at: number) => windowIndex(at, rule.windowSeconds) === current;
  const windowStart = current * rule.windowSeconds * MS;

  /* The server said no inside this window: it stays no until the window ends,
     whatever this screen thinks it has sent. */
  if (record.refusedAt !== null && sameWindow(record.refusedAt)) {
    return { kind: "window", from: windowStart, until: windowEnd(now, rule.windowSeconds) };
  }
  if (record.resends.filter(sameWindow).length >= rule.limit) {
    return { kind: "window", from: windowStart, until: windowEnd(now, rule.windowSeconds) };
  }
  if (record.lastSentAt !== null) {
    const until = record.lastSentAt + rule.gapSeconds * MS;
    if (now < until) return { kind: "gap", from: record.lastSentAt, until };
  }
  return { kind: "ready" };
}

/** A code was sent at `at`. A resend is one the ceiling counts; the first send is not. */
export function withSend(
  record: ResendRecord,
  at: number,
  rule: ResendRule,
  kind: "first" | "resend",
): ResendRecord {
  /* Anything older than the window can never count again: keep the record small. */
  const keep = record.resends.filter((t) => at - t < rule.windowSeconds * MS);
  return {
    lastSentAt: at,
    resends: kind === "resend" ? [...keep, at] : keep,
    /* A send that was accepted ends any earlier refusal's claim on the window. */
    refusedAt: null,
  };
}

/** The server refused a send at `at`. */
export function withRefusal(record: ResendRecord, at: number): ResendRecord {
  return { ...record, refusedAt: at };
}

/** How much of the wait has gone: 1 at the start, 0 at the deadline. For the draining hairline. */
export function remainingShare(state: ResendState, now: number): number {
  if (state.kind === "ready") return 0;
  const span = state.until - state.from;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (state.until - now) / span));
}

/** Whole seconds left, never below 1 while a wait is on (so "0s" is never shown). */
export function secondsLeft(state: ResendState, now: number): number {
  if (state.kind === "ready") return 0;
  return Math.max(1, Math.ceil((state.until - now) / MS));
}

/** "12:04" for a long wait; whole seconds under a minute. Tabular on screen. */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${String(rest).padStart(2, "0")}`;
}

/** Tolerant: anything that is not a well-formed record is the empty one. */
export function parseRecord(raw: string | null | undefined): ResendRecord {
  if (!raw) return EMPTY_RECORD;
  try {
    const v = JSON.parse(raw) as Partial<ResendRecord> | null;
    if (!v || typeof v !== "object") return EMPTY_RECORD;
    const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
    return {
      lastSentAt: num(v.lastSentAt),
      resends: Array.isArray(v.resends) ? v.resends.filter((x): x is number => num(x) !== null).slice(-16) : [],
      refusedAt: num(v.refusedAt),
    };
  } catch {
    return EMPTY_RECORD;
  }
}
