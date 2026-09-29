import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { resolveSession } from "../actions/session";
import {
  pageOf,
  parseAdminSummary,
  parseEarningsSummary,
  parseHistoryRows,
  parsePaymentsSummary,
  type AdminMoneySummary,
  type EarningsSummary,
  type HistoryEntry,
  type PaymentsSummary,
} from "./history-model";

/**
 * THE READS BEHIND THE THREE MONEY HISTORIES.
 *
 * Every call here goes to a SECURITY DEFINER function that decides what the
 * caller may see by `auth.uid()`: `my_payments_*` and `my_earnings_*` return
 * the caller's own rows, and `admin_money_*` return nothing unless the caller
 * holds the finance scope or is an admin. So the client passed in is ALWAYS
 * the person's own session client. The service client has no `auth.uid()`,
 * and handing it to these functions would either read nothing or, worse,
 * make a future function that trusted it read everything. Never.
 *
 * The functions are newer than `database.types.ts`, so each call names its
 * function `as never`, the same way every other untyped call in the codebase
 * does, and the rows are parsed rather than trusted (`history-model.ts`).
 *
 * THREE HONEST OUTCOMES, and the page must tell them apart:
 *   ok          the rows, possibly none, and whether there are older ones
 *   signed-out  nobody to read for
 *   error       the read failed: the page says it could not load and NEVER
 *               draws an empty list, because "no payments" and "we could not
 *               see your payments" are different sentences about money
 */

export const HISTORY_PAGE_SIZE = 50;

export type HistoryRead<S> =
  | { state: "ok"; summary: S; entries: HistoryEntry[]; nextBefore: string | null }
  | { state: "signed-out" }
  | { state: "error" };

type Client = SupabaseClient<Database>;

async function readPage(
  client: Client,
  fn: "my_payments_history" | "my_earnings_history",
  before: string | null,
): Promise<{ entries: HistoryEntry[]; nextBefore: string | null } | null> {
  /* One row more than is shown, only to learn whether an older page exists. */
  const { data, error } = await client.rpc(fn as never, {
    p_limit: HISTORY_PAGE_SIZE + 1,
    p_before: before,
  } as never);
  if (error) return null;
  const entries = parseHistoryRows(data);
  if (!entries) return null;
  return pageOf(entries, HISTORY_PAGE_SIZE);
}

/** What the signed-in person paid, and what came back to them. */
export async function readMyPayments(before: string | null): Promise<HistoryRead<PaymentsSummary>> {
  const session = await resolveSession();
  if (session.state === "signed-out") return { state: "signed-out" };
  if (session.state !== "signed-in") return { state: "error" };
  const [summaryRes, page] = await Promise.all([
    session.supabase.rpc("my_payments_summary" as never),
    readPage(session.supabase, "my_payments_history", before),
  ]);
  if (summaryRes.error || !page) return { state: "error" };
  const summary = parsePaymentsSummary(summaryRes.data);
  if (summary.status === "signed_out") return { state: "signed-out" };
  if (summary.status !== "ok") return { state: "error" };
  return { state: "ok", summary: summary.summary, ...page };
}

/** What Paystack's split paid the signed-in lister, and what refunds reversed. */
export async function readMyEarnings(before: string | null): Promise<HistoryRead<EarningsSummary>> {
  const session = await resolveSession();
  if (session.state === "signed-out") return { state: "signed-out" };
  if (session.state !== "signed-in") return { state: "error" };
  const [summaryRes, page] = await Promise.all([
    session.supabase.rpc("my_earnings_summary" as never),
    readPage(session.supabase, "my_earnings_history", before),
  ]);
  if (summaryRes.error || !page) return { state: "error" };
  const summary = parseEarningsSummary(summaryRes.data);
  if (summary.status === "signed_out") return { state: "signed-out" };
  if (summary.status !== "ok") return { state: "error" };
  return { state: "ok", summary: summary.summary, ...page };
}

export type AdminRange = { from: string | null; to: string | null };

export type AdminHistoryRead =
  | { state: "ok"; summary: AdminMoneySummary; entries: HistoryEntry[] }
  | { state: "forbidden" }
  | { state: "error" };

/**
 * The platform summary and the latest rows, for the Money desk. `userClient`
 * is `requireAdmin("finance").userClient`, the caller's own session.
 */
export async function readAdminMoneyHistory(
  userClient: Client,
  options: { limit: number; range?: AdminRange },
): Promise<AdminHistoryRead> {
  const range = options.range ?? { from: null, to: null };
  const [summaryRes, rows] = await Promise.all([
    userClient.rpc("admin_money_summary" as never, { p_from: range.from, p_to: range.to } as never),
    readAdminMoneyRows(userClient, { limit: options.limit, range }),
  ]);
  if (summaryRes.error || rows === null) return { state: "error" };
  const summary = parseAdminSummary(summaryRes.data);
  if (summary.status === "forbidden") return { state: "forbidden" };
  if (summary.status !== "ok") return { state: "error" };
  return { state: "ok", summary: summary.summary, entries: rows };
}

/** Platform rows only, for the CSV export. Null when the read failed. */
export async function readAdminMoneyRows(
  userClient: Client,
  options: { limit: number; range?: AdminRange },
): Promise<HistoryEntry[] | null> {
  const range = options.range ?? { from: null, to: null };
  const { data, error } = await userClient.rpc("admin_money_history" as never, {
    p_limit: Math.min(Math.max(Math.trunc(options.limit), 1), 5000),
    p_before: null,
    p_from: range.from,
    p_to: range.to,
  } as never);
  if (error) return null;
  return parseHistoryRows(data);
}
