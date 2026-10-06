/**
 * THE LANDING'S ONE EXAMPLE FLAT, IN FIGURES.
 *
 * The hero's floating card, the move-in band and the platform band's Discover
 * moment all draw the same flat, so they must agree to the kobo: one source.
 * These are illustrations of what a listing card prints, never inventory and
 * never a price anybody is asking, and every surface that draws them carries
 * the Example mark (`landingRooms.stack.ui.example`).
 *
 * THE FIGURES ADD UP: a ₦2.5m yearly rent plus the four fees a listing would
 * state (caution deposit, agency, legal, agreement) is ₦3.3m to move in, so
 * the example teaches the arithmetic honestly rather than decorating it. In
 * minor units (kobo), the way every money figure on the platform travels.
 */
export const EXAMPLE_FEES = {
  caution: 250_000_00,
  agency: 250_000_00,
  legal: 250_000_00,
  agreement: 50_000_00,
} as const;

export const EXAMPLE_RENT = 2_500_000_00;

export const EXAMPLE_MOVE_IN = {
  rent: EXAMPLE_RENT,
  fees: EXAMPLE_FEES,
  total: EXAMPLE_RENT + EXAMPLE_FEES.caution + EXAMPLE_FEES.agency + EXAMPLE_FEES.legal + EXAMPLE_FEES.agreement,
} as const;

/** The parts of the total, in the order a listing prints them. */
export type MoveInPart = "rent" | keyof typeof EXAMPLE_FEES;
export const MOVE_IN_PARTS: readonly MoveInPart[] = ["rent", "caution", "agency", "legal", "agreement"];

export function partMinor(part: MoveInPart): number {
  return part === "rent" ? EXAMPLE_RENT : EXAMPLE_FEES[part];
}
