import { Children, type ReactNode } from "react";

/**
 * THE META STRIP (the clean unified sweep, 29 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 6, reference 30's
 * "12 nodes | 4 conditions | Edited 2 min ago"). 13px muted items separated
 * by 1px vertical hairlines inside one card-border box, 36px tall on a 12px
 * corner. Ours: "7 properties | Recommended", a stay's check-in, check-out
 * and guests. Material: `.nf-meta-strip` in `app/css/controls.css`.
 *
 *   leading  an optional 16px glyph before the first item
 *   bare     no box: the items and hairlines only (inside a card)
 *
 * Every item is a fact the page can answer for. Server-safe.
 */
export function MetaStrip({
  children,
  leading,
  bare = false,
  className,
}: {
  children: ReactNode;
  leading?: ReactNode;
  bare?: boolean;
  className?: string;
}) {
  /* `toArray` already drops null, undefined and booleans. */
  const items = Children.toArray(children).filter((c) => c !== "");
  if (items.length === 0) return null;
  return (
    <div className={["nf-meta-strip", bare ? "nf-meta-strip--bare" : "", className ?? ""].filter(Boolean).join(" ")}>
      {leading != null ? <span className="nf-meta-strip__lead">{leading}</span> : null}
      {items.map((item, i) => (
        <span key={i} className="nf-meta-strip__item">
          {item}
        </span>
      ))}
    </div>
  );
}
