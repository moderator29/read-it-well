/**
 * OPS-18: how long a streamed model call may take, and how long it may go
 * quiet.
 *
 * The assistant and support routes passed only the visitor's own signal, so
 * an upstream stream that stalled with its socket open held the function
 * until the platform's hard limit: billed seconds, and a spinner that never
 * resolved. Now a request has a total budget (`requestSignal`), and each
 * streamed round is also cut when no event has arrived for `IDLE_MS`
 * (`roundWatchdog`). Either way the route's catch tells the person the
 * answer could not be finished, the same as any upstream failure.
 *
 * Both routes export `maxDuration = 60`, above the 50 s budget, so the
 * route's own message always gets out before the platform stops it.
 */
export const TOTAL_MS = 50_000;
export const IDLE_MS = 15_000;

/**
 * The clock the deadlines run on. The routes use the real one; a test hands
 * in a clock it advances by hand, so a cut is proved by an exact tick rather
 * than by racing a wall clock on a busy machine.
 */
export type DeadlineTimers = {
  setTimeout: (run: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const REAL_TIMERS: DeadlineTimers = {
  /* Unref'd, as `AbortSignal.timeout` is, so a pending budget never holds the process open. */
  setTimeout: (run, ms) => {
    const handle = setTimeout(run, ms);
    handle.unref?.();
    return handle;
  },
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** The visitor's signal, plus the request's total budget. */
export function requestSignal(
  client: AbortSignal,
  totalMs: number = TOTAL_MS,
  timers: DeadlineTimers = REAL_TIMERS,
): AbortSignal {
  const budget = new AbortController();
  timers.setTimeout(() => budget.abort(new Error("the request ran past its budget")), totalMs);
  return AbortSignal.any([client, budget.signal]);
}

/**
 * A signal for one streamed round that also aborts after `idleMs` without a
 * `touch()`. Call `touch()` for every event received and `done()` when the
 * round ends, so no timer outlives it.
 */
export function roundWatchdog(outer: AbortSignal, idleMs: number = IDLE_MS, timers: DeadlineTimers = REAL_TIMERS) {
  const idle = new AbortController();
  const arm = () => timers.setTimeout(() => idle.abort(new Error("upstream went quiet")), idleMs);
  let timer = arm();
  return {
    signal: AbortSignal.any([outer, idle.signal]),
    touch() {
      timers.clearTimeout(timer);
      timer = arm();
    },
    done() {
      timers.clearTimeout(timer);
    },
  };
}
