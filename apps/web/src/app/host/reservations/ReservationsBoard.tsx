"use client";

import { useActionState } from "react";
import Link from "next/link";
import { respondToReservation } from "@/lib/reservations/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import type { HostReservationView } from "@/lib/reservations/queries";
import type { HostTableBoard } from "./board";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";

/**
 * The venue's own table board.
 *
 * `private.notify_reservation` has been pointing a business host at
 * `/host/reservations` since M7 and no such route existed, so a restaurant
 * owner could be told a table had been asked for, tap the notification, and
 * land nowhere. This is the surface that notification means.
 *
 * ## The decision goes through the path that already exists
 *
 * `respondToReservation` is the one action that answers a table, and it is the
 * same action `/agent/bookings` calls. It writes through the CALLER'S own
 * client, so `reservations_update_business_host` decides whether this person
 * may answer, the guard `.eq("status", "PENDING")` means two taps write once,
 * and the answer is posted into the reservation's own thread in the venue's
 * voice. The guest's notification is fired by the database trigger on the
 * status change and is untouched by this file. Nothing here is a second
 * decision path, because a second decision path is how two surfaces come to
 * disagree about what a confirmation means.
 *
 * ## The time is pinned to Lagos, never the device
 *
 * The same rule the agent board follows, and for the same reason: a venue
 * reading this on a phone still set to London must see the hour their kitchen
 * will actually serve the table. `Intl` runs identically on both sides of the
 * render, so this is not a client-only formatting.
 *
 * ## Accept is not styled louder than decline
 *
 * Both are real answers and the venue is the one who knows which is true. A
 * board that makes accepting the easy tap and declining a small grey link is a
 * board that produces accepted tables nobody kept.
 */

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

function partyLabel(size: number): string {
  return size === 1 ? "1 guest" : `${size} guests`;
}

function Decision({ reservationId }: { reservationId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    respondToReservation,
    null,
  );

  if (state?.ok) {
    return (
      <p className={`mt-row ${TYPE.rowMeta}`}>Answered. The guest has been told.</p>
    );
  }

  return (
    <>
      <div className="mt-row flex flex-wrap gap-inline">
        {/* Two forms rather than one with two submit values, so a decision
            cannot be changed by a stray Enter key landing on the wrong
            button. */}
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
        <p role="alert" className={`mt-row ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
          {state.error}
        </p>
      )}
    </>
  );
}

function TableCard({
  table,
  decidable,
}: {
  table: HostReservationView;
  decidable: boolean;
}) {
  const tone =
    table.status === "CONFIRMED" ? "success" : table.status === "CANCELLED" ? "danger" : "warning";
  const word =
    table.status === "PENDING"
      ? "Waiting on you"
      : table.status === "CONFIRMED"
        ? "Accepted"
        : "Declined or called off";

  return (
    <li className="nf-card p-card">
      <div className="flex flex-wrap items-center gap-inline">
        <StatusPill tone={tone}>{word}</StatusPill>
        <span className="nf-overline">{table.listingTitle}</span>
      </div>

      <p className={`mt-row ${TYPE.rowTitle}`}>{whenLabel(table.reservedFor)}</p>

      <p className={`mt-inline-tight flex flex-wrap items-center gap-x-group gap-y-inline-tight ${TYPE.rowMeta}`}>
        <span className="inline-flex items-center gap-inline-tight">
          <UiIcon name="user" size={16} aria-hidden />
          {table.guestName}
        </span>
        <span className="nf-numeric">{partyLabel(table.partySize)}</span>
      </p>

      {/* Never truncated. A note is where an allergy goes, and a shortened
          allergy is worse than no allergy at all. */}
      {table.note && (
        <p className={`mt-row rounded-[var(--nf-radius-md)] bg-[var(--nf-surface-raised)] px-row py-inline ${TYPE.rowMeta}`}>
          {table.note}
        </p>
      )}

      {table.conversationId && (
        <Link
          href={`/messages/${table.conversationId}`}
          className={`mt-row inline-flex items-center gap-inline-tight ${TYPE.rowMeta} font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline`}
        >
          Talk to {table.guestName}
          <UiIcon name="arrow-right" size={16} />
        </Link>
      )}

      {decidable && <Decision reservationId={table.id} />}
    </li>
  );
}

function Group({
  title,
  empty,
  tables,
  decidable,
}: {
  title: string;
  empty: string;
  tables: HostReservationView[];
  decidable: boolean;
}) {
  return (
    <section className="mt-block">
      <h2 className="nf-h4">
        {title}
        {tables.length > 0 && (
          <span className="nf-numeric ml-inline-tight font-normal text-muted">{tables.length}</span>
        )}
      </h2>
      {tables.length === 0 ? (
        <p className={`mt-row ${TYPE.rowMeta}`}>{empty}</p>
      ) : (
        <ul className="mt-row flex flex-col gap-row">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} decidable={decidable} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function HostReservationsBoard({ board }: { board: HostTableBoard }) {
  return (
    <>
      <Group
        title="Waiting on you"
        empty="No requests to answer."
        tables={board.requests}
        decidable
      />
      <Group
        title="Coming up"
        empty="No tables accepted yet."
        tables={board.upcoming}
        decidable={false}
      />
      <Group title="Past" empty="Nothing yet." tables={board.past} decidable={false} />
    </>
  );
}
