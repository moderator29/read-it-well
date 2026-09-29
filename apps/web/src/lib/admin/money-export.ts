import { nairaFromMinor, toCsv } from "./csv";
import {
  lagosDayEnd,
  lagosDayStart,
  parseDay,
  type HistoryEntry,
} from "../money/history-model";

/**
 * THE MONEY DESK'S CSV: every payment and refund on the platform, for finance.
 *
 * Pure, so the columns and the range rules are tested without a request. The
 * route (`app/admin/money/export/route.ts`) does the door, the read and the
 * audit row; this file only decides what the file says.
 *
 * Amounts leave as naira with two decimals, as numbers a spreadsheet can sum
 * (`nairaFromMinor`, the one conversion the console's exports share). Names
 * and titles are typed by members, so every text cell goes through `toCsv`,
 * which neutralises a leading formula character. The instant is the database's
 * own, in UTC ISO form, so a spreadsheet sorts it correctly whatever its
 * locale; a Lagos day column sits beside it for reading.
 */

export const MONEY_EXPORT_LIMIT = 5000;

export const MONEY_EXPORT_HEADER = [
  "occurred_at_utc",
  "lagos_day",
  "kind",
  "status",
  "amount_naira",
  "lister_share_naira",
  "guarantee_naira",
  "commission_naira",
  "listing",
  "payer",
  "payee",
  "reference",
  "booking_id",
  "entry_id",
] as const;

function lagosDayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function moneyHistoryCsv(entries: readonly HistoryEntry[]): string {
  return toCsv(
    MONEY_EXPORT_HEADER,
    entries.map((e) => [
      new Date(e.occurredAt).toISOString(),
      lagosDayOf(e.occurredAt),
      e.kind,
      e.status,
      nairaFromMinor(e.amountMinor),
      nairaFromMinor(e.listerShareMinor),
      nairaFromMinor(e.guaranteeMinor),
      nairaFromMinor(e.commissionMinor),
      e.title,
      e.payerName,
      e.payeeName,
      e.reference,
      e.bookingId,
      e.id,
    ]),
  );
}

export type ExportRange =
  | { ok: true; from: string | null; to: string | null; fromDay: string | null; toDay: string | null }
  | { ok: false; reason: string };

/**
 * `from` and `to` are optional Lagos calendar days, `YYYY-MM-DD`, both
 * inclusive. A value that is present and not a real day is refused rather
 * than ignored: an export silently widened to "everything" because a date was
 * mistyped is a bigger file of personal data than anybody asked for.
 */
export function parseExportRange(params: URLSearchParams): ExportRange {
  const rawFrom = params.get("from");
  const rawTo = params.get("to");
  const fromDay = rawFrom ? parseDay(rawFrom) : null;
  const toDay = rawTo ? parseDay(rawTo) : null;
  if (rawFrom && !fromDay) return { ok: false, reason: "from must be a date written YYYY-MM-DD" };
  if (rawTo && !toDay) return { ok: false, reason: "to must be a date written YYYY-MM-DD" };
  if (fromDay && toDay && fromDay > toDay) return { ok: false, reason: "from must not be after to" };
  return {
    ok: true,
    from: fromDay ? lagosDayStart(fromDay) : null,
    to: toDay ? lagosDayEnd(toDay) : null,
    fromDay,
    toDay,
  };
}

/** `vallo-money-history-2026-09-01-to-2026-09-29.csv`, or `-all` without a range. */
export function exportFilename(fromDay: string | null, toDay: string | null): string {
  if (!fromDay && !toDay) return "vallo-money-history-all.csv";
  return `vallo-money-history-${fromDay ?? "start"}-to-${toDay ?? "now"}.csv`;
}
