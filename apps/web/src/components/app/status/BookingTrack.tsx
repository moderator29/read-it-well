import type { Dictionary, Locale } from "@vallo/i18n/core";
import { deriveBookingSteps, lagosToday, type BookingStatus, type StateEvent } from "@/components/app/threads/booking-steps";
import { lagosDay, lagosWhen } from "@/components/app/threads/when";
import { HeroBand } from "@/components/ui/HeroBand";
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
  band,
}: {
  status: BookingStatus;
  /** ISO date or instant; the calendar day is what counts. */
  checkIn: string;
  events: StateEvent[];
  copy: Dictionary["threads"]["booking"];
  locale: Locale;
  /**
   * Open the page with it on the hero band (plan item 21; spec section 16,
   * Q2: the booking's live-status header): the stay's name as the title, its
   * dates under it, the track below. Without it, the track is a card.
   */
  band?: { title: string; sub?: string };
}) {
  const { steps, cancelled } = deriveBookingSteps({
    status,
    checkIn: checkIn.slice(0, 10),
    events,
    today: lagosToday(),
  });
  const trackSteps = steps.map((step) => ({
    key: step.key,
    label: copy[step.key],
    when:
      step.at === null ? null : step.key === "arrival" ? lagosDay(step.at, locale) : lagosWhen(step.at, locale),
    state: cancelled && step.state === "current" ? ("failed" as const) : step.state,
  }));
  if (band) {
    return (
      <HeroBand
        label={copy.label}
        title={band.title}
        sub={band.sub}
        aria-label={copy.label}
        data-testid="booking-track"
        className="nf-status-band"
      >
        <StatusTrack label={copy.label} steps={trackSteps} />
        {cancelled && <p className="nf-caption mt-block text-[var(--nf-content-muted)]">{copy.cancelled}</p>}
      </HeroBand>
    );
  }
  return (
    <section className="nf-panel nf-panel--card mt-md p-card" aria-label={copy.label} data-testid="booking-track">
      <StatusTrack title={copy.label} label={copy.label} steps={trackSteps} />
      {cancelled && <p className="nf-caption mt-block text-[var(--nf-content-muted)]">{copy.cancelled}</p>}
    </section>
  );
}
