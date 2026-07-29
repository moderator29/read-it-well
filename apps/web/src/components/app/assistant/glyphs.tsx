/**
 * Assistant-local stroked glyphs.
 *
 * The tier one `UiIcon` set does not yet carry history, plus, bin or close
 * marks, and the design-system package is owned elsewhere, so the assistant
 * surface keeps its own tiny stroked set on the same 24 grid with the same
 * `currentColor` behaviour. If these marks ever land in `UiIcon` this file
 * can be deleted and the call sites swapped over without visual change.
 */

type GlyphProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function Stroke({
  size = 16,
  strokeWidth = 1.8,
  className,
  children,
}: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Clock face with a rewind arrow: conversation history. */
export function HistoryGlyph(props: GlyphProps) {
  return (
    <Stroke {...props}>
      <path d="M3.2 12a8.8 8.8 0 1 0 2.6-6.2" />
      <path d="M3.2 3.4v4.4h4.4" />
      <path d="M12 7.6v4.6l3 2.4" />
    </Stroke>
  );
}

/** Plus mark: start a new conversation. */
export function PlusGlyph(props: GlyphProps) {
  return (
    <Stroke {...props}>
      <path d="M12 5v14M5 12h14" />
    </Stroke>
  );
}

/** Bin: remove a single conversation. */
export function BinGlyph(props: GlyphProps) {
  return (
    <Stroke {...props}>
      <path d="M4.2 7h15.6" />
      <path d="M9.2 7V5.4A1.4 1.4 0 0 1 10.6 4h2.8a1.4 1.4 0 0 1 1.4 1.4V7" />
      <path d="M6.6 7l.75 11.7a1.9 1.9 0 0 0 1.9 1.8h5.5a1.9 1.9 0 0 0 1.9-1.8L17.4 7" />
      <path d="M10 10.8v5.7M14 10.8v5.7" />
    </Stroke>
  );
}

/** Cross: dismiss the mobile history drawer. */
export function CloseGlyph(props: GlyphProps) {
  return (
    <Stroke {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Stroke>
  );
}
