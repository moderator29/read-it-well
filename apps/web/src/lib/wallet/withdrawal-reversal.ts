import "server-only";

import { postEntry, type AdminClient } from "./ledger";

/**
 * MON-03: a withdrawal the bank paid out and then sent back.
 *
 * `transfer.success` marks the hold COMPLETED. When Paystack later sends
 * `transfer.reversed` for the same reference, the money has come back to the
 * platform, but the conditional settle (PENDING only) moves nothing and the
 * member's balance stays short for ever. The completed debit is history and is
 * not rewritten; the return is a new `refund` credit keyed on
 * `<reference>-reversal`, so a replayed delivery posts nothing twice.
 *
 * A hold that was never paid (FAILED or already REVERSED) is never credited
 * here: its debit already stopped counting against the balance.
 */
export function reversalReference(reference: string): string {
  return `${reference}-reversal`;
}

export type ReversalCredit =
  | { state: "credited" | "duplicate"; walletId: string; amountMinor: number }
  | { state: "not_completed"; status: string | null };

export async function creditReversedWithdrawal(
  admin: AdminClient,
  reference: string,
): Promise<ReversalCredit> {
  const { data, error } = await admin
    .from("wallet_entries")
    .select("wallet_id, amount_minor, status")
    .eq("reference", reference)
    .eq("kind", "withdrawal")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== "COMPLETED") {
    return { state: "not_completed", status: data?.status ?? null };
  }
  const posted = await postEntry(admin, {
    walletId: data.wallet_id,
    kind: "refund",
    direction: "credit",
    amountMinor: data.amount_minor,
    reference: reversalReference(reference),
    status: "COMPLETED",
    metadata: {
      note: "Returned by the bank after the withdrawal had been paid out",
      reversal_of: reference,
    },
  });
  return {
    state: posted === "posted" ? "credited" : "duplicate",
    walletId: data.wallet_id,
    amountMinor: data.amount_minor,
  };
}
