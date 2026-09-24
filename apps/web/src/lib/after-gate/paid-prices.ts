/**
 * V-39. One row of `public.area_paid_summary`, read defensively.
 *
 * The database returns a row only for a cell with at least five settled
 * tenancies from at least three listers, rounded to fifty thousand naira;
 * this reader adds nothing to that and trusts nothing it did not check. A row
 * with a missing or fractional figure is dropped rather than drawn.
 */
export type PaidRow = {
  propertyType: string;
  bedrooms: number;
  tenancyCount: number;
  p25Minor: number;
  medianMinor: number;
  p75Minor: number;
  /** Median fees on top of rent, in basis points; null when no rent was stated. */
  feeShareBps: number | null;
  oldestAt: string | null;
  newestAt: string | null;
};

function int(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

/** The k-anonymity floor the database enforces, restated so a regression is visible here too. */
export const PAID_MIN_TENANCIES = 5;

export function readPaidRow(raw: unknown): PaidRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const count = int(row.tenancy_count);
  const p25 = int(row.p25_minor);
  const median = int(row.median_minor);
  const p75 = int(row.p75_minor);
  const beds = int(row.bedrooms);
  if (typeof row.property_type !== "string" || beds === null) return null;
  if (count === null || count < PAID_MIN_TENANCIES || p25 === null || median === null || p75 === null) return null;
  if (!(p25 <= median && median <= p75)) return null;
  return {
    propertyType: row.property_type,
    bedrooms: beds,
    tenancyCount: count,
    p25Minor: p25,
    medianMinor: median,
    p75Minor: p75,
    feeShareBps: int(row.median_fee_share_bps),
    oldestAt: typeof row.oldest_at === "string" ? row.oldest_at : null,
    newestAt: typeof row.newest_at === "string" ? row.newest_at : null,
  };
}
