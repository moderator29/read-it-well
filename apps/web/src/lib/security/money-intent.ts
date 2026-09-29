/**
 * WHAT A MONEY PROOF IS FOR. V-81.
 *
 * Vallo holds no money (ADR 0002): there is no wallet to send from and no
 * withdrawal. What still decides where a person's money lands is their payout
 * account (the Paystack subaccount a lister's share settles to) and their
 * bank account (where a Vallo Guarantee payout goes), which of those is the
 * default, and removing one. A card refund always goes back to the card that
 * paid, so there is no refund destination to change. Those actions, and
 * removing the lock itself, are what a step-up unlocks.
 *
 * A step-up unlocks ONE action, named by its kind and its account. The phone
 * sends the intent when it asks for a proof; the server hashes it
 * (`money-step-up.ts`) into the challenge and the step-up; the action
 * rebuilds the same intent from its own validated input and the digests must
 * match. Shared by the browser and the server so the two read a form the
 * same way.
 */

export const MONEY_KINDS = [
  "bank_add",
  "payout_add",
  "payout_default",
  "bank_default",
  "payout_remove",
  "remove_lock",
] as const;
export type MoneyKind = (typeof MONEY_KINDS)[number];

/**
 * `target` is the account the action is about: `<bank code>:<account number>`
 * for a typed account, the account id for a default, `bank:<id>` or
 * `payout:<id>` for a removal. `amountKobo` is kept for the digest's shape
 * and is empty for every kind that remains.
 */
export type MoneyIntent = { kind: MoneyKind; amountKobo?: number | null; target?: string | null };

export function isMoneyIntent(value: unknown): value is MoneyIntent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!(MONEY_KINDS as readonly string[]).includes(String(v.kind))) return false;
  const target = v.target;
  if (target !== undefined && target !== null && (typeof target !== "string" || target.length > 200)) return false;
  const kobo = v.amountKobo;
  if (kobo !== undefined && kobo !== null && (typeof kobo !== "number" || !Number.isSafeInteger(kobo) || kobo < 0)) return false;
  return true;
}

/** The canonical line the digest is taken over. */
export function intentLine(intent: MoneyIntent): string {
  const kobo = typeof intent.amountKobo === "number" ? intent.amountKobo : "";
  const target = (intent.target ?? "").trim().toLowerCase();
  return `${intent.kind}|${kobo}|${target}`;
}
