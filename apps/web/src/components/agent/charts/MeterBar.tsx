/**
 * A single horizontal meter: a track and a lit fill for one share of a whole,
 * as the renders draw inside a distribution table ("Supply by type", "Top
 * areas"). A SHAPE, not a control: it carries no text, the row around it
 * carries the words and the number.
 *
 * `rank` steps the fill down the one blue ramp (0 is full strength), so a
 * table of meters reads as magnitude and never as categories.
 */
const RAMP = [1, 0.84, 0.69, 0.55, 0.42] as const;

export function MeterBar({
  value,
  max,
  rank = 0,
  tone = "brand",
  label,
}: {
  value: number;
  max: number;
  rank?: number;
  tone?: "brand" | "success" | "error" | "pending";
  label?: string;
}) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const alpha = RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.trunc(rank)))]!;
  return (
    <span
      className={`nf-meter nf-meter--${tone}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span
        className="nf-meter__fill"
        style={{ width: `${(share * 100).toFixed(2)}%`, opacity: tone === "brand" ? alpha : 1 }}
      />
    </span>
  );
}
