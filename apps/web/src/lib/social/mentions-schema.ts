/**
 * Finding the people named inside a body of text.
 *
 * Client safe on purpose, and it imports nothing: a card renders in the browser
 * and a database trigger will one day have to agree with it about what counts as
 * a mention, so the rule lives in one readable place rather than in a component
 * and, later, in a different regular expression inside a migration.
 *
 * The charset is the handle charset the database already enforces:
 * `^[a-z][a-z0-9_]{2,19}$`, checked by `private.validate_social_handle` on every
 * insert and update of `social_profiles`. Nothing here re-checks whether the
 * handle exists, because `/u/[handle]` already answers for a handle nobody
 * holds with a designed page that offers to claim it.
 */

/** The handle body, with no anchors and, deliberately, no capturing groups. */
export const HANDLE_RE_SOURCE = "[a-zA-Z][a-zA-Z0-9_]{2,19}";

export type Mention = {
  /** Lowercased, because handles are stored lowercase. */
  handle: string;
  /** Where the `@` sits in the original text. */
  start: number;
  /** One past the last character of the handle. */
  end: number;
};

/**
 * Every handle named in a piece of text, in the order they appear.
 *
 * **A mention has to start a word.** Without that rule `pay me at
 * ade@bola_stores.com` names a person called `@bola_stores`, which is both
 * wrong and, on a platform whose scanner exists to catch off-platform payment
 * asks, exactly the text most likely to contain an `@`. The check is a manual
 * look at the preceding character rather than a lookbehind in the pattern,
 * because lookbehind is still missing from browsers this product is built for.
 *
 * Duplicates are kept: a body naming the same person twice has two mentions in
 * it, and it is the caller's job to decide whether that means two links (yes) or
 * two notifications (no).
 */
export function findMentions(text: string): Mention[] {
  if (!text) return [];
  const pattern = new RegExp(`@${HANDLE_RE_SOURCE}`, "g");
  const out: Mention[] = [];
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const before = start > 0 ? text[start - 1] : "";
    /* A word character or a second `@` before it means this is part of
       something else: an address, a path, or somebody's typo. */
    if (before && /[\w@]/.test(before)) continue;
    out.push({
      handle: match[0].slice(1).toLowerCase(),
      start,
      end: start + match[0].length,
    });
  }
  return out;
}
