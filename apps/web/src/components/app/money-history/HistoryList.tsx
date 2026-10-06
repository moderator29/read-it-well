import Link from "next/link";
import type { Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Amount } from "@/components/ui/Amount";
import { StatusPill } from "@/components/ui/StatusPill";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { panelClass } from "@/components/ui/Panel";
import { formatMoneyTime } from "@/lib/money/dates";
import { HISTORY_EARLIER, HISTORY_END } from "@/lib/money/copy";
import {
  KIND_LABEL,
  earlierHref,
  groupByDay,
  signFor,
  statusFor,
  type HistoryEntry,
} from "@/lib/money/history-model";

/**
 * A money history as one glass card: the day as a heading inside it, then a
 * row per movement separated by hairlines, newest first.
 *
 * EACH ROW SAYS FOUR THINGS, and no more: what it was for (the listing's
 * title, or the kind of movement when the title could not be read), which
 * kind of movement and the Lagos time it moved, the signed amount, and its
 * state as a word. The sign comes from the kind (`history-model.ts`): on the
 * payer's history a payment is "-" and a refund "+", on a lister's an earning
 * is "+" and a reversal "-". Amounts are kobo-exact. A refund still with the
 * processor carries its state, so it is never mistaken for money back.
 *
 * Rows are real rows only. An empty history is the page's designed empty
 * state, and a failed read is the page's error state; this component is only
 * ever handed rows that were read.
 *
 * "Show earlier" pages by the instant of the last row (`?before=`). The link
 * appears only when the read found an older row, and the end of the record is
 * said in words, so a reader never wonders whether a payment is below a fold
 * that does not exist.
 */
export function HistoryList({
  entries,
  nextBefore,
  basePath,
  paged,
  locale,
  heading,
  linkToBooking = false,
}: {
  entries: HistoryEntry[];
  nextBefore: string | null;
  /** The page's own path, for the "Show earlier" and "Back to the newest" links. */
  basePath: string;
  /** True when this page was reached by "Show earlier". */
  paged: boolean;
  locale: Locale;
  heading: string;
  /**
   * The payer's side only: a row that names its booking opens it, where the
   * stay or tenancy and its money record live. Off for a lister's history,
   * whose rows are another person's booking and would open on a "not yours"
   * panel, and for any row with no booking id, which stays a plain row
   * rather than a link to nowhere.
   */
  linkToBooking?: boolean;
}) {
  const days = groupByDay(entries);
  const earlier = earlierHref(basePath, nextBefore);
  return (
    <section aria-label={heading} className={panelClass({ variant: "card", className: "nf-history-list" })}>
      {days.map((day) => {
        const headingId = `nf-history-day-${day.day}`;
        return (
          <div key={day.day} className="nf-history-day" role="group" aria-labelledby={headingId}>
            <h3 id={headingId} className="nf-history-day__head nf-overline">
              {day.label}
            </h3>
            <ul className="nf-history-rows">
              {day.entries.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  locale={locale}
                  href={linkToBooking && entry.bookingId ? `/bookings/${encodeURIComponent(entry.bookingId)}` : null}
                />
              ))}
            </ul>
          </div>
        );
      })}
      <div className="nf-history-foot">
        {earlier ? (
          <Link href={earlier} className="nf-history-link nf-tap" data-testid="history-earlier">
            {HISTORY_EARLIER}
            <UiIcon name="arrow-down" size={16} />
          </Link>
        ) : (
          <span>{HISTORY_END}</span>
        )}
        {paged && (
          <Link href={basePath} className="nf-history-link nf-tap">
            <UiIcon name="arrow-up" size={16} />
            Back to the newest
          </Link>
        )}
      </div>
    </section>
  );
}

function HistoryRow({ entry, locale, href }: { entry: HistoryEntry; locale: Locale; href: string | null }) {
  const incoming = entry.direction === "in";
  const status = statusFor(entry.kind, entry.status);
  const time = formatMoneyTime(new Date(entry.occurredAt), locale);
  const body = (
    <>
      <IconPlate size="sm" tone={incoming ? "success" : "brand"} className="nf-history-row__tile">
        <UiIcon name={incoming ? "arrow-down" : "arrow-up"} size={ICON_PLATE_GLYPH.sm} />
      </IconPlate>
      <span className="min-w-0 flex-1">
        <span className="nf-history-row__title">{entry.title ?? KIND_LABEL[entry.kind]}</span>
        <span className="nf-history-row__when">
          {KIND_LABEL[entry.kind]}
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {time}
        </span>
      </span>
      <span className="nf-numeric flex shrink-0 flex-col items-end gap-inline-tight text-right">
        <span className={`nf-history-row__amount ${incoming ? "nf-history-row__amount--in" : ""}`}>
          <span className="sr-only">{incoming ? "Money in: " : "Money out: "}</span>
          <span aria-hidden="true">{signFor(entry.direction)} </span>
          <Amount minorUnits={entry.amountMinor} locale={locale} showFraction secondaryClassName="nf-history-kobo" />
        </span>
        {/* At the pill's own 12px, the floor anywhere (north star section
            5): this was forced down to 11px. */}
        <StatusPill tone={status.tone} className="nf-history-badge">
          {status.label}
        </StatusPill>
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="nf-history-row nf-history-row--link nf-tap" data-kind={entry.kind}>
          {body}
        </Link>
      ) : (
        <div className="nf-history-row" data-kind={entry.kind}>
          {body}
        </div>
      )}
    </li>
  );
}
