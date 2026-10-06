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
  /** The report sheet's title and its subject line (`{handle}` in `reportPostedBy`). */
  reportTitle: string;
  reportPostedBy: string;
  reportPostedOnAround: string;
  /** The author in the menu's sentences when they have no handle. */
  thisPerson: string;
  /** A post's menu rows (`actionsForPost`). */
  menu: MenuWords;
  /** The report sheet's reasons and words (`ReportSheet`). */
  report: ReportWords;
};

/** A post's menu: each row's action and what it does. */
export type MenuWords = Dictionary["experienceSocial"]["feed"]["menu"];

/** The report sheet's words, the same small object for a post, a comment, a story and an account. */
export type ReportWords = Dictionary["experienceSocial"]["feed"]["report"];

/** The report sheet's words alone, for a screen with no post menu (a profile, a story). */
export function reportWordsOf(t: Dictionary): ReportWords {
  return t.experienceSocial.feed.report;
}

export function sheetWordsOf(t: Dictionary): SheetWords {
  const feed = t.experienceSocial.feed;
  return {
    body: feed.sheetBody,
    dismissLabel: t.experienceUi.notNow,
    reportTitle: feed.reportTitle,
    reportPostedBy: feed.reportPostedBy,
    reportPostedOnAround: feed.reportPostedOnAround,
    thisPerson: feed.thisPerson,
    menu: feed.menu,
    report: reportWordsOf(t),
  };
}
