/**
 * The three ledger books, in the order the schema names them, each with one
 * line per currency. `customer_funds` records where the payment partner says
 * customer money sits: it is never Vallo's, and the desk says so.
 */
export const LEDGER_POTS = ["customer_funds", "vallo_revenue", "marketing_float"] as const;
export type LedgerPot = (typeof LEDGER_POTS)[number];

export type LedgerLine = { currency: string; balanceMinor: number; entries: number };
export type LedgerBook = { pot: LedgerPot; lines: LedgerLine[]; entries: number };

type Raw = { pot: string | null; currency: string | null; balance_minor: number | string | null; entries: number | string | null };

function whole(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : null;
}

/** A book with no confirmed entry is simply absent from the view; it is drawn as empty, not as zero. */
export function shapeLedgerBooks(rows: readonly Raw[]): LedgerBook[] {
  const books: LedgerBook[] = [];
  for (const pot of LEDGER_POTS) {
    const lines: LedgerLine[] = [];
    for (const row of rows) {
      if (row.pot !== pot || !row.currency) continue;
      const balanceMinor = whole(row.balance_minor);
      const entries = whole(row.entries);
      if (balanceMinor === null || entries === null) continue;
      lines.push({ currency: row.currency, balanceMinor, entries });
    }
    if (lines.length === 0) continue;
    lines.sort((a, b) => a.currency.localeCompare(b.currency));
    books.push({ pot, lines, entries: lines.reduce((sum, l) => sum + l.entries, 0) });
  }
  return books;
}
