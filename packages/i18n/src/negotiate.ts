/**
 * `Accept-Language`, parsed by hand.
 *
 * This file deliberately pulls in no dependency. The header grammar in RFC 9110
 * section 12.5.4 is a comma separated list of language ranges, each optionally
 * carrying parameters, of which the only one anybody sends is a `q` weight
 * between 0 and 1. That is small enough to read in one sitting, and a package
 * for it would be a third-party surface on the very first byte of every
 * anonymous request, which is not a trade worth making for thirty lines.
 *
 * It also has no idea which locales RentMe ships. It takes the supported list
 * as an argument so it stays a pure function of its inputs: no cookies, no
 * request, no module state. That is what makes it testable without a server,
 * and it is why the matching lives here rather than inside `lib/locale.ts`,
 * which cannot be imported outside a request without `next/headers` throwing.
 */

/** One language range from the header, with the weight the client gave it. */
export type LanguageRange = {
  /** The range, lowercased. Either `*` or a tag such as `yo` or `yo-ng`. */
  tag: string;
  /** The `q` weight, clamped into 0 to 1. Absent means 1, which is the RFC default. */
  quality: number;
};

/**
 * A language range as the grammar allows it: `*`, or one to eight letters,
 * then any number of subtags of one to eight letters or digits. Anything else
 * is not a language range and is dropped rather than guessed at, because a
 * header we cannot read is not a preference we should act on.
 */
const RANGE_PATTERN = /^(?:\*|[a-z]{1,8}(?:-[a-z0-9]{1,8})*)$/;

/**
 * Split the header into ranges, strongest first.
 *
 * Ranges with `q=0` are dropped outright. A zero weight is not "no opinion",
 * it is the client saying explicitly that it does not want that language, so
 * treating it as a candidate would invert the visitor's own instruction.
 *
 * A `q` that does not parse as a number is treated the same way. A client that
 * writes a broken weight has given us no usable ordering for that range, and
 * silently promoting it to the default weight of 1 could put a language the
 * visitor never asked for at the front of the queue.
 *
 * The sort is made stable by carrying the original index, because equal
 * weights must keep the order the client wrote them in: `en, yo` and `yo, en`
 * mean different things and both are legal.
 */
export function parseAcceptLanguage(header: string | null | undefined): LanguageRange[] {
  if (!header) return [];

  const ranges: { range: LanguageRange; index: number }[] = [];

  for (const piece of header.split(",")) {
    const [rawTag, ...params] = piece.split(";");
    const tag = (rawTag ?? "").trim().toLowerCase();
    if (tag.length === 0 || !RANGE_PATTERN.test(tag)) continue;

    let quality = 1;
    for (const param of params) {
      const separator = param.indexOf("=");
      if (separator === -1) continue;
      if (param.slice(0, separator).trim().toLowerCase() !== "q") continue;
      const parsed = Number.parseFloat(param.slice(separator + 1).trim());
      quality = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0;
    }

    if (quality <= 0) continue;
    ranges.push({ range: { tag, quality }, index: ranges.length });
  }

  return ranges
    .sort((a, b) => b.range.quality - a.range.quality || a.index - b.index)
    .map((entry) => entry.range);
}

/**
 * The first supported locale the header asks for, or null if it asks for none.
 *
 * Matching is on the primary subtag and case insensitive, so `yo-NG`, `yo-Latn-NG`
 * and `YO` all resolve to `yo`. Every locale RentMe ships is a bare primary
 * subtag, so there is no regional variant to prefer over a plain one and the
 * simple comparison is the whole of the rule.
 *
 * `*` is skipped rather than matched. It means "anything will do", and the
 * thing that decides what to do when nothing is preferred is the caller's
 * default, not the first entry of an arbitrarily ordered list.
 */
export function matchAcceptLanguage<T extends string>(
  header: string | null | undefined,
  supported: readonly T[],
): T | null {
  for (const { tag } of parseAcceptLanguage(header)) {
    if (tag === "*") continue;
    const primary = tag.split("-")[0] ?? tag;
    const hit = supported.find((candidate) => candidate.toLowerCase() === primary);
    if (hit !== undefined) return hit;
  }
  return null;
}
