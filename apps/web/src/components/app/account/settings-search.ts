import type { Dictionary } from "@vallo/i18n";

/**
 * The index behind the settings search box.
 *
 * ---------------------------------------------------------------------------
 * THE REASON THIS WAS NOT BUILT THE FIRST TIME, AND WHAT CHANGED.
 *
 * Settings is twelve stacked cards and four thousand pixels of scroll, and both
 * iOS and Android put a search over a list that long. The objection to building
 * one here was real: the twelve sections are twelve separate components, each
 * holding its own copy, so a filter at the top of the page would have to be
 * handed a second hard-coded list of every label and row on the screen. Two
 * copies of the words is how one of them goes stale, and a settings search that
 * has quietly stopped matching a row is worse than none, because the reader
 * concludes the setting does not exist.
 *
 * WHAT MAKES IT SAFE IS THAT EACH SECTION ALREADY READS EXACTLY ONE DICTIONARY
 * BLOCK. `AppearanceCard` binds `t.settings.appearance` and renders out of it.
 * `SecurityCard` binds `t.settings.security`. So the searchable text of a
 * section is not a list somebody has to maintain: it is every string in the
 * block the section is already rendering from. Rename a row, add a row, remove
 * one, translate the lot into Igbo, and the index follows without anybody
 * touching it. There is no second copy because there is no copy at all.
 *
 * The cost of that choice is that the index is slightly WIDER than the screen:
 * a block may hold a string a particular branch does not render, so a search can
 * match a section on a word that is not visible in it today. That is the right
 * direction to be wrong in. A search that shows you a section you then have to
 * read is a small annoyance; a search that hides the section holding the thing
 * you came to change is the failure that matters.
 */

/**
 * The search box's own words.
 *
 * ENGLISH, AND NAMED IN THE SPRINT REPORT. `t.settings` has no keys for a
 * control that did not exist until now, and `packages/i18n` belongs to another
 * owner. Stated once here rather than inline in the page, so the dictionary
 * pass is one import to delete rather than four literals to hunt. Everything
 * the search MATCHES is already translated; only the four strings around the
 * box are not.
 */
export const SETTINGS_SEARCH_COPY = {
  placeholder: "Search settings",
  noMatchTitle: "Nothing in settings matches that",
  noMatchBody:
    "Try a shorter word, or part of it. Nothing has been changed by searching, and every setting is still here.",
  clear: "Show every setting",
} as const;

/** A section of the settings screen, as the search and the jump list see it. */
export type SettingsSection = {
  /** The anchor id on the page. Also the key the page renders against. */
  id: string;
  /** What the jump chip says. The section's own heading, from the dictionary. */
  label: string;
  /** Every string the section can render, lower-cased, for matching. */
  haystack: string;
};

/**
 * Every string inside a dictionary block, flattened and lower-cased.
 *
 * Depth-limited rather than unbounded: the dictionary is hand-written and
 * shallow, and a cycle is impossible in a literal, but a recursion with no
 * floor in a function that runs on every settings render is the kind of thing
 * that is fine until somebody nests a block six deep for a good reason.
 */
export function flattenTerms(block: unknown, depth = 0): string {
  if (typeof block === "string") return block;
  if (depth > 4 || block === null || typeof block !== "object") return "";
  return Object.values(block as Record<string, unknown>)
    .map((value) => flattenTerms(value, depth + 1))
    .filter((value) => value.length > 0)
    .join(" ");
}

function section(id: string, label: string, ...blocks: unknown[]): SettingsSection {
  return {
    id,
    label,
    /* The label is in the haystack as well as beside it, so typing the name of
       a section finds the section even when no row inside it matches. */
    haystack: [label, ...blocks.map((block) => flattenTerms(block))].join(" ").toLowerCase(),
  };
}

/**
 * The twelve sections, in the order the page renders them.
 *
 * Built here rather than in the page because the page's job is to lay them out
 * and this is the only place that has to know which dictionary block belongs to
 * which section. A thirteenth section is one line here and one `<section>`
 * there; leaving it out of this list costs it its jump chip and its searchable
 * text, which is visible immediately rather than silently.
 */
export function settingsSections(t: Dictionary): SettingsSection[] {
  return [
    /* Language is a ROW of the appearance group rather than a card of its own,
       so its block is indexed under appearance. Somebody searching "Hausa"
       should land on the card that actually holds the control. */
    section("settings-appearance", t.settings.appearance.label, t.settings.appearance, t.settings.language),
    section("settings-place", t.settings.place.label, t.settings.place),
    section("settings-interests", t.interests.screenTitle, t.interests),
    section("settings-notifications", t.settings.notifications.label, t.settings.notifications, t.settings.notify),
    section("settings-privacy", t.settings.privacy.label, t.settings.privacy),
    section("settings-search", t.settings.search.label, t.settings.search),
    section("settings-security", t.settings.security.label, t.settings.security),
    section("settings-devices", t.settings.devices.rowLabel, t.settings.devices),
    section("settings-data", t.settings.data.label, t.settings.data),
    section("settings-account", t.settings.account.label, t.settings.account, t.settings.delete),
    /*
     * Help and support is the one section whose words are not in the
     * dictionary: `components/app/account/SupportChat.tsx` writes "Help and
     * support" and its subtitle in English literals. Those two terms are named
     * here so the section is at least findable, and the keys are in the sprint
     * report. This IS the second copy the rest of this file exists to avoid,
     * and it is here deliberately, marked, and one line long, because the
     * alternative is a section of the settings screen that search cannot see.
     */
    section("settings-help", t.settings.about.help, "help support assistant contact us ticket"),
    section("settings-about", t.settings.about.label, t.settings.about),
  ];
}

/**
 * The sections a query leaves standing.
 *
 * A bare `includes` on a lower-cased haystack, which is the right amount of
 * cleverness for a twelve-item list: no stemming, no fuzzy matching, no ranking.
 * Every word of the query has to appear somewhere in the section, so "dark
 * text" finds appearance and "dark bank" finds nothing, which is what somebody
 * typing two words means.
 */
export function matchSettings(sections: SettingsSection[], query: string): SettingsSection[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return sections;
  return sections.filter((entry) => words.every((word) => entry.haystack.includes(word)));
}
