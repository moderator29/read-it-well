/**
 * Basis points as the percentage a person reads, without floating point.
 *
 * 5000 is "50", 1250 is "12.5", 3333 is "33.33". Integer arithmetic only, so
 * no share is ever printed as 14.999999999999998. Negative input reads as
 * zero: a share of money is never below nothing.
 */
export function bpsAsPercentText(bps: number): string {
  const safe = Number.isFinite(bps) ? Math.max(0, Math.round(bps)) : 0;
  const whole = Math.trunc(safe / 100);
  const rest = safe % 100;
  if (rest === 0) return String(whole);
  const decimals = String(rest).padStart(2, "0").replace(/0$/, "");
  return `${whole}.${decimals}`;
}
