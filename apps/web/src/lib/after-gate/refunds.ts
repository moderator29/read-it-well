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
import { refundLineFor, type RefundLine } from "./refund-lines";

/**
 * The refund promise, read back. V-24 and V-20.
 *
 * WHAT IS MEASURED. Vallo holds no money: a refund is Paystack returning
 * the charge to the card that paid it. The promise (five Nigerian business
 * days from the ask) is kept when Paystack INITIATES the refund
 * (`booking_refunds.processor_submitted_at`); `refund.processed` then stamps
 * when it reached the card (`processor_settled_at`). The wait before a
 * decision is the `refund_requests` row, answered by the first
 * `booking_refunds` row after the ask or a decline in
 * `refund_request_decisions`. The operator's board (`admin_refund_clock`)
 * lists every leg: an ask not answered, a decided refund not yet sent, one
 * sent but not processed, a flatmate's share refund in either state, and a
 * rent refund a lister owes.
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

/* The line's shape and its pure builder live in `refund-lines.ts`, where the
   rule that only a processed refund has landed is tested. */
export type { RefundLine } from "./refund-lines";

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
    const lines: RefundLine[] = refunds.map((row) =>
      refundLineFor(row, request, copy, (minor) => formatMoney(minor, locale), date),
    );

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
        refundMinor: null,
        retained: null,
        landed: false,
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
        refundMinor: null,
        retained: null,
        landed: false,
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

export const CLOCK_KINDS = ["request", "unsent", "processor", "share_unsent", "share_processor", "rent_owed"] as const;
export type ClockKind = (typeof CLOCK_KINDS)[number];

export type ClockBoardRow = {
  id: string;
  /** The refund request's id, for a decision; null for every other leg. */
  requestId: string | null;
  bookingId: string;
  kind: ClockKind;
  amount: string;
  due: string;
};

export type ClockBoard =
  | { state: "unavailable" }
  | { state: "ready"; dueSoon: ClockBoardRow[]; overdue: ClockBoardRow[] };

/** The operator's refund clock, filtered in the database by `admin_refund_clock`. */
export async function readRefundClockBoard(locale: Locale, now: Date = new Date()): Promise<ClockBoard> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return { state: "unavailable" };
  try {
    // The function checks the caller's own role, so it runs as the session, not the service client.
    const loose = access.userClient as unknown as Loose;
    const { data, error } = await loose.rpc("admin_refund_clock");
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    const dueSoon: ClockBoardRow[] = [];
    const overdue: ClockBoardRow[] = [];
    for (const raw of data as Record<string, unknown>[]) {
      const dueBy = typeof raw.due_by === "string" ? raw.due_by : null;
      const amount = typeof raw.amount_minor === "number" ? raw.amount_minor : Number(raw.amount_minor);
      const kind = (CLOCK_KINDS as readonly string[]).includes(String(raw.kind)) ? (raw.kind as ClockKind) : null;
      if (!kind || !dueBy || typeof raw.subject_id !== "string" || typeof raw.booking_id !== "string" || !Number.isInteger(amount)) {
        continue;
      }
      const row: ClockBoardRow = {
        id: `${kind}-${raw.subject_id}`,
        requestId: kind === "request" ? raw.subject_id : null,
        bookingId: raw.booking_id,
        kind,
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
