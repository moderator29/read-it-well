import { AsyncLocalStorage } from "node:async_hooks";

/**
 * B-2: THE ACTIONS THE FINISH-SETUP HOLD NEVER BLOCKS.
 *
 * `resolveSession()` (lib/actions/session.ts) answers a Google or Apple
 * account that has not yet accepted the terms and the 18+ statement as
 * signed out inside a server action, so every write refuses in its own
 * envelope. Signing out, account deletion and restore, and read-only actions
 * run their body inside `setupExempt(...)`, which lifts that hold for every
 * resolution made within it, nested reads included.
 *
 * Its own module, with nothing server-only in it, so a test that stubs the
 * session module still gets the real scope.
 */
const exemptScope = new AsyncLocalStorage<true>();

/** Run `work` with the finish-setup hold lifted. For the exempt actions only. */
export function setupExempt<T>(work: () => Promise<T>): Promise<T> {
  return exemptScope.run(true, work);
}

/** True inside `setupExempt(...)`. */
export function insideSetupExempt(): boolean {
  return exemptScope.getStore() === true;
}
