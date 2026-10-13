/**
 * THE PENDING RING, for a control that is waiting but is not a `Button`.
 *
 * `Button`'s `loading` prop draws the ring itself (once to three quarters,
 * then held; buttons.css "loading, bounded"). The icon squares that open a
 * filter sheet, a row that opens a report sheet and a text link are plain
 * buttons, so they draw the SAME markup here instead of a looping spinner
 * (rules: nothing loops forever). The trigger for the draw is
 * `.nf-pending-ring` in symbols.css; it waits 300ms so a quick arrival never
 * flickers a ring. Decorative: the control carries `aria-busy`.
 */
export function PendingRing({
  size = 20,
  className,
  "data-testid": testId,
}: {
  /** The glyph slot it replaces, in px. */
  size?: number;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <span
      className={["nf-btn__ring nf-pending-ring", className ?? ""].filter(Boolean).join(" ")}
      aria-hidden="true"
      data-testid={testId}
    >
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <circle className="nf-btn__arc" cx="12" cy="12" r="10" pathLength={1} />
      </svg>
    </span>
  );
}
