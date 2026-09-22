"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cancel } from "@/lib/bookings/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import type { BookingView } from "@/lib/bookings/queries";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TYPE } from "@/components/app/Screen";

/**
 * CANCELLING A STAY. ONE DEFINITION, BOTH SURFACES.
 *
 * This was a private function inside `app/(app)/bookings/MyBookings.tsx`, which
 * was fine while `/bookings` was the only screen that listed a stay. `/trips`
 * is the Stays side's diary of the same stays, and when it moved to the date
 * spine it had no way to call one off: a guest looking at their own booking on
 * the side of the product that owns stays could see it and not cancel it.
 *
 * The rule the platform applies to this is that a capability is never lost to
 * gain a layout, and the rule this file exists for is that there is exactly ONE
 * cancel flow. Two copies of a confirm-then-write sheet is how one of them ends
 * up with a fix the other never gets, on the control that releases somebody's
 * dates and their money.
 *
 * `<Sheet>` owns the portal, the drag handle, the detents, the focus trap,
 * focus restoration, Escape, the backdrop and the body scroll lock. What is
 * left here is the decision: the server action, the refusal, and the success
 * state. On success the router refreshes and the server-rendered list becomes
 * the single source of truth, never optimistic guesswork.
 */
export function CancelBookingSheet({
  booking,
  onClose,
}: {
  booking: BookingView;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    cancel,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const cancelled = Boolean(state?.ok);

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Cancel this booking?"
      /* The success state speaks for itself; the title stays on as the sheet's
         accessible name. */
      hideTitle={cancelled}
      footer={
        cancelled ? (
          <Button variant="primary" full onClick={onClose}>
            Done
          </Button>
        ) : (
          <form action={formAction} className="grid gap-sm">
            <input type="hidden" name="bookingId" value={booking.id} />
            <Button type="submit" variant="primary" full loading={pending}>
              Yes, cancel the booking
            </Button>
            <Button variant="secondary" full onClick={onClose}>
              Keep my booking
            </Button>
          </form>
        )
      }
    >
      {cancelled ? (
        <div className="text-center">
          <p className="flex items-center justify-center gap-xs text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
            <UiIcon name="verified" size={20} className="text-[var(--nf-state-success)]" />
            Booking cancelled
          </p>
          <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {booking.title} for {booking.dateRange} is cancelled. The dates are free again.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {booking.title}, {booking.dateRange}. This releases your dates and cannot be
            undone.
          </p>

          {state && !state.ok && (
            /* A cancellation that was refused is a failure, and it was drawn
               in the pending colour on a neutral surface, which is the same
               defect the wallet's own banner had. */
            <p
              role="alert"
              className="mt-row rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] bg-[var(--nf-state-error-surface)] p-row text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]"
            >
              {state.error}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

/**
 * The trigger and the sheet together, as one client island.
 *
 * `/bookings` lifts the open state to its list, because one sheet serves a
 * tab of cards and the card that opened it is already known. `/trips` renders
 * its spine on the server, so a row there cannot hold state; this is the small
 * island it drops in instead. Both end up at the same sheet above, which is
 * the whole point of the file.
 */
export function CancelBookingControl({
  booking,
  label = "Cancel",
}: {
  booking: BookingView;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${TYPE.caption} font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline`}
      >
        {label}
      </button>
      {open && <CancelBookingSheet booking={booking} onClose={() => setOpen(false)} />}
    </>
  );
}
