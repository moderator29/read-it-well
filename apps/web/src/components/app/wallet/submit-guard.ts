/**
 * A synchronous once-only latch for a money form's submit.
 *
 * `useActionState`'s `pending` only turns true after React has scheduled the
 * transition, so two taps inside the same frame can both reach the form's
 * action before the button disables. This latch is a plain variable read and
 * written synchronously in the submit handler, so the second tap is refused
 * before any request leaves the page. It is released when the action's
 * result comes back, so a refusal can be corrected and sent again.
 *
 * THIS NARROWS THE DOUBLE-SEND WINDOW; IT DOES NOT CLOSE IT. A reload, a
 * second tab or a replayed request still reaches `transferToUser`, which
 * ignores the idempotency key today (docs/SESSION_B_SCOPE.md, W1). Only the
 * server can close it.
 */
export type SubmitGuard = {
  /** True the first time; false for every call until `release`. */
  tryEnter: () => boolean;
  release: () => void;
  isBusy: () => boolean;
};

export function createSubmitGuard(): SubmitGuard {
  let busy = false;
  return {
    tryEnter() {
      if (busy) return false;
      busy = true;
      return true;
    },
    release() {
      busy = false;
    },
    isBusy() {
      return busy;
    },
  };
}
