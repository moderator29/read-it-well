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
  "escrow_confirm",
  "escrow_fund",
  "remove_lock",
] as const;
export type MoneyKind = (typeof MONEY_KINDS)[number];

export type MoneyIntent = { kind: MoneyKind; amount?: string | null; target?: string | null };

export function isMoneyIntent(value: unknown): value is MoneyIntent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!(MONEY_KINDS as readonly string[]).includes(String(v.kind))) return false;
  for (const key of ["amount", "target"] as const) {
    const item = v[key];
    if (item !== undefined && item !== null && (typeof item !== "string" || item.length > 200)) return false;
  }
  return true;
}

/** The canonical line the digest is taken over. */
export function intentLine(intent: MoneyIntent): string {
  const kobo = intent.amount ? parseNairaToKobo(intent.amount) : null;
  const target = (intent.target ?? "").trim().toLowerCase();
  return `${intent.kind}|${typeof kobo === "number" ? kobo : ""}|${target}`;
}

const one = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** A send or a withdrawal, read off its form the way the server reads it. */
export function intentFromForm(kind: "send" | "withdraw", form: FormData): MoneyIntent {
  if (kind === "send") return { kind, amount: one(form, "amount"), target: one(form, "recipientEmail") };
  const method = one(form, "methodId");
  return {
    kind,
    amount: one(form, "amount"),
    target: method ? `method:${method}` : `${one(form, "bankCode")}:${one(form, "accountNumber").replace(/\D/g, "")}`,
  };
}
