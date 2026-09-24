/**
 * THE WAY TO OPEN THE WORKSPACE SHEET WITHOUT KNOWING HOW IT IS DRAWN.
 *
 * `/profile` has a "Switch role" row whose job is to open the one
 * workspace sheet. Before this file the only way it could was to find the
 * dock's own button by its class name and click it:
 *
 *     document.querySelector(".nf-tab__link--switch")?.click()
 *
 * That is one component reaching into another component's stylesheet. Rename
 * `.nf-tab__link--switch` in `chrome.css` and the profile row stops working
 * silently: nothing throws, no test fails, and the row just does nothing when
 * tapped. It is the same shape of fault as a constant with no consumer passing
 * its own unit test, which is the fault this whole stint was sent to fix.
 *
 * So the opener is a NAMED EVENT and the name lives in one file that both sides
 * import. A caller that fires it cannot be broken by a class rename, and a
 * rename of this constant breaks the build on both sides at once, which is the
 * whole point.
 *
 * THIS DOES NOT REOPEN THE PLACEMENT RULING. The founder ruled on 22 September
 * that the sheet has ONE entrance, the dock, and that the drawer's row is
 * removed rather than moved: "it lives in the dock now and two entrances to the
 * same sheet in the same product is clutter". This is not a second entrance. It
 * is the same single sheet, reached by a row that already exists on a different
 * surface, and the dock instance is still the only one rendered inside the app
 * shell.
 *
 * WHY AN EVENT RATHER THAN CONTEXT. The sheet lives in `AppShell`, and the
 * profile row is rendered by a route far below it in a tree that is mostly
 * server components. A context provider would have to be threaded through a
 * server boundary; a window event costs nothing and crosses it. It is also what
 * makes the fallback honest: fire it where no switcher is mounted and nothing
 * happens, which is exactly the state `/profile` already falls back on.
 */
export const PROFILE_SWITCHER_EVENT = "vallo:open-profile-switcher";

/**
 * Ask the workspace sheet to open, from anywhere.
 *
 * Safe on the server and safe when no switcher is mounted: it returns false and
 * the caller falls back, which today means navigating to `/profile/setup`.
 * Returning a boolean rather than nothing is deliberate, so a caller can tell
 * "the sheet opened" from "there was no sheet" instead of guessing.
 */
export function openProfileSwitcher(): boolean {
  if (typeof window === "undefined") return false;
  window.dispatchEvent(new CustomEvent(PROFILE_SWITCHER_EVENT));
  return true;
}
