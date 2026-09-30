/** The pure half of `internal-accounts.ts` (C10), tested. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The QA list plus whatever else was read, de-duplicated, ids only. */
export function mergeInternalIds(base: readonly string[], extra: readonly (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const id of [...base, ...extra]) {
    if (typeof id === "string" && UUID_RE.test(id)) out.add(id.toLowerCase());
  }
  return [...out].sort();
}

/**
 * The PostgREST value for `.not(column, "in", value)`. Never empty: an empty
 * `()` is a syntax error, so a list with nobody on it names the nil uuid,
 * which matches no row.
 */
export function internalNotIn(ids: readonly string[]): string {
  const clean = mergeInternalIds([], ids);
  return `(${(clean.length > 0 ? clean : ["00000000-0000-0000-0000-000000000000"]).join(",")})`;
}
