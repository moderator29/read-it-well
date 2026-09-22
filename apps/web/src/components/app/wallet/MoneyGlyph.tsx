import { UI_ICON_STROKE_PX, snapUiIconSize } from "@/design-system/icons/UiIcon";

/**
 * The money surfaces' own line glyphs, for the verbs the shared stroked set
 * does not draw.
 *
 * The wallet and send renders (6AF37222, 77A54EA3) use a paper plane, a
 * plus in a rounded square, a bank, a card, a scan frame, a shield with a
 * tick and a padlock. `UiIcon` has none of these, and it belongs to the
 * design system rather than to this surface, so they are drawn here on the
 * same 24 grid, at the same 1.5px stroke, with the same round caps and
 * joins, so they sit beside `UiIcon` glyphs without a seam. If the design
 * system later adopts them, this file is the one to delete.
 */

export type MoneyGlyphName =
  | "send-arrow"
  | "receive-arrow"
  | "plus-square"
  | "bank"
  | "plane"
  | "card"
  | "scan"
  | "shield-check"
  | "lock"
  | "statement"
  | "note";

const PATHS: Record<MoneyGlyphName, React.ReactNode> = {
  /* Up and to the right: money leaving. */
  "send-arrow": (
    <>
      <path d="M6.5 17.5 17.5 6.5" />
      <path d="M8.5 6.5h9v9" />
    </>
  ),
  /* Down onto a line: money arriving and staying. */
  "receive-arrow": (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  "plus-square": (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  /* A pediment on four columns and a plinth. */
  bank: (
    <>
      <path d="M3.5 9.5 12 4.5l8.5 5" />
      <path d="M5 9.5h14" />
      <path d="M6.5 12v5M10 12v5M14 12v5M17.5 12v5" />
      <path d="M4 19.5h16" />
    </>
  ),
  plane: (
    <>
      <path d="M20.5 3.5 10 14" />
      <path d="M20.5 3.5 14 20.5l-4-6.5-6.5-4z" />
    </>
  ),
  card: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M3.5 10h17M7 14.5h4" />
    </>
  ),
  /* Four corners of a viewfinder and the line it reads along. */
  scan: (
    <>
      <path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5" />
      <path d="M7.5 12h9" />
    </>
  ),
  "shield-check": (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9V6z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2" />
    </>
  ),
  statement: (
    <>
      <path d="M7 3.5h7.5L18.5 7.5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 8h3" />
    </>
  ),
  /* A speech bubble with two lines: the note that travels with a send. */
  note: (
    <>
      <path d="M5.5 4.5h13a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H11l-4.5 3.5V17h-1a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
};

export function MoneyGlyph({
  name,
  size = 20,
  className,
}: {
  name: MoneyGlyphName;
  size?: number;
  className?: string;
}) {
  const edge = snapUiIconSize(size);
  return (
    <svg
      width={edge}
      height={edge}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={(UI_ICON_STROKE_PX * 24) / edge}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
