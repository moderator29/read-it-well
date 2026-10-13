/**
 * EVERY COST BEFORE A GUEST BOOKS: the price plus every charge at the door.
 *
 * Vallo adds no fee to a guest's side (D51, `lib/money/guest-price.ts`), so a
 * stay costs its nights and whatever the host declared may be asked for at
 * the door (V-57). This works the declared charges out for the dates and the
 * party the guest picked, so the stay page can say one honest all-in figure
 * before they book. A charge per unit used (power, say) cannot be known in
 * advance and is listed, never added. Integer kobo, pure, client-safe.
 */

import { declaredCharges, type ArrivalCharges, type ArrivalKey, type ArrivalUnit } from "./arrival-charges";

export type DoorCharge = {
  key: string;
  label: string;
  minor: number;
  per: "stay" | "night" | "guest" | "unit";
  perLabel: string;
};

export type DoorLine = DoorCharge & {
  /** What it comes to for this stay, or null when it depends on use. */
  forStayMinor: number | null;
  /** A caution deposit is held and returned under the listed rules. */
  refundable: boolean;
};

export function doorLines(charges: readonly DoorCharge[], nights: number, guests: number): DoorLine[] {
  return charges.map((charge) => {
    const times =
      charge.per === "stay" ? 1 : charge.per === "night" ? nights : charge.per === "guest" ? Math.max(1, guests) : null;
    return {
      ...charge,
      forStayMinor: times === null ? null : charge.minor * times,
      refundable: charge.key === "caution",
    };
  });
}

/** The price and every countable door charge, in kobo. */
export function allInMinor(priceMinor: number, lines: readonly DoorLine[]): number {
  return lines.reduce((total, line) => total + (line.forStayMinor ?? 0), priceMinor);
}

/** The words a declared charge is drawn with: each key's name and each unit. */
export type DoorChargeWords = {
  keys: Record<ArrivalKey, string>;
  units: Record<ArrivalUnit, string>;
};

/**
 * A complete declaration as the charges a guest reads, named in their
 * language; "none" answers are left out. The one mapping every surface uses,
 * so the stay page, the listing page and checkout name a charge the same way.
 */
export function toDoorCharges(declaration: ArrivalCharges | null | undefined, words: DoorChargeWords): DoorCharge[] {
  if (!declaration) return [];
  return declaredCharges(declaration).map((charge) => ({
    key: charge.key,
    label: words.keys[charge.key],
    minor: charge.minor,
    per: charge.per,
    perLabel: words.units[charge.per],
  }));
}
