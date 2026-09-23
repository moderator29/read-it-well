/**
 * THE 24-HOUR HOLD "THIS WAS NOT ME" PLACES ON MONEY LEAVING AN ACCOUNT. V-19.
 *
 * The rule lives in the database: a BEFORE INSERT trigger on `wallet_entries`
 * (`20260924160000`) refuses a withdrawal debit or a `transfer_out` while the
 * owner has a live row in `public.account_holds`, whichever door wrote it.
 * This file is the courtesy half of that rule. It lets the wallet screen say
 * the hold is there and until when, and it lets the two server actions refuse
 * with a sentence before they reach a database error.
 *
 * Pure except for `loadAccountHold`, which takes the caller's own Supabase
 * client: the table's RLS policy lets a person read their own holds and
 * nobody else's, so no service key is involved in answering.
 *
 * AN UNREADABLE HOLD IS NOT "NO HOLD". `loadAccountHold` returns `unknown`
 * when the read fails, and the wallet screen then says nothing rather than
 * implying the money is free to move. The actions do not refuse on `unknown`,
 * because the trigger is the rule and it will refuse on its own if a hold
 * exists; a courtesy check that blocked every withdrawal whenever a read
 * hiccuped would be a second outage wearing a security badge.
 */

import { formatDate, type Locale } from "@vallo/i18n";

export type AccountHold =
  | { state: "none" }
  | { state: "held"; until: string }
  | { state: "unknown" };

type HoldRow = { ends_at?: unknown };

/** The latest end time among rows still in force at `now`, or none. */
export function holdFromRows(rows: unknown, now: number): AccountHold {
  if (!Array.isArray(rows)) return { state: "unknown" };
  let latest: number | null = null;
  let latestIso: string | null = null;
  for (const row of rows as HoldRow[]) {
    if (typeof row?.ends_at !== "string") continue;
    const at = Date.parse(row.ends_at);
    if (!Number.isFinite(at) || at <= now) continue;
    if (latest === null || at > latest) {
      latest = at;
      latestIso = row.ends_at;
    }
  }
  return latestIso === null ? { state: "none" } : { state: "held", until: latestIso };
}

/**
 * Is this error the hold trigger refusing?
 *
 * The trigger raises the fixed message `account_hold_active`. Matched on that
 * token rather than on SQLSTATE because P0001 is every plpgsql `raise`.
 */
export function isAccountHoldError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("account_hold_active");
}

type HoldClient = {
  from: (table: string) => {
    select: (columns: string) => {
      gt: (column: string, value: string) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

/** The reader's own hold, through their own RLS. */
export async function loadAccountHold(client: unknown, now: number = Date.now()): Promise<AccountHold> {
  try {
    const { data, error } = await (client as HoldClient)
      .from("account_holds")
      .select("ends_at")
      .gt("ends_at", new Date(now).toISOString());
    if (error) return { state: "unknown" };
    return holdFromRows(data, now);
  } catch {
    return { state: "unknown" };
  }
}

/**
 * When the hold ends, in Lagos time with the weekday.
 *
 * "Held until 21:14" read at 23:00 does not say whether that is tonight or
 * tomorrow, so the day is always named. An unparseable time prints nothing
 * rather than "Invalid Date" on a money screen.
 */
export function formatHoldUntil(iso: string, locale: Locale): string {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) return "";
  return formatDate(at, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}
