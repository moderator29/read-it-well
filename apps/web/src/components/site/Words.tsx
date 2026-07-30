import type { ReactNode } from "react";

/**
 * Word by word headline.
 *
 * Splits a line into inline spans carrying a stagger index, which the
 * landing motion system animates: each word lifts, unblurs and settles a
 * beat after the one before it. On browsers with scroll-driven animation
 * the stagger is tied to the heading entering the viewport, so it replays
 * whenever the reader scrolls back. Reduced motion renders plain text.
 *
 * `accentFrom` marks where the gradient treatment begins, so a headline can
 * end in brand colour without a second component.
 */
export function Words({
  text,
  accentFrom,
  className,
  start = 0,
}: {
  text: string;
  /** Zero based index of the first word that takes the gradient. */
  accentFrom?: number;
  className?: string;
  /** Offset the stagger, so a second line continues the first. */
  start?: number;
}): ReactNode {
  const words = text.split(" ");
  return (
    <span className={`nf-words ${className ?? ""}`}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          style={{ "--i": start + i } as React.CSSProperties}
          className={accentFrom !== undefined && i >= accentFrom ? "nf-gradient-text" : undefined}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
