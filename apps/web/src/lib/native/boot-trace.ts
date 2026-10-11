/**
 * One stage of the boot trace, from the native runtime's side.
 *
 * The trace starts in the head's inline script (`STARTUP_NATIVE_SCRIPT`,
 * components/startup/startup-script.ts), which defines `window.__nfMark`
 * before anything else runs. This adds the stages that arrive later, through
 * the dynamic imports in `boot.ts` and the hide in `splash.ts`, to the same
 * line: console, `performance.mark("nf:<stage>")` and
 * `localStorage.nf_boot_trace`. Imports nothing, so it costs the website
 * nothing; and if the head script never ran, it does nothing at all.
 */
export function bootMark(stage: string): void {
  try {
    const mark = (window as unknown as { __nfMark?: (stage: string) => void }).__nfMark;
    if (typeof mark === "function") mark(stage);
  } catch {
    /* A trace must never be the thing that fails. */
  }
}
