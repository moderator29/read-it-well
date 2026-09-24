import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "../actions/session";
import { requireAdmin } from "../admin/guard";
import { formatMoneyDate } from "../money/dates";
import { lagosToday } from "../rent/schema";
import { refundClock } from "../trust/business-days";
import { readCancellationTerms, type CancellationTerms } from "../trust/cancellation";
import { readRefundRequest, readRefundRow, type RefundRequestRow, type RefundRow } from "./rows";

/**
 * The refund promise, read back. V-24 and V-20.
 *
 * WHAT IS MEASURED. A decided refund is credited COMPLETED in the same
 * transaction that records it, so it lands the moment it is decided and there
 * is nothing to time. The wait a guest actually has is from ASKING to the
 * decision, so the clock is the `refund_requests` row: its `due_by` (five
 * Nigerian business days after the ask) is the date support decides by, and
 * the first `booking_refunds` row after the ask, or a decline recorded in
 * `refund_request_decisions`, answers it. A rent refund a lister owes
 * (`rent_refunds_owed`) is timed from when it became owed. Both are listed for
 * the operator by `public.admin_refund_clock`, which filters in the database.
 *
 * Every read degrades to "nothing to show" or "unavailable", never a crash,
 * and a read that fails is never drawn as a refund that has not landed.
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

/** Landed credit times by wallet entry id, or null when the read failed. */
async function landedTimes(client: Loose, refunds: RefundRow[]): Promise<Map<string, string> | null> {
  const ids = refunds.map((row) => row.walletEntryId).filter((id): id is string => id !== null);
  const landed = new Map<string, string>();
  if (ids.length === 0) return landed;
  const { data, error } = await client.from("wallet_entries").select("id, status, created_at").in("id", ids);
  if (error) return null;
  for (const entry of (data ?? []) as Record<string, unknown>[]) {
    if (entry.status === "COMPLETED" && typeof entry.id === "string" && typeof entry.created_at === "string") {
      landed.set(entry.id, entry.created_at);
    }
  }
  return landed;
}

export type RefundLine = {
  id: string;
  amount: string | null;
  retained: string | null;
  sentence: string;
  tone: "success" | "attention" | "error" | "neutral";
};

export type MyRefunds =
  | { state: "none"; canAsk: boolean }
  | { state: "unavailable" }
  | { state: "ready"; lines: RefundLine[]; canAsk: boolean };

/**
 * The guest's refund lines on one booking, and whether they may still ask.
 * Asking needs a paid, uncancelled stay that is not a rent charge; the same
 * rule is the insert policy on `refund_requests`, this only decides whether
 * to draw the form.
 */
export async function readMyRefundLines(
  bookingId: string,
  locale: Locale,
  booking: { cancelled: boolean; checkOut: string },
  now: Date = new Date(),
): Promise<MyRefunds> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "none", canAsk: false };
  const copy = getDictionary(locale).afterTheGate.refund;
  const date = (value: string | Date, withTime = false) => formatMoneyDate(value, locale, { withTime, now }) ?? "";
  try {
    const loose = session.supabase as unknown as Loose;
    const [refundsRead, requestRead, paidRead, rentRead] = await Promise.all([
      loose.from("booking_refunds").select("*").eq("booking_id", bookingId).order("created_at", { ascending: true }),
      loose.from("refund_requests").select("*").eq("booking_id", bookingId).maybeSingle(),
      loose.from("transactions").select("id").eq("booking_id", bookingId).eq("status", "SUCCESSFUL").limit(1),
      loose.from("rent_payments").select("id").eq("booking_id", bookingId).limit(1),
    ]);
    const paid = !paidRead.error && Array.isArray(paidRead.data) && paidRead.data.length > 0;
    const tenancy = !rentRead.error && Array.isArray(rentRead.data) && rentRead.data.length > 0;
    if (refundsRead.error) return { state: "unavailable" };
    const refunds = ((refundsRead.data ?? []) as unknown[])
      .map(readRefundRow)
      .filter((row): row is RefundRow => row !== null);
    // A missing table (before the migration applies) reads as "no request".
    const request: RefundRequestRow | null = requestRead.error ? null : readRefundRequest(requestRead.data);
    const landed = await landedTimes(loose, refunds);
    if (landed === null) return { state: "unavailable" };

    const lines: RefundLine[] = refunds.map((row): RefundLine => {
      const base = {
        id: row.id,
        amount: copy.amount.replace("{amount}", formatMoney(row.refundMinor, locale)),
        retained: row.retainedMinor > 0 ? copy.retained.replace("{amount}", formatMoney(row.retainedMinor, locale)) : null,
      };
      if (row.refundMinor <= 0) return { ...base, sentence: copy.nothingOwed, tone: "neutral" };
      const landedAt = row.walletEntryId ? landed.get(row.walletEntryId) : undefined;
      if (!landedAt) return { ...base, sentence: copy.unavailable, tone: "attention" };
      const answers = request && Date.parse(row.createdAt) >= Date.parse(request.requestedAt) ? request : null;
      const late = answers?.dueBy ? Date.parse(landedAt) > Date.parse(answers.dueBy) : false;
      return late && answers?.dueBy
        ? {
            ...base,
            sentence: copy.landedLate.replace("{date}", date(landedAt, true)).replace("{due}", date(answers.dueBy)),
            tone: "attention",
          }
        : { ...base, sentence: copy.landed.replace("{date}", date(landedAt, true)), tone: "success" };
    });

    // Support's answer to the ask, readable only by the guest who asked.
    const decisionRead = request
      ? await loose.from("refund_request_decisions").select("decision, note, decided_at").eq("request_id", request.id).maybeSingle()
      : null;
    const decision = !decisionRead || decisionRead.error ? null : (decisionRead.data as Record<string, unknown> | null);
    const declined = decision?.decision === "declined" && typeof decision.decided_at === "string" ? decision : null;
    if (request && declined) {
      const note = typeof declined.note === "string" && declined.note.trim() ? declined.note.trim() : null;
      lines.push({
        id: `${request.id}-decision`,
        amount: null,
        retained: null,
        sentence: (note ? copy.declined : copy.declinedNoNote)
          .replace("{date}", date(declined.decided_at as string))
          .replace("{note}", note ?? ""),
        tone: "neutral",
      });
    }
    const answered = request
      ? declined !== null || refunds.some((row) => Date.parse(row.createdAt) >= Date.parse(request.requestedAt))
      : false;
    if (request && !answered && request.dueBy) {
      const clock = refundClock({ refundMinor: 1, dueBy: new Date(request.dueBy), landedAt: null, now });
      lines.push({
        id: request.id,
        amount: null,
        retained: null,
        sentence: (clock.state === "overdue" ? copy.overdue : copy.asked)
          .replace("{asked}", date(request.requestedAt))
          .replace("{date}", date(request.dueBy)),
        tone: clock.state === "overdue" ? "error" : "attention",
      });
    }

    // The same rule as the insert policy: a stay whose check-out has passed
    // is a complaint for support, not a cancellation.
    const canAsk =
      paid &&
      !booking.cancelled &&
      booking.checkOut > lagosToday(now) &&
      !tenancy &&
      !requestRead.error &&
      !request &&
      refunds.length === 0;
    return lines.length === 0 ? { state: "none", canAsk } : { state: "ready", lines, canAsk };
  } catch {
    return { state: "unavailable" };
  }
}

export type ClockBoardRow = {
  id: string;
  /** The refund request's id, for a decision; null for a rent refund owed. */
  requestId: string | null;
  bookingId: string;
  kind: "request" | "rent_owed";
  amount: string;
  due: string;
};

export type ClockBoard =
  | { state: "unavailable" }
  | { state: "ready"; dueSoon: ClockBoardRow[]; overdue: ClockBoardRow[] };

/** The operator's refund clock, filtered in the database by `admin_refund_clock`. */
export async function readRefundClockBoard(locale: Locale, now: Date = new Date()): Promise<ClockBoard> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };
  try {
    const loose = access.supabase as unknown as Loose;
    const { data, error } = await loose.rpc("admin_refund_clock");
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    const dueSoon: ClockBoardRow[] = [];
    const overdue: ClockBoardRow[] = [];
    for (const raw of data as Record<string, unknown>[]) {
      const dueBy = typeof raw.due_by === "string" ? raw.due_by : null;
      const amount = typeof raw.amount_minor === "number" ? raw.amount_minor : Number(raw.amount_minor);
      if (!dueBy || typeof raw.subject_id !== "string" || typeof raw.booking_id !== "string" || !Number.isInteger(amount)) {
        continue;
      }
      const row: ClockBoardRow = {
        id: `${String(raw.kind)}-${raw.subject_id}`,
        requestId: raw.kind === "rent_owed" ? null : raw.subject_id,
        bookingId: raw.booking_id,
        kind: raw.kind === "rent_owed" ? "rent_owed" : "request",
        amount: formatMoney(amount, locale),
        due: formatMoneyDate(dueBy, locale, { withTime: true, now }) ?? "",
      };
      if (Date.parse(dueBy) < now.getTime()) overdue.push(row);
      else dueSoon.push(row);
    }
    return { state: "ready", dueSoon, overdue };
  } catch {
    return { state: "unavailable" };
  }
}
