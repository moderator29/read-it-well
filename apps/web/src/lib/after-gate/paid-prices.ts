/**
 * V-39. One row of `public.area_paid_summary`, read defensively.
 *
 * The database returns a row only for a cell with at least five standing
 * tenancies from at least three listers, with the count as a band ("5-9" or
 * "10+"), figures rounded to fifty thousand naira and the fee share to 500
 * basis points;
 * this reader adds nothing to that and trusts nothing it did not check. A row
 * with a missing or fractional figure is dropped rather than drawn.
 */
export type PaidRow = {
  propertyType: string;
  bedrooms: number;
  /** "5-9" or "10+": the database never gives the exact count. */
  tenancyBand: "5-9" | "10+";
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

/** The bands the database speaks in. Anything else is refused. */
const BANDS = new Set(["5-9", "10+"]);

export function readPaidRow(raw: unknown): PaidRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const band = typeof row.tenancy_band === "string" && BANDS.has(row.tenancy_band) ? (row.tenancy_band as PaidRow["tenancyBand"]) : null;
  const p25 = int(row.p25_minor);
  const median = int(row.median_minor);
  const p75 = int(row.p75_minor);
  const beds = int(row.bedrooms);
  if (typeof row.property_type !== "string" || beds === null) return null;
  if (band === null || p25 === null || median === null || p75 === null) return null;
  if (!(p25 <= median && median <= p75)) return null;
  return {
    propertyType: row.property_type,
    bedrooms: beds,
    tenancyBand: band,
    p25Minor: p25,
    medianMinor: median,
    p75Minor: p75,
    feeShareBps: int(row.median_fee_share_bps),
    oldestAt: typeof row.oldest_at === "string" ? row.oldest_at : null,
    newestAt: typeof row.newest_at === "string" ? row.newest_at : null,
  };
}
