"use client";

import { useActionState } from "react";
import { respondToReservation } from "@/lib/reservations/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import type { HostReservation, HostReservationBoard } from "@/lib/agent/reservations-queries";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * Tonight's tables, and the requests still waiting on an answer.
 *
 * The restaurant's half of the reservation loop. Until this existed a guest
 * could ask for a table, the row landed PENDING under RLS, and nobody at the
 * restaurant had any way to see it or answer, which is the state KNOWN_GAPS
 * named rather than left implied.
 *
 * ## Why the time is formatted here and not on the server
 *
 * It is not: `Intl` runs identically in both, and the timezone is pinned to
 * Africa/Lagos rather than taken from the device. A restaurant in Ikeja reading
 * the board on a phone still set to London must see the table at the hour their
 * kitchen will actually serve it. That is the same rule the guest form follows
 * from the other side, and if the two ever disagreed the whole feature would be
 * quietly wrong for exactly the people who travel.
 *
 * ## Accept is not styled louder than decline
 *
 * Both are real answers and the restaurant is the one who knows which is true.
 * A console that makes accepting the easy tap and declining the small grey link
 * is a console that produces accepted tables nobody kept.
 */

/** Pinned, never the device's. See the note above. */
const LAGOS = "Africa/Lagos";

function whenLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString("en-NG", {
    timeZone: LAGOS,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function waitedLabel(hours: number): string {
  if (hours < 1) return "just now";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function Decision({ reservationId }: { reservationId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    respondToReservation,
    null,
  );

  if (state?.ok) {
    return (
      <p className="mt-3 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        Answered. The guest can see it.
      </p>
    );
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Two forms rather than one with two submit values, so that a decision
            cannot be changed by a stray Enter key landing on the wrong button. */}
        <form action={formAction}>
          <input type="hidden" name="reservationId" value={reservationId} />
          <input type="hidden" name="decision" value="CONFIRMED" />
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving" : "Accept"}
          </Button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="reservationId" value={reservationId} />
          <input type="hidden" name="decision" value="CANCELLED" />
          <Button type="submit" variant="secondary" disabled={pending}>
            Decline
          </Button>
        </form>
      </div>
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-status-danger)]">
          {state.error}
        </p>
      )}
    </>
  );
}

function ReservationCard({
  reservation,
  decidable,
}: {
  reservation: HostReservation;
  decidable: boolean;
}) {
  const tone =
    reservation.status === "CONFIRMED"
      ? "success"
      : reservation.status === "CANCELLED"
        ? "danger"
        : "warning";

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={tone}>
          {reservation.status === "PENDING"
            ? "Waiting on you"
            : reservation.status === "CONFIRMED"
              ? "Accepted"
              : "Declined"}
        </StatusPill>
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          asked {waitedLabel(reservation.hoursWaiting)}
        </span>
      </div>

      <p className="mt-2 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
        {whenLabel(reservation.reservedFor)}
      </p>

      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-[var(--nf-content-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <UiIcon name="user" size={16} className="opacity-70" aria-hidden />
          {reservation.guestName}
        </span>
        <span className="tabular-nums">
          {reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}
        </span>
        <span className="text-[var(--nf-content-muted)]">{reservation.listingTitle}</span>
      </p>

      {/* Shown to the host in full, never truncated. A note is where an allergy
          goes, and a shortened allergy is worse than none. */}
      {reservation.note && (
        <p className="mt-2 rounded-lg bg-[var(--nf-surface-raised)] px-3 py-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {reservation.note}
        </p>
      )}

      {decidable && <Decision reservationId={reservation.id} />}
    </li>
  );
}

function Section({
  title,
  empty,
  reservations,
  decidable,
}: {
  title: string;
  empty: string;
  reservations: HostReservation[];
  decidable: boolean;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
        {title}
        {reservations.length > 0 && (
          <span className="ml-2 text-[0.8125rem] font-normal tabular-nums text-[var(--nf-content-muted)]">
            {reservations.length}
          </span>
        )}
      </h3>
      {reservations.length === 0 ? (
        <p className="mt-2 text-[0.875rem] text-[var(--nf-content-muted)]">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              decidable={decidable}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReservationsBoard({ board }: { board: HostReservationBoard }) {
  /* An agent with no restaurant sees nothing at all rather than three empty
     headings explaining a product they do not sell. */
  if (board.total === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-[1.125rem] font-bold text-[var(--nf-content-primary)]">Tables</h2>
      <p className="mt-1 text-[0.875rem] text-[var(--nf-content-secondary)]">
        Requests at your restaurants. Nothing is held for a guest until you accept it.
      </p>

      <Section
        title="Waiting on you"
        empty="No requests to answer."
        reservations={board.requests}
        decidable
      />
      <Section
        title="Coming up"
        empty="No tables booked yet."
        reservations={board.upcoming}
        decidable={false}
      />
      <Section
        title="Past"
        empty="Nothing yet."
        reservations={board.past}
        decidable={false}
      />
    </div>
  );
}
