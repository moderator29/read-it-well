"use client";

import { useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { TYPE } from "@/components/app/Screen";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ThreadContext } from "@/lib/messages/live";
import { deriveBookingSteps, lagosToday, type BookingStepKey } from "./booking-steps";
import { lagosDay, lagosWhen } from "./when";

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
 * own events (see `booking-steps.ts`), the current one accented, the rule
 * between them drawn with the platform's existing `nf-rule-draw` keyframe as
 * the banner arrives (pitch 8). Reduced motion paints the rule finished.
 *
 * Colour is never the only signal: done steps are filled discs, the current
 * step is a filled disc inside a ring and bold, and steps still ahead are
 * hollow. A greyscale screenshot reads the same as the colour one.
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

        <ol
          className="relative mt-row grid grid-cols-4 gap-inline-tight"
          aria-label={current ? copy[LABEL[current.key]] : copy.label}
        >
          {/* The rule sits behind the discs, from the centre of the first to
              the centre of the last, and draws itself across on arrival. */}
          <span
            aria-hidden="true"
            className="nf-rule-draw absolute top-2"
            /* Centre of the first disc to centre of the last: one eighth of the
               row in from each edge, because each of four columns is a quarter. */
            style={{ left: "12.5%", right: "12.5%" }}
          />
          {steps.map((step) => {
            const done = step.state === "done";
            const now = step.state === "current";
            const ink = done
              ? "var(--nf-state-success)"
              : now
                ? "var(--nf-brand-primary)"
                : "var(--nf-content-muted)";
            const when =
              step.at === null
                ? ""
                : step.key === "arrival"
                  ? lagosDay(step.at, locale)
                  : lagosWhen(step.at, locale);
            return (
              <li key={step.key} className="relative flex min-w-0 flex-col items-center text-center">
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 items-center justify-center rounded-full"
                  style={{
                    boxSizing: "border-box",
                    border: `var(--nf-border-width-strong) solid ${ink}`,
                    background: now
                      ? "var(--nf-surface-elevated)"
                      : done
                        ? ink
                        : "var(--nf-surface-elevated)",
                  }}
                >
                  {now && (
                    <span
                      className="block h-2 w-2 rounded-full nf-confirm-pop"
                      style={{ background: ink }}
                    />
                  )}
                </span>
                <span
                  aria-current={now ? "step" : undefined}
                  className={`mt-inline-tight block ${TYPE.caption} ${
                    now ? "font-semibold text-[var(--nf-content-primary)]" : ""
                  }`}
                >
                  {copy[LABEL[step.key]]}
                </span>
                {when && (
                  <span className={`nf-numeric mt-3xs block ${TYPE.caption} [overflow-wrap:anywhere]`}>
                    {when}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {cancelled && (
          <p role="status" className={`mt-row ${TYPE.rowMeta}`}>
            {copy.cancelled}
          </p>
        )}
      </div>
    </details>
  );
}
