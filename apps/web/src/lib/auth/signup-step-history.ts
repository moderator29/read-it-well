import { STEP_STATE_KEY } from "@/lib/nav/in-page-step";

/**
 * Sign up's two steps as history entries, as pure functions.
 *
 * Step two is pushed as its own entry on the same page (`?step=2`, stamped
 * `nfStep: 2` in the history state), so the browser's Back returns to step
 * one with every answer kept and Forward returns to step two. The address is
 * cosmetic and shareable-looking only; what decides the step is the stamp
 * plus the answers actually being in memory. A reload on `?step=2` has lost
 * the password (it is never stored), so it always opens on step one.
 */

export const STEP_PARAM = "step";

/** The address for `step`, keeping every other parameter and the hash. */
export function hrefForStep(
  location: { pathname: string; search: string; hash: string },
  step: 1 | 2,
): string {
  const params = new URLSearchParams(location.search);
  if (step === 2) params.set(STEP_PARAM, "2");
  else params.delete(STEP_PARAM);
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
}

/** The history state that marks an entry as step two. */
export function stepTwoState(): Record<string, number> {
  return { [STEP_STATE_KEY]: 2 };
}

/** Is this history entry the step-two entry this form pushed? */
export function isStepTwoEntry(state: unknown): boolean {
  return (
    !!state &&
    typeof state === "object" &&
    (state as Record<string, unknown>)[STEP_STATE_KEY] === 2
  );
}

/**
 * Which step a history traversal (Back or Forward) lands on. Step two only
 * when the entry is the stamped one AND step one's answers still pass,
 * otherwise step one, where the missing answer can be given.
 */
export function stepAfterTraversal(state: unknown, stepOneReady: boolean): 1 | 2 {
  return isStepTwoEntry(state) && stepOneReady ? 2 : 1;
}

/** Does this address ask for step two? Used to tidy the URL on arrival. */
export function asksForStepTwo(search: string): boolean {
  return new URLSearchParams(search).has(STEP_PARAM);
}
