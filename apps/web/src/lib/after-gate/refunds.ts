import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "../actions/session";
import { requireAdmin } from "../admin/guard";
import { formatMoneyDate } from "../money/dates";
import { createAdminClient } from "../supabase/admin";
import { refundClock, refundDueBy } from "../trust/business-days";
import { readCancellationTerms, type CancellationTerms } from "../trust/cancellation";
import { readRefundRow, type RefundRow } from "./rows";

/**
 * The refund promise, read back. V-24 and V-20.
 *
 * Three reads, each through the narrowest client that can answer it:
 *
 *   - `readFrozenTerms`: the terms a booking was paid under, through the
 *     client the caller hands in (the guest's own, or the admin's own), so
 *     the bookings RLS decides who may see them.
 *   - `readMyRefundLines`: the guest's refunds on one booking, each with its
 *     due-by and whether it landed, as the sentences the booking page prints.
 *   - `readRefundClockBoard`: the operator's two lists, due inside a day and
 *     past due, through the service role behind `requireAdmin`.
 *
 * Every read degrades to "nothing to show" or "unavailable", never a crash,
 * and a refund decided before the due-by column existed is dated from its
 * decision by the same five-business-day rule the database now stamps.
 */

type Loose = SupabaseClient;

export async function readFrozenTerms(
  client: unknown,
  bookingId: string,
): Promise<{ terms: CancellationTerms; frozenAt: string } | null> {
  try {
    const loose = client as Loose;
    const { data, error } = await loose
      .from("booking_cancellation_terms")
      .select("source, terms, frozen_at")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    const terms = readCancellationTerms(row.source, row.terms);
    if (!terms || typeof row.frozen_at !== "string") return null;
    return { terms, frozenAt: row.frozen_at };
  } catch {
    return null;
  }
}

async function landedTimes(client: Loose, rows: RefundRow[]): Promise<Map<string, string>> {
  const ids = rows.map((row) => row.walletEntryId).filter((id): id is string => id !== null);
  const landed = new Map<string, string>();
  if (ids.length === 0) return landed;
  const { data } = await client.from("wallet_entries").select("id, status, created_at").in("id", ids);
  for (const entry of (data ?? []) as Record<string, unknown>[]) {
    if (entry.status === "COMPLETED" && typeof entry.id === "string" && typeof entry.created_at === "string") {
      landed.set(entry.id, entry.created_at);
    }
  }
  return landed;
}

function dueByOf(row: RefundRow): Date {
  return row.dueBy ? new Date(row.dueBy) : refundDueBy(new Date(row.createdAt));
}

export type RefundLine = {
  id: string;
  amount: string;
  retained: string | null;
  sentence: string;
  tone: "success" | "attention" | "error" | "neutral";
};

export type MyRefunds = { state: "none" } | { state: "unavailable" } | { state: "ready"; lines: RefundLine[] };

export async function readMyRefundLines(bookingId: string, locale: Locale, now: Date = new Date()): Promise<MyRefunds> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "none" };
  const copy = getDictionary(locale).afterTheGate.refund;
  try {
    const loose = session.supabase as unknown as Loose;
    const { data, error } = await loose
      .from("booking_refunds")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    if (error) return { state: "unavailable" };
    const rows = ((data ?? []) as unknown[]).map(readRefundRow).filter((row): row is RefundRow => row !== null);
    if (rows.length === 0) return { state: "none" };
    const landed = await landedTimes(loose, rows);
    const lines = rows.map((row): RefundLine => {
      const landedAt = row.walletEntryId ? landed.get(row.walletEntryId) : undefined;
      const clock = refundClock({
        refundMinor: row.refundMinor,
        dueBy: dueByOf(row),
        landedAt: landedAt ? new Date(landedAt) : null,
        now,
      });
      const date = (value: Date, withTime = false) => formatMoneyDate(value, locale, { withTime, now }) ?? "";
      const base = {
        id: row.id,
        amount: copy.amount.replace("{amount}", formatMoney(row.refundMinor, locale)),
        retained: row.retainedMinor > 0 ? copy.retained.replace("{amount}", formatMoney(row.retainedMinor, locale)) : null,
      };
      switch (clock.state) {
        case "nothing_owed":
          return { ...base, sentence: copy.nothingOwed, tone: "neutral" };
        case "landed":
          return clock.onTime
            ? { ...base, sentence: copy.landed.replace("{date}", date(clock.landedAt, true)), tone: "success" }
            : {
                ...base,
                sentence: copy.landedLate
                  .replace("{date}", date(clock.landedAt, true))
                  .replace("{due}", date(clock.dueBy)),
                tone: "attention",
              };
        case "due":
          return { ...base, sentence: copy.dueBy.replace("{date}", date(clock.dueBy)), tone: "attention" };
        case "overdue":
          return { ...base, sentence: copy.overdue.replace("{date}", date(clock.dueBy)), tone: "error" };
      }
    });
    return { state: "ready", lines };
  } catch {
    return { state: "unavailable" };
  }
}

export type ClockBoardRow = { id: string; bookingId: string; amount: string; due: string };

export type ClockBoard =
  | { state: "unavailable" }
  | { state: "ready"; dueSoon: ClockBoardRow[]; overdue: ClockBoardRow[] };

/** The operator's refund clock: due inside 24 hours, and past due, not yet landed. */
export async function readRefundClockBoard(locale: Locale, now: Date = new Date()): Promise<ClockBoard> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };
  try {
    const admin = createAdminClient() as unknown as Loose;
    const horizon = new Date(now.getTime() + 24 * 3_600_000).toISOString();
    const { data, error } = await admin
      .from("booking_refunds")
      .select("*")
      .gt("refund_minor", 0)
      .lte("due_by", horizon)
      .order("due_by", { ascending: true })
      .limit(200);
    if (error) return { state: "unavailable" };
    const rows = ((data ?? []) as unknown[]).map(readRefundRow).filter((row): row is RefundRow => row !== null);
    const landed = await landedTimes(admin, rows);
    const dueSoon: ClockBoardRow[] = [];
    const overdue: ClockBoardRow[] = [];
    for (const row of rows) {
      if (row.walletEntryId && landed.has(row.walletEntryId)) continue;
      const dueBy = dueByOf(row);
      const entry = {
        id: row.id,
        bookingId: row.bookingId,
        amount: formatMoney(row.refundMinor, locale),
        due: formatMoneyDate(dueBy, locale, { withTime: true, now }) ?? "",
      };
      if (dueBy.getTime() < now.getTime()) overdue.push(entry);
      else dueSoon.push(entry);
    }
    return { state: "ready", dueSoon, overdue };
  } catch {
    return { state: "unavailable" };
  }
}
