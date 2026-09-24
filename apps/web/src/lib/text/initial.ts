/**
 * UI-10: the one letter an avatar shows for a name.
 *
 * `name.charAt(0)` takes one UTF-16 unit, so a name that starts with an emoji
 * ("👩🏾‍💻 Ada") gave half a surrogate pair, drawn as �. This takes the first
 * user-perceived character (a grapheme) instead, and upper-cases it when it
 * has a case. Client-safe and pure.
 */
export function initial(name: string | null | undefined, fallback = "?"): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  let first: string | undefined;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    first = segmenter.segment(trimmed)[Symbol.iterator]().next().value?.segment;
  }
  first ??= Array.from(trimmed)[0];
  return first ? first.toLocaleUpperCase() : fallback;
}
