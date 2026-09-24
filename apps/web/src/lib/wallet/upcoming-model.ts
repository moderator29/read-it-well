/**
 * V-84. What the wallet's money is for, next. Pure, so the order and the cut
 * are tests rather than hopes.
 *
 * Each item is a dated obligation on an object the reader is party to: a rent
 * renewal, a caution owed back to them or by them, a payment set aside in a
 * held payment, a paid stay. Past items and zero amounts are dropped; the rest
 * are sorted soonest first, ties broken by kind so the order is stable.
 */
export type UpcomingKind = "renewal" | "caution_owed_to_you" | "caution_you_owe" | "share" | "held" | "stay";

export type UpcomingItem = {
  kind: UpcomingKind;
  /** Calendar day, YYYY-MM-DD (Lagos). */
  on: string;
  amountMinor: number;
  href: string;
  id: string;
};

const ORDER: Record<UpcomingKind, number> = {
  caution_you_owe: 0,
  share: 1,
  caution_owed_to_you: 2,
  renewal: 3,
  held: 4,
  stay: 5,
};

/** How many the strip shows before "See all". */
export const UPCOMING_SHOWN = 3;

export function mergeUpcoming(items: UpcomingItem[], today: string): UpcomingItem[] {
  return items
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.on) && item.on >= today)
    .filter((item) => Number.isSafeInteger(item.amountMinor) && item.amountMinor > 0)
    .sort((a, b) => (a.on === b.on ? ORDER[a.kind] - ORDER[b.kind] || a.id.localeCompare(b.id) : a.on < b.on ? -1 : 1));
}

/**
 * V-86. A flatmate's share is coming up only once they accepted it, while it
 * is unpaid, payable and not void, with a whole amount and a move-in day.
 * An invitation not yet answered, or declined, is not money they owe.
 */
export function shareComingUp(
  share: { answer?: unknown; paid_at?: unknown; void?: unknown; payable?: unknown } | null,
  amountMinor: number | null,
  due: string | null,
): boolean {
  if (!share || amountMinor === null || !due) return false;
  return share.answer === "accepted" && !share.paid_at && share.void !== true && share.payable === true;
}
