/**
 * Joins class names, dropping anything falsy. The two-line helper the component
 * library spec (docs/design/COMPONENT_LIBRARY.md, section 0) names in place of
 * `clsx` and `tailwind-merge`, neither of which Vallo adds. It does not merge
 * conflicting utilities: a component that needs a class to win writes its rule
 * in a stylesheet, where the cascade is legible.
 */
export type ClassPart = string | false | null | undefined;

export function cn(...parts: ClassPart[]): string {
  return parts.filter(Boolean).join(" ");
}
