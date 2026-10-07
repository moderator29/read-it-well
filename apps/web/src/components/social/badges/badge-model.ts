/**
 * THE BADGE ROW'S RULES, AS PURE FUNCTIONS (north star 7111 refusal, 15.1).
 *
 * A badge is a claim the platform makes on somebody's behalf (`docs/BADGES.md`
 * section 1), so this file decides three things and nothing else:
 *
 *   1. SIX AT MOST. Reference 7111 (eighty rainbow badges) is the refused
 *      pattern; a row of more than six is a wall. Which six: the highest tier
 *      first, then the most recently granted, so the row says the strongest
 *      true thing and then the freshest one.
 *   2. EARNED IS NOT GRANTED. A badge the nightly sweep awarded from recorded
 *      events (`granted_by` is null and the badge is not `manual_only`) is
 *      earned. One an admin put on somebody by hand is a decision, shown as
 *      what it is ("Given by the Vallo team") and never celebrated as an
 *      achievement, because a celebration of something that was handed over
 *      would be the platform lying about itself.
 *   3. THE MOMENT IS FOR WHAT IS NEW. The earned moment plays once, for an
 *      earned badge the owner has not yet been shown, and only while it is
 *      recent: somebody opening the app a year after the sweep awarded a badge
 *      is not being congratulated for it today.
 */

export type ProfileBadge = {
  code: string;
  name: string;
  /** The one line the database keeps about what earns it. */
  description: string;
  /** The commissioned object this badge is drawn with (a `BrandIcon` name). */
  objectName: string;
  tier: number;
  /** ISO timestamp the badge was granted. */
  grantedAt: string;
  /** The date, already worded in the reader's language by the server page. */
  grantedLabel: string;
  /** True only for a badge the nightly sweep awarded from recorded events. */
  earned: boolean;
};

export const BADGE_ROW_MAX = 6;
/** A badge is "new" for this long after it is granted. */
export const MOMENT_WINDOW_DAYS = 30;

/** The row: at most six, strongest tier first, then newest. Pure; does not mutate. */
export function pickBadges(badges: readonly ProfileBadge[]): ProfileBadge[] {
  return [...badges]
    .sort((a, b) => b.tier - a.tier || Date.parse(b.grantedAt) - Date.parse(a.grantedAt))
    .slice(0, BADGE_ROW_MAX);
}

/** Whether a stored grant is an earned badge rather than a hand-given one. */
export function isEarnedGrant(grant: { grantedBy: string | null; manualOnly: boolean }): boolean {
  return grant.grantedBy === null && !grant.manualOnly;
}

/**
 * The badge to celebrate now, or null. `seenCodes` is what this device has
 * already shown the owner; `now` is injected so the rule is testable.
 * Older earned badges are not celebrated, they are only remembered (see
 * `quietlySeen`).
 */
export function badgeToCelebrate(
  badges: readonly ProfileBadge[],
  seenCodes: readonly string[],
  now: number,
): ProfileBadge | null {
  const windowMs = MOMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const fresh = badges
    .filter((b) => b.earned && !seenCodes.includes(b.code) && now - Date.parse(b.grantedAt) <= windowMs)
    .sort((a, b) => Date.parse(b.grantedAt) - Date.parse(a.grantedAt));
  return fresh[0] ?? null;
}

/** Earned badges too old to celebrate and not yet remembered: remember them quietly. */
export function quietlySeen(
  badges: readonly ProfileBadge[],
  seenCodes: readonly string[],
  now: number,
): string[] {
  const windowMs = MOMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return badges
    .filter((b) => b.earned && !seenCodes.includes(b.code) && now - Date.parse(b.grantedAt) > windowMs)
    .map((b) => b.code);
}
