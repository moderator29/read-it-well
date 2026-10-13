import { formatDate, getDictionary, type Locale } from "@vallo/i18n";
import { TYPE } from "@/components/app/Screen";
import { StatusChip } from "@/components/ui/StatusChip";
import { readMyArrivalCheck } from "@/lib/stays/arrival-check-queries";
import { arrivalCheckMayBeOpen } from "@/lib/stays/arrival-check";
import { lagosToday } from "@/lib/bookings/schema";
import { ArrivalCheckCard } from "./ArrivalCheckCard";

/**
 * V-91, ON THE GUEST'S BOOKING: "Is it as listed?"
 *
 * Drawn only while the database says the check is open (check-in time until
 * three hours after), and afterwards as one dated line saying what the guest
 * answered. Before the window, after an unanswered window, or on a read that
 * failed, nothing: the page never shows a question the database would refuse.
 *
 * TRUST FACTS AS DATES, NEVER TICKS (Session 3, W13). The answered record is
 * a fact the guest may need to point to later, so it carries the full date
 * and time it was given, in Lagos time, as its own row under the sentence,
 * not only the clock time inside it. The state beside the title is a
 * StatusChip (word, shape and colour): "as listed" is the success circle, a
 * report is the disputed diamond, because a report is raised and being
 * looked at, not an error, and is never painted red.
 */
export async function ArrivalCheck({
  bookingId,
  checkIn,
  locale,
}: {
  bookingId: string;
  /** The check-in date (YYYY-MM-DD), so a failed read on the day can say so. */
  checkIn: string;
  locale: Locale;
}) {
  const view = await readMyArrivalCheck(bookingId);
  const t = getDictionary(locale);
  const copy = t.arrivalCheck;
  const facts = t.experienceSpeed.arrivalCheck;
  const time = (iso: string | null) =>
    iso ? formatDate(new Date(iso), locale, { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }) : "";

  /* The answered fact in full: weekday, day, month and time, Lagos time. */
  const fullDate = (iso: string) =>
    formatDate(new Date(iso), locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Lagos",
    });

  if (view.state === "open") {
    return (
      <ArrivalCheckCard
        bookingId={bookingId}
        copy={copy}
        closesAt={time(view.closesAt)}
      />
    );
  }

  if (view.state === "answered") {
    const line =
      view.answer === "as_listed"
        ? copy.answeredYes.replace("{time}", time(view.answeredAt))
        : (view.reference ? copy.answeredReport : copy.answeredReportNoRef)
            .replace("{time}", time(view.answeredAt))
            .replace("{reference}", view.reference ?? "");
    return (
      <section className="nf-panel nf-panel--card isolate mt-lg block p-md" data-testid="arrival-check-answered">
        <div className="flex flex-wrap items-center justify-between gap-xs">
          <h2 className="nf-h3">{copy.title}</h2>
          {view.answer === "as_listed" ? (
            <StatusChip state="success">{copy.yes}</StatusChip>
          ) : (
            <StatusChip state="disputed">{copy.reasons[view.answer]}</StatusChip>
          )}
        </div>
        <p className={`mt-xs ${TYPE.body}`}>{line}</p>
        {view.answeredAt && (
          <dl className="mt-sm flex items-baseline justify-between gap-md border-t border-[var(--nf-border-subtle)] pt-sm">
            <dt className="nf-caption text-[var(--nf-content-muted)]">{facts.answeredLabel}</dt>
            <dd className="nf-caption nf-numeric text-[var(--nf-content-primary)]" data-testid="arrival-check-answered-at">
              {fullDate(view.answeredAt)}
            </dd>
          </dl>
        )}
      </section>
    );
  }

  /* A read that failed on or the day after check-in may be hiding an open
     check: say so, rather than draw nothing when it matters most. */
  if (view.state === "failed" && arrivalCheckMayBeOpen(checkIn, lagosToday())) {
    return (
      <p className={`mt-lg ${TYPE.body}`} role="status" data-testid="arrival-check-failed">
        {copy.readFailed}
      </p>
    );
  }

  return null;
}
