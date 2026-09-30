"use client";

import { useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { TYPE } from "@/components/app/Screen";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ThreadContext } from "@/lib/messages/live";
import { deriveBookingSteps, lagosToday, type BookingStepKey } from "./booking-steps";
import { lagosDay, lagosWhen } from "./when";
import { StatusTrack } from "@/components/app/status/StatusTrack";

/**
 * THE BOOKING FACE: the stay's four steps, as a timeline that draws itself.
 *
 * It folds. GOVERNING-chat-booking-card.png carries the stay on the card in
 * the thread and draws nothing between the header and the first bubble, so
 * shut, this is one glass row (the step the stay is on and its date, with a
 * chevron) and the timeline opens under it on a tap. A native disclosure, so
 * the open state costs no script and survives reduced motion.
 *
 * Reserved, paid, arrival day, completed. Each step dated from the booking's
 * own events (see `booking-steps.ts`), drawn on the shared `StatusTrack`
 * (spec section 14), the same stepper the booking page itself uses.
 *
 * Colour is never the only signal: done steps are filled discs with a tick,
 * the current step a ring with a filled centre and a heavier label, steps
 * still ahead hollow. A greyscale screenshot reads the same as the colour one.
 *
 * No inspection tooling, structurally: this file imports none.
 */

type Booking = NonNullable<ThreadContext["booking"]>;
type Events = NonNullable<ThreadContext["stateEvents"]>;
type BookingCopy = Dictionary["threads"]["booking"];

const LABEL: Record<BookingStepKey, keyof BookingCopy> = {
  reserved: "reserved",
  paid: "paid",
  arrival: "arrival",
  completed: "completed",
};

export function BookingFace({
  booking,
  stateEvents,
  copy,
  locale,
}: {
  booking: Booking;
  stateEvents: Events;
  copy: BookingCopy;
  locale: Locale;
}) {
  /* Today, read once when the face mounts rather than on every render. */
  const [today] = useState(() => lagosToday());
  const { steps, cancelled } = deriveBookingSteps({
    status: booking.status,
    checkIn: booking.checkIn,
    events: stateEvents.map((event) => ({ at: event.at, to: event.to })),
    today,
  });
  const current = steps.find((step) => step.state === "current");

  /* The one-line summary the fold shows shut: the step the stay is on and
     its date, so the card in the thread stays the star (the render carries
     the stay on the card, not on a banner). */
  const summaryWhen =
    current && current.at !== null
      ? current.key === "arrival"
        ? lagosDay(current.at, locale)
        : lagosWhen(current.at, locale)
      : "";

  return (
    <details
      aria-label={copy.label}
      data-testid="thread-booking-face"
      className="nf-panel nf-panel--card nf-context-card nf-booking-fold mb-row"
    >
      <summary className="nf-booking-fold__summary">
        {/* The glass object, because the render draws the stay as one: a
            stroked glyph here is the one place the surface language says not
            to use it (rule 5, and the founder's ruling on glass objects). */}
        <span className="nf-plate nf-plate--brand nf-plate--md nf-context-card__mark" aria-hidden="true">
          <UiIcon name="bed" size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="nf-overline block">{copy.label}</span>
          <span className="nf-context-card__line">
            <span className="truncate">{cancelled ? copy.cancelled : current ? copy[LABEL[current.key]] : booking.title}</span>
            {!cancelled && summaryWhen && <span className="nf-numeric">{summaryWhen}</span>}
          </span>
        </span>
        <UiIcon name="chevron-right" size={20} className="nf-context-card__chev" />
      </summary>
      <div className="nf-booking-fold__body">
        <p className={TYPE.rowTitle}>{booking.title}</p>

        {/* The shared status track (spec section 14): done steps a filled
            disc with a tick, the current one a ring with a halo, steps still
            ahead hollow; horizontal once the fold is wide enough, vertical
            on a phone. Every time is the booking's own. */}
        <StatusTrack
          className="mt-row"
          label={copy.label}
          testId="booking-face-track"
          steps={steps.map((step) => ({
            key: step.key,
            label: copy[LABEL[step.key]],
            when:
              step.at === null
                ? null
                : step.key === "arrival"
                  ? lagosDay(step.at, locale)
                  : lagosWhen(step.at, locale),
            /* A cancelled stay stops on the step it was standing on. */
            state: cancelled && step.state === "current" ? "failed" : step.state,
          }))}
        />

        {cancelled && (
          <p role="status" className={`mt-row ${TYPE.rowMeta}`}>
            {copy.cancelled}
          </p>
        )}
      </div>
    </details>
  );
}
