/**
 * How a card and a bank account are named on the payment methods screen.
 *
 * Masked, always: this product never holds a card number, and an account
 * number is shown by its tail only, which is how a person recognises their
 * own without a stranger reading it over their shoulder. Pure, and tested.
 */

const MASK = "••••";

/** "•••• 6789" from any string holding at least four digits; the mask alone otherwise. */
export function maskNumber(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return MASK;
  return `${MASK} ${digits.slice(-4)}`;
}

/** "09/28" from a month and a two or four digit year; empty when either is missing. */
export function cardExpiry(month: number | null, year: number | null): string {
  if (month === null || year === null || month < 1 || month > 12) return "";
  const yy = String(year).slice(-2).padStart(2, "0");
  return `${String(month).padStart(2, "0")}/${yy}`;
}

/** Whether a card's expiry is already behind the given month. */
export function cardExpired(month: number | null, year: number | null, now: Date = new Date()): boolean {
  if (month === null || year === null) return false;
  const fullYear = year < 100 ? 2000 + year : year;
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  return fullYear < nowYear || (fullYear === nowYear && month < nowMonth);
}

const BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  verve: "Verve",
  "american express": "American Express",
  amex: "American Express",
};

/** The brand as a person says it. Paystack's own word, tidied, when unknown. */
export function cardBrandLabel(cardType: string | null): string {
  const raw = (cardType ?? "").trim().toLowerCase();
  if (raw.length === 0) return "Card";
  const key = raw.replace(/\s+(debit|credit|prepaid)$/i, "").trim();
  if (BRANDS[key]) return BRANDS[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * The card a screen should offer first: the default when it can be charged,
 * otherwise the first one that can. Null when none can, which is the caller's
 * signal to render no saved-card option at all rather than an empty group.
 *
 * Pure, and here rather than beside the picker, because the picker is a client
 * component and this project's vitest resolves React to the server build: a
 * rule about which card is charged has to be testable without a renderer.
 */
export function preselectedCardId(
  cards: { id: string; reusable: boolean; isDefault: boolean; expMonth: number | null; expYear: number | null }[],
): string | null {
  const usable = cards.filter(
    (card) => card.reusable && !cardExpired(card.expMonth, card.expYear),
  );
  const preferred = usable.find((card) => card.isDefault) ?? usable[0];
  return preferred?.id ?? null;
}
