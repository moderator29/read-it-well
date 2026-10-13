/**
 * The pure half of the money-record retention desk: what
 * `public.staff_money_retention_preview()` returns, parsed, and the one
 * phrase that unlocks destruction. Pending migration ac01.
 */
export const RETENTION_PHRASE = "DESTROY";

export type RetentionRow = {
  requestId: string;
  retainUntil: string;
  bankAccounts: number;
  payoutAccounts: number;
  payoutHeld: boolean;
  walletEntries: number;
};

export type RetentionPreview = {
  due: number;
  kept: number;
  nextDue: string | null;
  bankAccounts: number;
  payoutAccounts: number;
  walletEntries: number;
  rows: RetentionRow[];
};

function whole(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export function parseRetentionPreview(raw: unknown): RetentionPreview | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const due = whole(r["due"]);
  const kept = whole(r["kept"]);
  if (due === null || kept === null || !Array.isArray(r["rows"])) return null;
  const rows: RetentionRow[] = [];
  for (const item of r["rows"] as unknown[]) {
    if (!item || typeof item !== "object") return null;
    const x = item as Record<string, unknown>;
    const bank = whole(x["bank_accounts"]);
    const payout = whole(x["payout_accounts"]);
    const wallet = whole(x["wallet_entries"]);
    if (typeof x["request_id"] !== "string" || typeof x["retain_until"] !== "string") return null;
    if (bank === null || payout === null || wallet === null) return null;
    rows.push({
      requestId: x["request_id"],
      retainUntil: x["retain_until"],
      bankAccounts: bank,
      payoutAccounts: payout,
      payoutHeld: x["payout_held"] === true,
      walletEntries: wallet,
    });
  }
  return {
    due,
    kept,
    nextDue: typeof r["next_due"] === "string" ? r["next_due"] : null,
    bankAccounts: whole(r["bank_accounts"]) ?? 0,
    payoutAccounts: whole(r["payout_accounts"]) ?? 0,
    walletEntries: whole(r["wallet_entries"]) ?? 0,
    rows,
  };
}

/** The phrase is matched exactly: capitals, no spaces around it. */
export function confirmationMatches(typed: string): boolean {
  return typed === RETENTION_PHRASE;
}

/** What the database answers to a destroy call. */
export type DestroyStatus = "ok" | "nothing_due" | "changed" | "confirm" | "forbidden";
export function parseDestroyAnswer(raw: unknown): { status: DestroyStatus; redacted: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const status = r["status"];
  if (status !== "ok" && status !== "nothing_due" && status !== "changed" && status !== "confirm" && status !== "forbidden") {
    return null;
  }
  return { status, redacted: whole(r["redacted"]) ?? 0 };
}
