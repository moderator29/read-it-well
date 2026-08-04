"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancel } from "@/lib/bookings/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import type { BookingGroups, BookingView } from "@/lib/bookings/queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";

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

const STATUS_BADGE: Record<BookingView["status"], { label: string; className: string }> = {
  PENDING: { label: "Awaiting confirmation", className: "nf-badge--pending" },
  CONFIRMED: { label: "Confirmed", className: "nf-badge--approved" },
  CANCELLED: { label: "Cancelled", className: "" },
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
  const badge = STATUS_BADGE[b.status];
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
          <span className={`nf-badge ${badge.className}`}>{badge.label}</span>
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
 * Full-page confirm sheet for cancelling a stay. Portalled to body so the
 * glass card's backdrop-filter cannot become its containing block, focused on
 * open, closed by Escape and the backdrop. On success the router refreshes
 * and the server-rendered list becomes the single source of truth.
 */
function CancelSheet({ booking, onClose }: { booking: BookingView; onClose: () => void }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    cancel,
    null,
  );

  useOverlay({ open: true, onClose, panelRef, autoFocus: false });

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        tabIndex={-1}
        className="nf-rise relative w-full rounded-t-3xl border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] p-5 shadow-[var(--nf-shadow-float)] outline-none sm:max-w-md sm:rounded-3xl"
      >
        {state?.ok ? (
          <div className="text-center">
            <p className="flex items-center justify-center gap-2 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
              <UiIcon name="verified" size={20} className="text-[var(--nf-state-success)]" />
              Booking cancelled
            </p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {booking.title} for {booking.dateRange} is cancelled. The dates are free again.
            </p>
            <Button variant="primary" full className="mt-4" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <h2 id="cancel-booking-title" className="nf-h3">
              Cancel this booking?
            </h2>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
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

            <form action={formAction} className="mt-4 grid gap-3">
              <input type="hidden" name="bookingId" value={booking.id} />
              <Button type="submit" variant="primary" full loading={pending}>
                Yes, cancel the booking
              </Button>
              <Button variant="secondary" full onClick={onClose}>
                Keep my booking
              </Button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const index = TABS.findIndex((t) => t.key === active);
  const current = TABS[index] ?? TABS[0]!;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight" ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    const target = TABS[next];
    if (!target) return;
    setActive(target.key);
    tabRefs.current[next]?.focus();
  };

  const bookings = groups[current.key];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Booking status"
        onKeyDown={onKeyDown}
        className="relative grid grid-cols-3 border-b border-[var(--nf-border-subtle)]"
      >
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`bookings-tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls={`bookings-panel-${tab.key}`}
            tabIndex={active === tab.key ? 0 : -1}
            onClick={() => setActive(tab.key)}
            className={[
              "min-h-11 py-2.5 text-[0.875rem] font-medium transition-colors",
              active === tab.key
                ? "text-[var(--nf-content-primary)]"
                : "text-[var(--nf-content-muted)] hover:text-[var(--nf-content-secondary)]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
        <span
          aria-hidden="true"
          className="absolute -bottom-px left-0 h-[2px] w-1/3 rounded-full bg-[var(--nf-brand-primary)] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
      </div>

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
