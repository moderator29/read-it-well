/**
 * THE NIGHT DOORS: screens that are dark whatever theme the member chose.
 *
 * The founder, 30 September 2026: Get started, the sign-up flow (sign-up and
 * its code step) and the passcode screens (setting a code, and the 6-digit
 * Welcome back lock) are "built on dark mode on default". Sign-in with a
 * password, forgot password and the new password page follow the member's
 * theme like every other screen.
 *
 * HOW A DOOR IS DARK, in three layers, so no one of them has to be perfect:
 *   1. an ISLAND: the door's wrapper carries `data-theme="dark"`, which
 *      redeclares the night palette for its subtree (tokens.css, the note on
 *      `[data-theme="dark"]`), so the door is dark even before any script;
 *   2. the ROOT: while a door is on screen `<html>` carries `data-door="night"`
 *      and its applied theme is dark (the before-paint script in `theme.ts` on
 *      a hard load, `useNightDoor` on a soft one). That is what makes the
 *      canvas behind the page, the overscroll, the native controls, anything
 *      portalled to <body> (a sheet, a success moment) and every
 *      `:root[data-theme="light"] ...` rule agree with the door;
 *   3. the CHROME: the browser's theme colour and the native status bar take
 *      the night colour (the route's `viewport` export, the boot script and
 *      `applyTheme`, which the status bar listens to).
 *
 * The member's CHOICE is never touched: `data-theme-choice` and the cookie
 * keep Light, and leaving the door puts Light back.
 */

/** The door routes, as a regular expression source the boot script shares. */
export const NIGHT_DOOR_PATH_SOURCE = "^\\/(welcome|sign-up)(\\/|$)";

const NIGHT_DOOR_PATH = new RegExp(NIGHT_DOOR_PATH_SOURCE);

/** True for a path that is always dark (`/welcome`, `/sign-up` and below). */
export function isNightDoorPath(pathname: string | null | undefined): boolean {
  return typeof pathname === "string" && NIGHT_DOOR_PATH.test(pathname);
}

/** The root attribute that marks a night door as on screen. */
export const NIGHT_DOOR_ATTR = "door";
export const NIGHT_DOOR_VALUE = "night";
