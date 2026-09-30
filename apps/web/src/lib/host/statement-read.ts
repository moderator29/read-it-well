import "server-only";

import { resolveSession } from "../actions/session";
import { parseHistoryRows, type HistoryEntry } from "../money/history-model";
import { monthStartInstant, nextMonth } from "./statement";

/**
 * THE READ BEHIND A PAYOUT STATEMENT (C9): `my_earnings_history`, the same
 * SECURITY DEFINER function `/host/earnings` reads, under the host's own
 * session (never the service role: the function decides by `auth.uid()`).
 * It pages by instant, 200 rows at a time, from the end of the month back to
 * its start. Read only.
 */

const PAGE = 200;
const MAX_PAGES = 15;

export type MonthRead = { state: "ok"; entries: HistoryEntry[]; complete: boolean } | { state: "signed-out" } | { state: "error" };

export async function readEarningsBetween(fromIso: string, beforeIso: string): Promise<MonthRead> {
  const session = await resolveSession();
  if (session.state === "signed-out") return { state: "signed-out" };
  if (session.state !== "signed-in") return { state: "error" };
  const out: HistoryEntry[] = [];
  let before: string | null = beforeIso;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await session.supabase.rpc("my_earnings_history" as never, { p_limit: PAGE, p_before: before } as never);
    if (error) return { state: "error" };
    const rows = parseHistoryRows(data);
    if (!rows) return { state: "error" };
    for (const row of rows) if (row.occurredAt >= fromIso) out.push(row);
    const last = rows[rows.length - 1];
    if (rows.length < PAGE || !last || last.occurredAt < fromIso) return { state: "ok", entries: out, complete: true };
    before = last.occurredAt;
  }
  return { state: "ok", entries: out, complete: false };
}

/** Every line of one Lagos month. */
export function readMonthEarnings(month: string): Promise<MonthRead> {
  return readEarningsBetween(monthStartInstant(month), monthStartInstant(nextMonth(month)));
}

/** The newest rows, for the list of months that have a statement. */
export async function readRecentEarnings(): Promise<MonthRead> {
  const session = await resolveSession();
  if (session.state === "signed-out") return { state: "signed-out" };
  if (session.state !== "signed-in") return { state: "error" };
  const { data, error } = await session.supabase.rpc("my_earnings_history" as never, { p_limit: PAGE, p_before: null } as never);
  if (error) return { state: "error" };
  const rows = parseHistoryRows(data);
  if (!rows) return { state: "error" };
  return { state: "ok", entries: rows, complete: rows.length < PAGE };
}
