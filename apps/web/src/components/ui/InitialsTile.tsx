/**
 * THE INITIALS TILE (the clean unified sweep, 29 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 4, reference 31's "AC",
 * "NR"): the icon plate's box with a business's initials at 13/600 in the
 * primary ink, on the neutral plate fill. For businesses, firms and listings
 * without a photograph. PEOPLE STAY ROUND AVATARS; this is never a person.
 * Material: `.nf-initials` in `app/css/controls.css`.
 *
 *   name      the business name; the initials are its first two words'
 *             first letters ("Harbour and Lane" is "HL")
 *   initials  overrides the derivation
 *   size      "sm" 36 (a row), "md" 44, "lg" 56, as the plate
 *
 * Decorative (`aria-hidden`): the name beside it is the words. Server-safe.
 */
export type InitialsTileSize = "sm" | "md" | "lg";

export function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(and|of|the)$/i.test(w));
  const letters = words.slice(0, 2).map((w) => Array.from(w)[0] ?? "");
  return letters.join("").toLocaleUpperCase() || "?";
}

export function InitialsTile({
  name,
  initials,
  size = "sm",
  className,
}: {
  name: string;
  initials?: string;
  size?: InitialsTileSize;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={["nf-initials", `nf-initials--${size}`, className ?? ""].filter(Boolean).join(" ")}>
      {initials ?? initialsOf(name)}
    </span>
  );
}
