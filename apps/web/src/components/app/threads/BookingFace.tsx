"use client";

import { useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n";
import { TYPE } from "@/components/app/Screen";
import type { ThreadContext } from "@/lib/messages/live";
import { deriveBookingSteps, lagosToday, type BookingStepKey } from "./booking-steps";
import { lagosDay, lagosWhen } from "./when";

/**
 * THE BOOKING FACE: the stay's four steps, as a timeline that draws itself.
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

  return (
    <section
      aria-label={copy.label}
      data-testid="thread-booking-face"
      className="nf-card mb-row rounded-[var(--nf-radius-lg)] p-card-sm"
    >
      <p className="nf-overline">{copy.label}</p>
      <p className={`mt-inline-tight ${TYPE.rowTitle}`}>{booking.title}</p>

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
    </section>
  );
}
