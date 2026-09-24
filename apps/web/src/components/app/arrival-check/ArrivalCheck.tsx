import { formatDate, getDictionary, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
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
  const copy = getDictionary(locale).arrivalCheck;
  const time = (iso: string | null) =>
    iso ? formatDate(new Date(iso), locale, { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }) : "";

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
        <h2 className="nf-h3">{copy.title}</h2>
        <p className={`mt-xs flex items-start gap-xs ${TYPE.body}`}>
          <UiIcon
            name={view.answer === "as_listed" ? "info" : "history"}
            size={16}
            className={`mt-3xs shrink-0 ${view.answer === "as_listed" ? "text-[var(--nf-content-secondary)]" : "text-[var(--nf-state-warning)]"}`}
          />
          <span>{line}</span>
        </p>
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
