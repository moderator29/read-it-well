/**
 * THE HOLD ON MONEY LEAVING AN ACCOUNT, AS THE PERSON SEES IT. V-19.
 *
 * The rule is the AUDIT'S, not this file's: `public.account_money_holds`
 * (live migration `20260924012454`) and its triggers refuse, while a hold
 * stands, any withdrawal, send, payment or escrow hold from the balance and
 * any change of payout account (error code RM050). "This was not me" writes a
 * row there with reason `not_me` (`report_not_me`, `20260924160000`); a
 * support-assisted email change writes one with its own reason. This file is
 * the courtesy half: the wallet says the hold is there, until when and why,
 * and the money actions refuse with a sentence before or instead of a raw
 * database error.
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

/* "staff": a hold staff placed by hand (SCUML item 6, `str_place_hold`). The
   member is told the money is held and when it ends, and never why: that
   is the no-tipping-off rule. */
export type HoldReason = "not_me" | "other" | "staff";

export type AccountHold =
  | { state: "none" }
  | { state: "held"; until: string; reason: HoldReason }
  | { state: "unknown" };

type HoldRow = { hold_until?: unknown; reason?: unknown };

/** The hold in force at `now`, from the owner's row (one per account). */
export function holdFromRows(rows: unknown, now: number): AccountHold {
  if (!Array.isArray(rows)) return { state: "unknown" };
  let latest: number | null = null;
  let found: { until: string; reason: HoldReason } | null = null;
  for (const row of rows as HoldRow[]) {
    if (typeof row?.hold_until !== "string") continue;
    const at = Date.parse(row.hold_until);
    if (!Number.isFinite(at) || at <= now) continue;
    if (latest === null || at > latest) {
      latest = at;
      found = {
        until: row.hold_until,
        reason: row.reason === "not_me" ? "not_me" : row.reason === "staff_review" ? "staff" : "other",
      };
    }
  }
  return found === null ? { state: "none" } : { state: "held", ...found };
}

/**
 * Is this the audit's hold trigger refusing?
 *
 * It raises SQLSTATE RM050 with a sentence that begins "Money cannot leave
 * this account". `callMoneyRpc` keeps only the message as its failure
 * reason, so both the code and the opening words are accepted.
 */
export function isAccountHoldError(error: unknown): boolean {
  if (typeof error === "string") return error.startsWith("Money cannot leave this account");
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === "RM050") return true;
  return typeof message === "string" && message.startsWith("Money cannot leave this account");
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
      .from("account_money_holds")
      .select("hold_until, reason")
      .gt("hold_until", new Date(now).toISOString());
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
