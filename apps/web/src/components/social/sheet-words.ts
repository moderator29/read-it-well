import type { Dictionary } from "@vallo/i18n/core";

/**
 * THE TWO LINES A POST'S ACTION SHEET SAYS, HANDED DOWN FROM THE SERVER.
 *
 * `ActionSheet` used to read them itself through a client-side dictionary hook
 * (since deleted), which pulled all four dictionaries into the browser bundle: about 400KB gzipped on
 * every route that could open the sheet (`/profile`, `/u/[handle]`, `/around`,
 * `/around/[slug]`, `/post/[id]`; W13). A server page now builds this small
 * object and it travels down the client chain as one prop. It is required all
 * the way down, so a screen that forgets it fails to compile instead of
 * silently showing English.
 */
export type SheetWords = {
  /** The one line under the sheet's title. */
  body: string;
  /** The single quiet dismiss, the locale's "Not now". */
  dismissLabel: string;
};

export function sheetWordsOf(t: Dictionary): SheetWords {
  return { body: t.experienceSocial.feed.sheetBody, dismissLabel: t.experienceUi.notNow };
}
