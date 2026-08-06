/**
 * The shape of Nigeria's reference data, and the words used about it.
 *
 * Client-safe on purpose. A picker is a client component and needs these types
 * and these strings; putting them beside the server reads would make the whole
 * module server-only and the import would typecheck and then fail the build,
 * which is the trap recorded in docs/HANDOFF.md section 6.
 */

/** One of the 37 rows in public.states, the FCT included. */
export type StateOption = {
  /** Two letters, the primary key. Lagos is LA. */
  code: string;
  name: string;
};

/** One of the 774 rows in public.local_governments. */
export type LocalGovernmentOption = {
  /** Readable and stable, for example `la_ikeja`. */
  code: string;
  stateCode: string;
  name: string;
};

/** One of the 749 rows in public.occupations. */
export type OccupationOption = {
  code: string;
  name: string;
  category: string;
  /**
   * Position in the pinned shortcut group, or null for the great majority of
   * rows that only appear under their own category.
   */
  commonRank?: number | null;
};

/** Occupations under one category heading, which is how the picker draws them. */
export type OccupationGroup = {
  category: string;
  options: OccupationOption[];
  /** True on the pinned shortlist, whose rows repeat under their own category. */
  shortcut?: boolean;
};

/**
 * SQLSTATE RM020 is raised by `private.guard_profile_place` when a local
 * government is asked for in a state it does not belong to. The database is
 * the boundary, not the form, so this sentence exists to translate the refusal
 * into something a person can act on rather than showing them a code.
 */
export const PLACE_MISMATCH_SQLSTATE = "RM020";

export const PLACE_MISMATCH_MESSAGE =
  "That local government is not in that state. Pick the state first, then choose from the list underneath it.";

/**
 * The heading over the pinned shortcut group.
 *
 * Named, not implied. "Suggested" would be a claim about the person opening the
 * picker, which this list is not: it is a claim about the country, and it says
 * so.
 */
export const COMMON_OCCUPATIONS_CATEGORY = "Common in Nigeria";

/**
 * Group a flat occupation list by category, keeping the server's ordering, with
 * the shortlist pinned above the alphabet.
 *
 * Rows carrying a `commonRank` are copied into a leading group ordered by that
 * rank, and are ALSO left under their own category. The duplication is
 * deliberate: the shortcut exists so a market trader never scrolls, and the
 * category listing exists so somebody browsing Technology finds Software
 * Engineer where they expect it. Removing the row from its category to avoid
 * showing it twice would break the second promise to keep the first.
 *
 * `<li>` keys are per group, so a row appearing in two groups is not a React
 * key collision. The picker drops the shortcut group while a search is running,
 * which is where a duplicate would otherwise read as a bug.
 */
export function groupOccupations(
  options: OccupationOption[],
  /* The heading, in the reader's language. Defaults to English so a caller
     that has no dictionary - a test, a script - still gets a sensible one. */
  commonLabel: string = COMMON_OCCUPATIONS_CATEGORY,
): OccupationGroup[] {
  const groups: OccupationGroup[] = [];
  const index = new Map<string, OccupationGroup>();

  for (const option of options) {
    let group = index.get(option.category);
    if (!group) {
      group = { category: option.category, options: [] };
      index.set(option.category, group);
      groups.push(group);
    }
    group.options.push(option);
  }

  const common = options
    .filter((option) => typeof option.commonRank === "number")
    .sort((a, b) => (a.commonRank as number) - (b.commonRank as number));

  if (common.length === 0) return groups;

  return [
    { category: commonLabel, options: common, shortcut: true },
    ...groups,
  ];
}

/**
 * Match on the words a person actually types. Names carry hyphens and spaces
 * ("Ajeromi-Ifelodun", "Ibeju-Lekki"), and somebody searching for "ifelodun"
 * or "ibeju lekki" means the same row, so both are folded to plain letters and
 * digits before comparing.
 */
export function searchKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** True when every word typed appears somewhere in the haystack. */
export function matchesSearch(haystack: string, query: string): boolean {
  const words = searchKey(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const target = searchKey(haystack);
  return words.every((word) => target.includes(word));
}
