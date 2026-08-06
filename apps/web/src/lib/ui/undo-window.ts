/**
 * An undo window: a destructive action held back long enough to take back.
 *
 * Inbox item 26 asks for undo instead of a confirm dialogue, and for anything
 * genuinely destructive the two are not interchangeable implementations of the
 * same idea. A dialogue defends against the tap somebody meant to make. Undo
 * defends against the one they did not, which is the tap that actually causes
 * harm. But undo can only be offered on something reversible, and deleting a
 * draft listing removes the row AND its photos out of storage, so there is
 * nothing left to restore afterwards.
 *
 * So the order is inverted: the row leaves the screen at once, and the delete
 * does not reach the server until the offer to take it back has run out. The
 * screen tells the truth about what will happen, and nothing irreversible has
 * happened yet.
 *
 * This module owns the timing and nothing else. No React, no DOM. That is
 * deliberate: the surface it was written for is the agent's listings
 * workspace, which cannot be opened in a browser until somebody signs up,
 * becomes an agent and saves a draft, so a Playwright spec cannot reach it at
 * all. The risky part is not the markup, it is whether a delete can be sent
 * twice, or sent after an undo, or quietly dropped when the screen closes.
 * Kept here, that part is provable now rather than whenever supply arrives.
 */

export type UndoWindowOptions = {
  /** How long the offer stands, in milliseconds. */
  readonly windowMs: number;
  /** Runs when an offer expires or is flushed. Never twice for one id. */
  readonly onCommit: (id: string) => void;
  /** Swappable for a test. Defaults to the platform timers. */
  readonly timers?: {
    set: (fn: () => void, ms: number) => unknown;
    clear: (handle: unknown) => void;
  };
};

export type UndoWindow = {
  /** Hold this id back. Scheduling an id that is already held does nothing. */
  schedule: (id: string) => void;
  /** Take it back. Returns false if the offer had already run out. */
  cancel: (id: string) => boolean;
  /** Commit everything outstanding now, in the order it was scheduled. */
  flush: () => void;
  /** Ids still held back: on the screen they are gone, in the database they are not. */
  held: () => string[];
};

export function createUndoWindow({
  windowMs,
  onCommit,
  timers = {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  },
}: UndoWindowOptions): UndoWindow {
  /* A Map, so the flush order is the order things were scheduled in. */
  const open = new Map<string, unknown>();

  /*
   * One commit per id, ever.
   *
   * `commit` is reached from three directions: the timer firing, a flush when
   * the screen closes, and a flush racing a timer that fired a tick earlier.
   * Taking the handle out of the map BEFORE calling out is what makes all
   * three safe, because the id is gone by the time anything re-enters.
   */
  const commit = (id: string) => {
    const handle = open.get(id);
    if (handle === undefined) return;
    open.delete(id);
    timers.clear(handle);
    onCommit(id);
  };

  return {
    schedule(id) {
      if (open.has(id)) return;
      open.set(id, timers.set(() => commit(id), windowMs));
    },
    cancel(id) {
      const handle = open.get(id);
      if (handle === undefined) return false;
      open.delete(id);
      timers.clear(handle);
      return true;
    },
    flush() {
      for (const id of [...open.keys()]) commit(id);
    },
    held() {
      return [...open.keys()];
    },
  };
}
