"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancel } from "@/lib/bookings/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import type { BookingGroups, BookingView } from "@/lib/bookings/queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";

/**
 * The signed-in trips hub: the user's real bookings from the platform,
 * grouped into Upcoming, Completed and Cancelled, with a confirm sheet on
 * every stay that can still be called off. Cancelling goes through the
 * server action, then the router refreshes so the list re-renders from the
 * database, never from optimistic guesswork.
 */

type TabKey = "upcoming" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const EMPTY_COPY: Record<TabKey, string> = {
  upcoming: "No upcoming trips yet. Your next adventure starts with a search.",
  completed: "Stays you have completed will appear here after checkout.",
  cancelled: "Cancelled bookings are kept here so nothing gets lost.",
};

/**
 * The words only. The colour is no longer decided here.
 *
 * This was a `nf-badge--*` map, and its CANCELLED branch returned an EMPTY
 * class - `.nf-badge` alone paints no fill and no colour, so a cancelled stay
 * rendered an invisible pill where the cancellation notice should have been.
 * `toneForStatus` is the platform's one status vocabulary, so the same word is
 * the same colour here, in the agent's queue and on the wallet ledger.
 */
const STATUS_LABEL: Record<BookingView["status"], string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

function BookingCard({
  booking: b,
  onCancel,
  justBooked,
}: {
  booking: BookingView;
  onCancel: (booking: BookingView) => void;
  /** True for the reservation that just landed here from the listing page,
      so the confirmation moment finishes on this card rather than stopping
      at the listing. */
  justBooked?: boolean;
}) {
  return (
    <li
      className={`nf-card overflow-hidden p-0 text-left ${justBooked ? "nf-confirm-sweep nf-just-booked" : ""}`}
    >
      <div className="flex gap-4.5 p-3.5 sm:gap-4 sm:p-4">
        <Link
          href={`/listing/${b.listingId}`}
          aria-label={b.title}
          className="relative block h-[5.75rem] w-[5.75rem] shrink-0 overflow-hidden rounded-[var(--nf-radius-md)] sm:h-24 sm:w-32"
          style={{ background: "linear-gradient(150deg, #1E3A8A 0%, #172554 100%)" }}
        >
          {b.photo && <Image src={b.photo} alt="" fill sizes="128px" className="object-cover" />}
        </Link>

        <div className="min-w-0 flex-1 leading-tight">
          {/* The badge sits ABOVE the title rather than beside it. Sharing the
              row left the title 90px on a 390px phone, which rendered "Lekki
              Palm Grove Shortlet" as "Lekki Pa". The name of the stay is the
              whole point of the card. */}
          <StatusPill tone={toneForStatus(b.status)}>{STATUS_LABEL[b.status]}</StatusPill>
          <h3 className="mt-1.5 text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
            {b.title}
          </h3>

          {/* Wraps rather than clipping: "Marina Waterfront, Calabar" was one
              pixel over its column and arrived as "Calaba". */}
          {(b.area || b.city) && (
            <p className="mt-1 flex items-start gap-1.5 text-[0.78rem] text-[var(--nf-content-muted)]">
              <UiIcon name="location" size={12} className="mt-0.5 shrink-0" />
              <span>{[b.area, b.city].filter(Boolean).join(", ")}</span>
            </p>
          )}

          <p className="mt-2.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]">
            <UiIcon name="calendar-booking" size={16} className="shrink-0" />
            {b.dateRange}
          </p>

          <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
            <UiIcon name="user" size={16} className="shrink-0" />
            {b.guests} {b.guests === 1 ? "guest" : "guests"} &middot; {b.nights}{" "}
            {b.nights === 1 ? "night" : "nights"}
          </p>

          {/* Booked for somebody else. The payer needs to see who they named,
              because it decides where the arrival details land, and a number
              they typed a month ago is worth being able to check. */}
          {b.arrivingName && (
            <p
              data-testid="booking-arriving"
              className="mt-1.5 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]"
            >
              Arriving: {b.arrivingName}
              {b.arrivingPhone && (
                <>
                  {" "}
                  &middot; <span className="nf-numeric">{b.arrivingPhone}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--nf-border-subtle)] px-3.5 py-3 sm:px-4">
        <p className="flex items-baseline gap-1.5">
          <span className="nf-numeric text-[0.9375rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {b.totalDisplay}
          </span>
          <span className="text-[0.75rem] text-[var(--nf-content-muted)]">total</span>
        </p>
        <span className="flex items-center gap-4">
          {/* A PENDING stay is reserved, not paid. Until this link existed the
              guest had nowhere to complete it, which is exactly the gap
              checkout closes. */}
          {b.status === "PENDING" && (
            <ButtonLink href={`/checkout/${b.id}`} variant="primary" size="sm">
              Pay now
            </ButtonLink>
          )}
          {b.cancellable && (
            <button
              type="button"
              onClick={() => onCancel(b)}
              className="text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              Cancel
            </button>
          )}
          {/* A finished stay is the only place a review can be written, and the
              control only appears when the database would actually accept one.
              Once written, it becomes a way back to what they said rather than
              an invitation to say it twice. */}
          {b.reviewable && (
            <Link
              href={`/bookings/${b.id}/review`}
              className="nf-btn nf-btn--primary px-3 py-1.5 text-[0.8125rem]"
            >
              Leave a review
            </Link>
          )}
          {b.reviewed && (
            <Link
              href={`/bookings/${b.id}/review`}
              className="flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              <UiIcon name="star" size={16} className="text-[var(--nf-rating)]" />
              Your review
            </Link>
          )}
          <Link
            href={`/listing/${b.listingId}`}
            className="flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
          >
            View details
            <UiIcon name="arrow-right" size={16} />
          </Link>
        </span>
      </div>
    </li>
  );
}

/**
 * Confirm sheet for cancelling a stay. `<Sheet>` owns the portal, the drag
 * handle, the detents, the focus trap, focus restoration, Escape, the backdrop
 * and the body scroll lock. What is left here is the decision: the server
 * action, the refusal, and the success state. On success the router refreshes
 * and the server-rendered list becomes the single source of truth.
 */
function CancelSheet({ booking, onClose }: { booking: BookingView; onClose: () => void }) {
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
      /* The success state speaks for itself, exactly as before; the title stays
         on as the sheet's accessible name. */
      hideTitle={cancelled}
      footer={
        cancelled ? (
          <Button variant="primary" full onClick={onClose}>
            Done
          </Button>
        ) : (
          <form action={formAction} className="grid gap-3">
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
          <p className="flex items-center justify-center gap-2 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
            <UiIcon name="verified" size={20} className="text-[var(--nf-state-success)]" />
            Booking cancelled
          </p>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {booking.title} for {booking.dateRange} is cancelled. The dates are free again.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {booking.title}, {booking.dateRange}. This releases your dates and cannot be
            undone.
          </p>

          {state && !state.ok && (
            <p
              role="alert"
              className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
            >
              {state.error}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

export function MyBookings({
  groups,
  justBookedId,
}: {
  groups: BookingGroups;
  /** Id of a reservation that just landed here from the listing page's
      confirmation moment, carried across the navigation as `?justBooked=`. */
  justBookedId?: string;
}) {
  const [active, setActive] = useState<TabKey>("upcoming");
  const [cancelling, setCancelling] = useState<BookingView | null>(null);

  const index = TABS.findIndex((t) => t.key === active);
  const current = TABS[index] ?? TABS[0]!;

  const bookings = groups[current.key];

  return (
    <div>
      {/*
        Was a hand-rolled tablist: three equal columns with a 2px underline slid
        by `translateX(index * 100%)`, which only tracked because the grid forced
        every label to exactly a third. The primitive measures the real segment
        boxes, so the four locales - where "Cancelled" can be three times longer
        than "Past" - all land correctly, and it owns the roving tabindex and the
        arrow keys that were re-derived here.

        No `panelIdPrefix`, deliberately. It would put `aria-controls` on ALL
        THREE tabs, but only the selected panel is ever rendered, so two of the
        three pointed at ids that are not in the document - a dangling reference
        a screen reader follows into nothing. The association is stated the one
        way that is always true: the live panel names its own tab with
        `aria-labelledby`.
      */}
      <Segmented<TabKey>
        label="Booking status"
        options={TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
        value={active}
        onChange={setActive}
        itemIdPrefix="bookings-tab"
        full
      />

      {bookings.length > 0 ? (
        <ul
          key={current.key}
          role="tabpanel"
          id={`bookings-panel-${current.key}`}
          aria-labelledby={`bookings-tab-${current.key}`}
          className="nf-rise grid gap-4 pt-4"
        >
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={setCancelling}
              justBooked={b.id === justBookedId}
            />
          ))}
        </ul>
      ) : (
        <div
          key={current.key}
          role="tabpanel"
          id={`bookings-panel-${current.key}`}
          aria-labelledby={`bookings-tab-${current.key}`}
          className="nf-rise flex flex-col items-center gap-4 py-10 text-center sm:py-14"
        >
          <span className="block h-20 w-20">
            <BrandIcon name="calendar-check" fill />
          </span>
          <p className="mx-auto max-w-[38ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {EMPTY_COPY[current.key]}
          </p>
          <ButtonLink href="/search" variant="primary">
            Explore stays
          </ButtonLink>
        </div>
      )}

      {cancelling && <CancelSheet booking={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}
