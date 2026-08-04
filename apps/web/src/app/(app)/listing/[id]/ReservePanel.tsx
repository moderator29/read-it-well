"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import { reserve, type ReserveReceipt } from "@/lib/bookings/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Toggle } from "@/components/app/account/Toggle";
import { addDaysIso, useStayDates } from "@/components/app/listing/StayDates";

/**
 * The reserve panel on a listing detail page.
 *
 * Native date inputs and a guest stepper feed a live kobo price breakdown,
 * then a server action that validates everything again and writes the booking
 * under RLS. Nights that are already booked or blocked arrive from the server
 * and are rejected inline the moment a clashing range is picked, before any
 * round trip. Success replaces the form with the confirmation moment; every
 * failure states what happened and what to do next.
 *
 * The dates themselves live in `StayDates`, one level up, because the sticky
 * bottom bar has to quote the same total this form is about to submit and the
 * panel renders twice on one page.
 */

const STAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function labelDate(iso: string): string {
  return STAY_LABEL.format(new Date(`${iso}T12:00:00Z`));
}

function Stepper({
  label,
  name,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[0.875rem] text-[var(--nf-content-secondary)]">{label}</span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="nf-icon-btn h-8 w-8 disabled:opacity-40"
        >
          <span aria-hidden="true" className="text-[1rem] leading-none">
            &minus;
          </span>
        </button>
        <span className="nf-numeric w-5 text-center text-[0.9375rem] font-semibold">{value}</span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="nf-icon-btn h-8 w-8 disabled:opacity-40"
        >
          <span aria-hidden="true" className="text-[1rem] leading-none">
            +
          </span>
        </button>
      </span>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

export function ReservePanel({
  listingId,
  currency,
  locale,
  instantBook,
  messageHref,
}: {
  listingId: string;
  currency: string;
  locale: Locale;
  instantBook: boolean;
  /** Deep link into the conversation about this listing, when one exists. */
  messageHref: string;
}) {
  // The panel renders twice on one page (inline on phones, sticky aside from
  // lg up), so input ids must be instance-unique.
  const uid = useId();
  const [state, formAction, pending] = useActionState<
    ActionResult<ReserveReceipt> | null,
    FormData
  >(reserve, null);

  /* Booking for somebody else. The three fields are not rendered at all until
     this is on, so an untouched form submits nothing about a third party and
     the server sees the absence rather than three empty strings.
     They are controlled rather than left to the DOM on purpose: React resets
     an uncontrolled field once a form action settles, so a refusal used to
     wipe all three and send the guest back to type a name and a phone number
     again to fix a date. */
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  /* Switching it off takes the third party with it. A change of mind must not
     leave a name half attached to a booking nobody meant to name. */
  const toggleForSomeoneElse = (next: boolean) => {
    setForSomeoneElse(next);
    if (!next) {
      setGuestName("");
      setGuestPhone("");
      setGuestEmail("");
    }
  };

  const stay = useStayDates();
  const {
    checkIn,
    checkOut,
    adults,
    children,
    capacity,
    setCheckIn,
    setCheckOut,
    setAdults,
    setChildren,
    today,
    priceMinor,
    nights,
    hint,
    ready,
    totalMinor,
  } = stay;

  const fieldError = (key: string): string | undefined =>
    state && !state.ok ? state.fieldErrors?.[key] : undefined;

  // ------------------------------------------------- the confirmation moment
  // A brief, choreographed beat rather than a flat state swap: the room
  // behind the card dims, the confirmed calendar tile pops in on its own
  // (CSS reacts to data-state="confirmed"), a band of light crosses the
  // card, then the details settle in. All transform/opacity, all under 1.4s,
  // and it collapses to the end state immediately under reduced motion.
  if (state?.ok) {
    const r = state.data;
    return (
      <div className="nf-card nf-confirm-sweep p-5" data-testid="reserve-success">
        <span aria-hidden="true" className="nf-confirm-dim" />
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="h-14 w-14 shrink-0">
            <BrandIcon name="calendar-check" state="confirmed" fill />
          </span>
          <p className="text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
            Booking requested
          </p>
        </div>
        <p className="nf-rise mt-2 text-center text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {labelDate(r.checkIn)} to {labelDate(r.checkOut)}, {r.nights}{" "}
          {r.nights === 1 ? "night" : "nights"} for {r.adults + r.children}{" "}
          {r.adults + r.children === 1 ? "guest" : "guests"}.
        </p>
        {r.arrivingName && (
          <p
            data-testid="reserve-arriving"
            className="nf-rise mt-1.5 text-center text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]"
          >
            {r.arrivingName} is the one arriving. We send them the details the moment the host
            confirms.
          </p>
        )}
        <dl className="nf-rise mt-3 space-y-1.5 border-t border-[var(--nf-border-subtle)] pt-3 text-[0.875rem]">
          {r.cleaningMinor > 0 && (
            <div className="flex items-center justify-between text-[var(--nf-content-secondary)]">
              <dt>Cleaning</dt>
              <dd className="nf-numeric">{formatMoney(r.cleaningMinor, locale, currency)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between font-semibold text-[var(--nf-content-primary)]">
            <dt>Total</dt>
            <dd className="nf-numeric">{formatMoney(r.totalMinor, locale, currency)}</dd>
          </div>
        </dl>
        <p className="nf-rise mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          {instantBook
            ? "Your dates are held. Paying now confirms the stay straight away."
            : "The agent will confirm your dates personally. You can pay now to secure them, and we will notify you the moment the agent confirms."}
        </p>
        {/* Paying is the primary act, so it is the primary button. Leaving this
            moment with only a link to a list was the one gap between reserving
            and paying: the guest had to go and find the pay button themselves. */}
        <Link
          href={`/checkout/${r.bookingId}`}
          className="nf-btn nf-btn--primary mt-4 w-full"
        >
          Pay {formatMoney(r.totalMinor, locale, currency)} for this stay
        </Link>
        <Link
          href={`/bookings?justBooked=${r.bookingId}`}
          className="nf-btn nf-btn--ghost mt-2 w-full"
        >
          Pay later, view your bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="nf-card p-5" data-testid="reserve-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="flex items-baseline gap-1.5">
          <span className="nf-numeric text-[1.5rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
            {formatMoney(priceMinor, locale, currency)}
          </span>
          <span className="text-[0.8125rem] text-[var(--nf-content-muted)]">/ night</span>
        </p>

        {instantBook && (
          <p className="flex items-center gap-1.5 text-[0.78rem] font-semibold text-[var(--nf-state-warning)]">
            <UiIcon name="sparkle" size={13} />
            Instant Book available
          </p>
        )}
      </div>

      <form action={formAction} noValidate className="mt-4">
        <input type="hidden" name="listingId" value={listingId} />

        {/* ------------------------------------------------------- dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-checkin`} className="nf-label">
              Check-in
            </label>
            <input
              id={`${uid}-checkin`}
              name="checkIn"
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              aria-invalid={hint || fieldError("checkIn") ? true : undefined}
              className="nf-field"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-checkout`} className="nf-label">
              Check-out
            </label>
            <input
              id={`${uid}-checkout`}
              name="checkOut"
              type="date"
              min={checkIn ? addDaysIso(checkIn, 1) : addDaysIso(today, 1)}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              aria-invalid={hint || fieldError("checkOut") ? true : undefined}
              className="nf-field"
            />
          </div>
        </div>
        {(hint || fieldError("checkIn") || fieldError("checkOut")) && (
          <p role="alert" className="mt-1.5 text-[0.78rem] text-[var(--nf-state-warning)]">
            {hint ?? fieldError("checkIn") ?? fieldError("checkOut")}
          </p>
        )}

        {/* ------------------------------------------------------ guests */}
        {/* The host's declared capacity is the ceiling, split live between the
            two steppers, so a party the agent would turn away at the gate can
            never be assembled here. The server checks it again against the
            listing row; this is the courtesy, not the guard. */}
        <div className="mt-3.5 space-y-2.5 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3.5">
          <Stepper
            label="Adults"
            name="adults"
            value={adults}
            min={1}
            max={capacity === null ? 16 : Math.max(1, capacity - children)}
            onChange={setAdults}
          />
          <Stepper
            label="Children"
            name="children"
            value={children}
            min={0}
            max={capacity === null ? 10 : Math.max(0, capacity - adults)}
            onChange={setChildren}
          />
          {capacity !== null && (
            <p className="border-t border-[var(--nf-border-subtle)] pt-2.5 text-[0.78rem] text-[var(--nf-content-muted)]">
              This place takes up to {capacity} {capacity === 1 ? "guest" : "guests"}.
            </p>
          )}
        </div>

        {/* -------------------------------------- the person arriving */}
        {/* The payer is often not the guest here: a sister in London books for
            a cousin flying into Lagos, and the arrival directions used to go
            to London. Naming somebody means giving a number the gate can ring,
            which is why the phone is required alongside the name and the email
            is not. */}
        <div className="mt-3.5 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] px-3.5 py-1">
          <Toggle
            checked={forSomeoneElse}
            onChange={toggleForSomeoneElse}
            label="Someone else is arriving"
            description="Booking this for a family member or a friend."
          />
        </div>

        {forSomeoneElse && (
          <div className="nf-rise mt-3 grid gap-3">
            <div>
              <label htmlFor={`${uid}-guest-name`} className="nf-label">
                Their full name
              </label>
              <input
                id={`${uid}-guest-name`}
                name="guestName"
                type="text"
                autoComplete="off"
                maxLength={80}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="As it appears on their ID"
                aria-invalid={fieldError("guestName") ? true : undefined}
                className="nf-field"
              />
              {fieldError("guestName") && (
                <p role="alert" className="mt-1.5 text-[0.78rem] text-[var(--nf-state-warning)]">
                  {fieldError("guestName")}
                </p>
              )}
            </div>
            <div>
              <label htmlFor={`${uid}-guest-phone`} className="nf-label">
                Their phone number
              </label>
              <input
                id={`${uid}-guest-phone`}
                name="guestPhone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={32}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="0803 123 4567"
                aria-describedby={`${uid}-guest-phone-hint`}
                aria-invalid={fieldError("guestPhone") ? true : undefined}
                className="nf-field"
              />
              <p
                id={`${uid}-guest-phone-hint`}
                className="mt-1.5 text-[0.78rem] text-[var(--nf-content-muted)]"
              >
                The estate gate rings this number when they arrive.
              </p>
              {fieldError("guestPhone") && (
                <p role="alert" className="mt-1.5 text-[0.78rem] text-[var(--nf-state-warning)]">
                  {fieldError("guestPhone")}
                </p>
              )}
            </div>
            <div>
              <label htmlFor={`${uid}-guest-email`} className="nf-label">
                Their email address, if you have it
              </label>
              <input
                id={`${uid}-guest-email`}
                name="guestEmail"
                type="email"
                autoComplete="off"
                maxLength={160}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Optional"
                aria-describedby={`${uid}-guest-email-hint`}
                aria-invalid={fieldError("guestEmail") ? true : undefined}
                className="nf-field"
              />
              <p
                id={`${uid}-guest-email-hint`}
                className="mt-1.5 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]"
              >
                We send them the dates and how to get through the gate once the host confirms.
                Leave it blank and it all comes to you to pass on.
              </p>
              {fieldError("guestEmail") && (
                <p role="alert" className="mt-1.5 text-[0.78rem] text-[var(--nf-state-warning)]">
                  {fieldError("guestEmail")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------- price breakdown */}
        {ready && (
          <dl className="mt-3.5 space-y-1.5 border-t border-[var(--nf-border-subtle)] pt-3.5 text-[0.875rem]">
            <div className="flex items-center justify-between text-[var(--nf-content-secondary)]">
              <dt>
                {formatMoney(priceMinor, locale, currency)} &times; {nights}{" "}
                {nights === 1 ? "night" : "nights"}
              </dt>
              <dd className="nf-numeric">{formatMoney(totalMinor, locale, currency)}</dd>
            </div>
            <div className="flex items-center justify-between font-semibold text-[var(--nf-content-primary)]">
              <dt>Total</dt>
              <dd className="nf-numeric">{formatMoney(totalMinor, locale, currency)}</dd>
            </div>
          </dl>
        )}

        {/* ---------------------------------------------------- failures */}
        {state && !state.ok && (
          <div
            role="alert"
            className="mt-3.5 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[color-mix(in_oklab,var(--nf-state-warning)_12%,transparent)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
          >
            {state.error}
            {state.error.startsWith("Sign in") && (
              <Link
                href="/sign-in"
                className="mt-1 block font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            )}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          <button
            type="submit"
            disabled={pending || !ready}
            className="nf-btn nf-btn--primary w-full disabled:opacity-60"
          >
            {pending ? "Reserving your dates..." : "Reserve"}
          </button>
          <Link href={messageHref} className="nf-btn nf-btn--glass w-full">
            Message agent
          </Link>
        </div>
      </form>

      <p className="mt-3.5 flex items-start gap-1.5 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
        <UiIcon name="verified" size={14} className="mt-0.5 shrink-0 text-[var(--nf-state-success)]" />
        Pay only after you have inspected the property
      </p>
    </div>
  );
}
