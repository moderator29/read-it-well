import { parseNairaToKobo } from "../wallet/schema";

/**
 * WHAT A MONEY PROOF IS FOR. V-81.
 *
 * A step-up unlocks ONE action, named by its kind, its amount in kobo and its
 * recipient or account. The phone sends the intent when it asks for a proof;
 * the server hashes it (`money-step-up.ts`) into the challenge and the
 * step-up; the money action rebuilds the same intent from its own validated
 * input and the digests must match. Shared by the browser and the server so
 * the two read a form the same way.
 */

export const MONEY_KINDS = [
  "send",
  "withdraw",
  "bank_add",
  "payout_add",
  "payout_default",
  "bank_default",
  "payout_remove",
  "escrow_confirm",
  "escrow_fund",
  "pay_wallet",
  "caution_return",
  "remove_lock",
] as const;
export type MoneyKind = (typeof MONEY_KINDS)[number];

/**
 * `amountKobo` is the figure the action will move; `target` is who or where:
 * the recipient's email for a send, `saved:<bank account id>` for a saved
 * payout account, `<bank code>:<account number>` for a typed one.
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

const one = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/**
 * The phone's reading of a send or withdrawal form, for asking the proof. The
 * server does NOT use this: each action builds its intent from its own
 * validated input (`sendIntent`, `withdrawIntent`), and the two must agree.
 */
export function intentFromForm(kind: "send" | "withdraw", form: FormData): MoneyIntent {
  const amountKobo = parseNairaToKobo(one(form, "amount"));
  if (kind === "send") return sendIntent(amountKobo, one(form, "recipientEmail"));
  const saved = one(form, "bankAccountId").trim();
  return saved
    ? withdrawIntent(amountKobo, { bankAccountId: saved })
    : withdrawIntent(amountKobo, { bankCode: one(form, "bankCode"), accountNumber: one(form, "accountNumber").replace(/\D/g, "") });
}

export function sendIntent(amountKobo: number | null, recipientEmail: string): MoneyIntent {
  return { kind: "send", amountKobo, target: recipientEmail };
}

export function withdrawIntent(
  amountKobo: number | null,
  to: { bankAccountId: string } | { bankCode: string; accountNumber: string },
): MoneyIntent {
  return {
    kind: "withdraw",
    amountKobo,
    target: "bankAccountId" in to ? `saved:${to.bankAccountId}` : `${to.bankCode}:${to.accountNumber}`,
  };
}
