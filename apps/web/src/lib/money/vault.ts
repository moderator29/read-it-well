import type { HistoryEntry } from "./history-model";

/**
 * THE RECEIPT VAULT'S SEARCH AND FILTER, pure.
 *
 * A receipt exists for money that moved: a payment our partner confirmed, or a
 * refund that completed. A pending, failed or reversed row is not a receipt,
 * whatever the history shows. The search is over the title (the space) and the
 * reference, case-insensitive, and never over anything the reader cannot see.
 */
export type VaultKind = "all" | "payment" | "refund";

export function parseVaultKind(raw: string | string[] | undefined): VaultKind {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "payment" || v === "refund" ? v : "all";
}

export function parseVaultQuery(raw: string | string[] | undefined): string {
  const v = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return v.trim().slice(0, 80);
}

/** Whether a history row stands for a receipt. */
export function isReceipt(entry: HistoryEntry): boolean {
  const s = entry.status.trim().toLowerCase();
  if (entry.kind === "payment") return s === "successful";
  if (entry.kind === "refund") return s === "processed";
  return false;
}

export function vaultEntries(entries: readonly HistoryEntry[], kind: VaultKind, query: string): HistoryEntry[] {
  const q = query.toLowerCase();
  return entries.filter(
    (e) =>
      isReceipt(e) &&
      (kind === "all" || e.kind === kind) &&
      (q === "" || (e.title ?? "").toLowerCase().includes(q) || (e.reference ?? "").toLowerCase().includes(q)),
  );
}

/** Refunds in any state, for the member refunds screen. */
export function refundEntries(entries: readonly HistoryEntry[]): HistoryEntry[] {
  return entries.filter((e) => e.kind === "refund");
}

/**
 * A payout row's figures, from the record only. The fee is the parts the
 * record names (commission, and a legacy Guarantee contribution), never gross
 * minus share guessed at; a row without them says so. Processing is what the
 * three recorded figures leave over (the processor's own fee, which the lister
 * bears on the direct rail), shown only when all three exist and it is above
 * zero, so the rows always add up to what was paid.
 */
export function payoutFigures(entry: HistoryEntry): {
  paidMinor: number | null;
  feeMinor: number | null;
  processingMinor: number | null;
  receivedMinor: number;
} {
  const parts = [entry.commissionMinor, entry.guaranteeMinor];
  const feeMinor = parts.every((p) => p === null) ? null : parts.reduce<number>((sum, p) => sum + Math.abs(p ?? 0), 0);
  const paidMinor = entry.grossMinor === null ? null : Math.abs(entry.grossMinor);
  const rest = paidMinor !== null && feeMinor !== null ? paidMinor - feeMinor - entry.amountMinor : null;
  return { paidMinor, feeMinor, processingMinor: rest !== null && rest > 0 ? rest : null, receivedMinor: entry.amountMinor };
}
