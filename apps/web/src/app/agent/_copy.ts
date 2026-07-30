/**
 * Placeholder filling for dictionary templates.
 *
 * The dictionaries carry whole sentences with `{name}` placeholders, for
 * example "Step {current} of {total}", so a translator controls word order
 * instead of a component gluing fragments together in English order. This is
 * the only thing that substitutes them on the agent surfaces.
 *
 * It lives here rather than in `lib/` because the admin console keeps its own
 * copy of the same four lines: the two areas are owned separately and must not
 * import across each other.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
