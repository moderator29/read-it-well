"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "@/components/app/Screen";
import type { ActionResult } from "@/lib/actions/envelope";
import { cancelReservation } from "@/lib/reservations/actions";
import type { ThreadContext } from "@/lib/messages/live";
import { fill, lagosWhen } from "./when";

/**
 * THE RESERVATION FACE: the chat lives inside the table.
 *
 * The reservation is the object and the thread is its channel, so the banner
 * says what the table IS (its state, as the platform's one status pill) and
 * offers the one thing a guest can do to it from here, which is cancel. The
 * restaurant's own answer (`respondToReservation`) belongs to the operator
 * surface and is not drawn here.
 *
 * There is no inspection tooling in this file, structurally: it never imports
 * any. That is the research's rule for context-typed threads and it is what
 * keeps a restaurant thread from ever growing a "Mark as inspected" button.
 */

type Reservation = NonNullable<ThreadContext["reservation"]>;
type ReservationCopy = Dictionary["threads"]["reservation"];

/** "Fri 26 Sep, 8:00 pm, table for 4", the header's sub line. */
export function reservationLine(
  reservation: Reservation,
  locale: Locale,
  copy: ReservationCopy,
): string {
  return `${lagosWhen(reservation.reservedFor, locale)}, ${fill(copy.tableFor, {
    count: reservation.partySize,
  })}`;
}

export function ReservationFace({
  reservation,
  viewerIsGuest,
  copy,
  locale,
}: {
  reservation: Reservation;
  viewerIsGuest: boolean;
  copy: ReservationCopy;
  locale: Locale;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    cancelReservation,
    null,
  );
  const cancelled = Boolean(state?.ok);
  /* The moment this face mounted, read once. A table in the past cannot be
     cancelled from here, and the clock is not something a render should keep
     asking; if the page is left open across the hour the server refuses. */
  const [now] = useState(() => Date.now());

  /* A successful cancel re-reads the thread; the sheet closes because the
     open flag below is derived from `cancelled`, not set from an effect. */
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const status = cancelled ? "CANCELLED" : reservation.state;
  const live = status === "PENDING" || status === "CONFIRMED";
  const ahead = Date.parse(reservation.reservedFor) > now;

  return (
    <section
      aria-label={reservationLine(reservation, locale, copy)}
      data-testid="thread-reservation-face"
      className="nf-card mb-row rounded-[var(--nf-radius-lg)] p-card-sm"
    >
      <div className="flex items-center gap-row">
        <span aria-hidden="true" className="shrink-0 text-[var(--nf-brand-secondary)]">
          <UiIcon name="utensils" size={ICON.row} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={TYPE.rowTitle}>{reservationLine(reservation, locale, copy)}</p>
          {reservation.listingTitle && (
            <p className={`mt-inline-tight ${TYPE.rowMeta}`}>{reservation.listingTitle}</p>
          )}
          {cancelled && (
            <p role="status" className={`mt-inline-tight ${TYPE.rowMeta}`}>
              {copy.cancelled}
            </p>
          )}
        </div>
        <StatusPill tone={toneForStatus(status)} live className="shrink-0">
          {copy.status[status]}
        </StatusPill>
      </div>

      {viewerIsGuest && live && ahead && (
        <div className="mt-row">
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(true)}>
            {copy.cancel}
          </Button>
        </div>
      )}

      {state && !state.ok && (
        <p role="alert" className={`mt-inline-tight ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
          {state.error}
        </p>
      )}

      {confirming && !cancelled && (
        <Sheet open={confirming} onOpenChange={setConfirming} title={copy.cancelTitle} detents={[0.42]}>
          <p className={TYPE.body}>{copy.cancelBody}</p>
          <form action={formAction} className="mt-block flex flex-col gap-inline">
            <input type="hidden" name="reservationId" value={reservation.id} />
            {/* Rose on the confirming control only. */}
            <Button type="submit" variant="danger" full loading={pending}>
              {copy.cancelConfirm}
            </Button>
            <Button type="button" variant="ghost" full disabled={pending} onClick={() => setConfirming(false)}>
              {copy.keep}
            </Button>
          </form>
        </Sheet>
      )}
    </section>
  );
}
