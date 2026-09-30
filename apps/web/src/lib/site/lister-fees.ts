import "server-only";

import { adminOrNull } from "@/lib/email/recipients";

/**
 * A9. WHAT LISTING ON VALLO COSTS, READ FROM THE RATES THE SPLIT USES.
 *
 * The supply pages print a fee table, and a table typed into a page drifts
 * the day a rate changes. So the figures come from the same rows the payment
 * split reads: `public.fee_rates` (the `commission` and `listing_fee` kinds,
 * newest effective row that has started) and `public.money_policy`
 * (`guarantee_bps`, the Guarantee contribution). Neither table is readable by
 * a stranger, so this reads them once per render with the service role and
 * returns numbers only: nothing about any person.
 *
 * Unreadable (no service key, an outage) is null, and the page then prints
 * the sentences from `lib/money/copy.ts` without a figure. It never guesses.
 */
export type ListerFees = {
  /** Vallo's commission on a payment, in basis points. */
  commissionBps: number;
  /** A flat commission on top, in kobo (zero today). */
  commissionFlatMinor: number;
  /** What it costs to publish a listing, in basis points and kobo. */
  listingFeeBps: number;
  listingFeeFlatMinor: number;
  /** The Guarantee contribution taken from the lister's share, in basis points. */
  guaranteeBps: number | null;
};

type RateRow = { kind: string; basis_points: number | null; flat_minor: number | null; effective_from: string };

/** The newest row of a kind that has already taken effect. */
export function currentRate(rows: readonly RateRow[], kind: string, now: number): RateRow | null {
  return (
    rows
      .filter((row) => row.kind === kind && Date.parse(row.effective_from) <= now)
      .sort((a, b) => Date.parse(b.effective_from) - Date.parse(a.effective_from))[0] ?? null
  );
}

export async function readListerFees(now: number = Date.now()): Promise<ListerFees | null> {
  const admin = adminOrNull();
  if (!admin) return null;
  try {
    const [rates, policy] = await Promise.all([
      admin.from("fee_rates").select("kind, basis_points, flat_minor, effective_from"),
      admin.from("money_policy").select("guarantee_bps").limit(1).maybeSingle(),
    ]);
    if (rates.error || !rates.data) return null;
    const rows = rates.data as unknown as RateRow[];
    const commission = currentRate(rows, "commission", now);
    const listing = currentRate(rows, "listing_fee", now);
    if (!commission || !listing) return null;
    const guarantee = (policy.data as { guarantee_bps?: number | null } | null)?.guarantee_bps;
    return {
      commissionBps: Number(commission.basis_points ?? 0),
      commissionFlatMinor: Number(commission.flat_minor ?? 0),
      listingFeeBps: Number(listing.basis_points ?? 0),
      listingFeeFlatMinor: Number(listing.flat_minor ?? 0),
      guaranteeBps: typeof guarantee === "number" ? guarantee : null,
    };
  } catch {
    return null;
  }
}
