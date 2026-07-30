import type { Dictionary } from "@naijafinds/i18n";

/**
 * Placeholder filling for dictionary templates.
 *
 * The dictionaries carry whole sentences with `{name}` placeholders, for
 * example "{count} waiting", so a translator controls word order rather than a
 * component gluing English fragments together. This is the only thing that
 * substitutes them inside the console.
 *
 * The agent surfaces keep their own copy of these four lines: the two areas are
 * owned separately, and neither should reach into the other.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

/** The console's copy, sliced the way the queue pages consume it. */
export type AdminCopy = Dictionary["admin"];
export type AdminCommon = AdminCopy["common"];
