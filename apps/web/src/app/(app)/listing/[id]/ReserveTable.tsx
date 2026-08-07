"use client";

import { useActionState, useId, useMemo, useState } from "react";
import Link from "next/link";
import { reserveTable } from "@/lib/reservations/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import { MAX_PARTY } from "@/lib/reservations/schema";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Asking a restaurant to hold a table.
 *
 * Three questions and nothing else: when, how many, and anything they should
 * know. A restaurant reservation is not a stay, and the temptation to reuse the
 * stay panel is exactly what this avoids. That panel asks for a date RANGE, a
 * guest count against a bed capacity and a per-night total, and every one of
 * those is the wrong question about dinner.
 *
 * ## What it will not pretend
 *
 * Sending this does NOT hold a table. It asks. The restaurant is a person who
 * has to look at their own book and answer, so the button says what it does and
 * the receipt says the request is with them. A form that said "Table booked"
 * and then produced somebody standing at a door with no table would be the
 * worst thing on this platform, and it is the exact failure the whole
 * PENDING status exists to prevent.
 *
 * ## The date and time are Lagos, not the phone's
 *
 * Both are sent as plain strings and turned into an instant server-side against
 * a fixed +01:00. Somebody picking "Friday 7pm" means seven in the evening
 * where the restaurant is, whatever their device believes about its own
 * timezone, and a diaspora guest booking dinner for their family should not
 * book it for two in the morning.
 */

/** ISO date `offset` days from today, read in Lagos rather than in the device. */
function lagosDayIso(offset: number): string {
  const now = new Date();
  const lagos = new Date(now.getTime() + offset * 86_400_000 + 60 * 60 * 1_000);
  return lagos.toISOString().slice(0, 10);
}

/** The times people actually book, rather than a free clock. */
const SLOTS = [
  "12:00", "12:30", "13:00", "13:30", "14:00",
  "17:00", "17:30", "18:00", "18:30", "19:00",
  "19:30", "20:00", "20:30", "21:00", "21:30",
];

/** "Today", "Tomorrow", then a short weekday. Anchored at midday, see below. */
function dayLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Today";
  if (iso === lagosDayIso(1)) return "Tomorrow";
  /* Midday rather than midnight, because `new Date("2026-08-09")` parses as
     UTC and renders as the previous day for anybody west of Greenwich. A
     booking form that labels tomorrow as today is worse than a raw date. */
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
  });
}

export function ReserveTable({
  listingId,
  messageHref,
}: {
  listingId: string;
  messageHref: string;
}) {
  const todayIso = lagosDayIso(0);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => lagosDayIso(i)), []);

  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState("19:00");
  const [party, setParty] = useState(2);

  const dateId = useId();
  const timeId = useId();
  const partyId = useId();
  const noteId = useId();

  const [state, formAction, pending] = useActionState<
    ActionResult<{ reservationId: string; status: "PENDING" }> | null,
    FormData
  >(reserveTable, null);

  if (state?.ok) {
    return (
      <div className="nf-card p-5">
        <p className="flex items-center gap-2 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
          <UiIcon name="chat-bubble" size={20} className="shrink-0 opacity-80" aria-hidden />
          Request sent
        </p>
        {/* Deliberately not "Table booked". Nothing is held until a person at
            the restaurant says so, and a receipt that claimed otherwise would
            put somebody at a door with no table. */}
        <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          The restaurant has your request for {party} on {dayLabel(date, todayIso)} at{" "}
          {time}. They will confirm or decline it, and you will see the answer in
          your bookings.
        </p>
        <Link
          href="/bookings"
          className="mt-4 inline-flex text-[0.875rem] font-semibold text-[var(--nf-content-primary)] underline underline-offset-4"
        >
          See your bookings
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="nf-card p-5">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />

      <p className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">
        Book a table
      </p>

      <div className="mt-4">
        <span className="nf-label" id={dateId}>
          Day
        </span>
        <div
          role="group"
          aria-labelledby={dateId}
          className="-mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1"
        >
          {days.map((iso) => {
            const active = iso === date;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setDate(iso)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] transition-colors ${
                  active
                    ? "bg-[var(--nf-brand-primary)] font-semibold text-[var(--nf-content-on-brand)]"
                    : "border border-[var(--nf-border-subtle)] text-[var(--nf-content-secondary)]"
                }`}
              >
                {dayLabel(iso, todayIso)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className="nf-label" id={timeId}>
          Time
        </span>
        <div
          role="group"
          aria-labelledby={timeId}
          className="-mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1"
        >
          {SLOTS.map((slot) => {
            const active = slot === time;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setTime(slot)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] tabular-nums transition-colors ${
                  active
                    ? "bg-[var(--nf-brand-primary)] font-semibold text-[var(--nf-content-on-brand)]"
                    : "border border-[var(--nf-border-subtle)] text-[var(--nf-content-secondary)]"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <label className="nf-label" htmlFor={partyId}>
          Guests
        </label>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setParty((n) => Math.max(1, n - 1))}
            aria-label="One fewer guest"
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--nf-border-subtle)] text-[var(--nf-content-secondary)] disabled:opacity-40"
            disabled={party <= 1}
          >
            <UiIcon name="minus" size={16} aria-hidden />
          </button>
          <input
            id={partyId}
            name="partySize"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_PARTY}
            value={party}
            onChange={(event) => {
              const next = Number(event.target.value);
              setParty(Number.isFinite(next) ? Math.min(MAX_PARTY, Math.max(1, next)) : 1);
            }}
            className="w-16 rounded-lg border border-[var(--nf-border-subtle)] bg-transparent px-2 py-1.5 text-center text-[0.9375rem] tabular-nums text-[var(--nf-content-primary)]"
          />
          <button
            type="button"
            onClick={() => setParty((n) => Math.min(MAX_PARTY, n + 1))}
            aria-label="One more guest"
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--nf-border-subtle)] text-[var(--nf-content-secondary)] disabled:opacity-40"
            disabled={party >= MAX_PARTY}
          >
            <UiIcon name="plus" size={16} aria-hidden />
          </button>
        </div>
        {/* Said before somebody counts to fifty and is refused, rather than
            after. The database enforces the same number. */}
        {party >= MAX_PARTY && (
          <p className="mt-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">
            For a larger party,{" "}
            <Link href={messageHref} className="underline underline-offset-2">
              message the restaurant
            </Link>
            .
          </p>
        )}
      </div>

      <div className="mt-4">
        <label className="nf-label" htmlFor={noteId}>
          Anything they should know
        </label>
        <textarea
          id={noteId}
          name="note"
          rows={2}
          maxLength={500}
          placeholder="A birthday, a wheelchair, an allergy"
          className="mt-1.5 w-full rounded-lg border border-[var(--nf-border-subtle)] bg-transparent px-3 py-2 text-[0.875rem] text-[var(--nf-content-primary)] placeholder:text-[var(--nf-content-muted)]"
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="mt-3 text-[0.8125rem] text-[var(--nf-state-error)]">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" full className="mt-4" disabled={pending}>
        {pending ? "Sending" : "Request a table"}
      </Button>

      {/* The promise, kept small and directly under the button that makes it.
          Nothing is held until the restaurant answers. */}
      <p className="mt-2 text-center text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        The restaurant confirms it. Nothing is held until they do.
      </p>
    </form>
  );
}
