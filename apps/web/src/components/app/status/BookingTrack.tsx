import type { Dictionary, Locale } from "@vallo/i18n/core";
import { deriveBookingSteps, lagosToday, type BookingStatus, type StateEvent } from "@/components/app/threads/booking-steps";
import { lagosDay, lagosWhen } from "@/components/app/threads/when";
import { StatusTrack } from "./StatusTrack";

/**
 * A STAY'S LIVE STATUS, on a page of its own (spec section 14; plan item 21):
 * reserved, paid, arrival day, completed, from the same deriver and the same
 * state events the thread's booking face uses, so the booking page and the
 * conversation about it can never disagree about where the stay is.
 *
 * A cancelled stay stops on the step it was standing on. A step with no
 * stored event carries no time.
 */
export function BookingTrack({
  status,
  checkIn,
  events,
  copy,
  locale,
}: {
  status: BookingStatus;
  /** ISO date or instant; the calendar day is what counts. */
  checkIn: string;
  events: StateEvent[];
  copy: Dictionary["threads"]["booking"];
  locale: Locale;
}) {
  const { steps, cancelled } = deriveBookingSteps({
    status,
    checkIn: checkIn.slice(0, 10),
    events,
    today: lagosToday(),
  });
  return (
    <section className="nf-panel nf-panel--card mt-md p-card" aria-label={copy.label} data-testid="booking-track">
      <StatusTrack
        title={copy.label}
        label={copy.label}
        steps={steps.map((step) => ({
          key: step.key,
          label: copy[step.key],
          when:
            step.at === null ? null : step.key === "arrival" ? lagosDay(step.at, locale) : lagosWhen(step.at, locale),
          state: cancelled && step.state === "current" ? "failed" : step.state,
        }))}
      />
      {cancelled && <p className="nf-caption mt-block text-[var(--nf-content-muted)]">{copy.cancelled}</p>}
    </section>
  );
}
