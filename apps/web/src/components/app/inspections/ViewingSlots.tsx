"use client";

import { useState, useTransition } from "react";
import { formatDate, type Dictionary, type Locale } from "@vallo/i18n/core";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { bookViewingSlot } from "@/lib/viewings/actions";
import { slotsByDay, type Slot } from "@/lib/viewings/route";

/**
 * V-94: PICK A VIEWING TIME. The lister's free slots, by day; one tap chooses
 * a time and one more books it, CONFIRMED, with no back and forth. Every
 * state is drawn: choosing, booking, booked (with the way to Plans), and each
 * refusal in its own words (taken, already booked, failed). The page draws
 * this only when the listing has free slots.
 */

type Copy = Dictionary["frontDoor"]["viewings"];

function when(iso: string, locale: Locale, withDay: boolean): string {
  return formatDate(new Date(iso), locale, {
    ...(withDay ? { weekday: "short", day: "numeric", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

function dayLabel(day: string, locale: Locale): string {
  return formatDate(new Date(`${day}T12:00:00+01:00`), locale, { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });
}

export function ViewingSlots({ listingId, slots, copy, locale }: { listingId: string; slots: Slot[]; copy: Copy; locale: Locale }) {
  const days = slotsByDay(slots);
  const [day, setDay] = useState(days[0]?.day ?? "");
  const [chosen, setChosen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ at: string; id: string } | null>(null);
  const [pending, start] = useTransition();
  const current = days.find((d) => d.day === day) ?? days[0];

  if (booked) {
    return (
      <section className="nf-panel nf-panel--card p-card-sm" data-testid="viewing-booked" aria-live="polite">
        <p className="nf-body-sm text-[var(--nf-content-primary)]">{copy.booked.replace("{when}", when(booked.at, locale, true))}</p>
        {/* Straight to the booked viewing's own card, not the top of Plans. */}
        <ButtonLink
          href={`/bookings?kind=inspection&from=property&changed=${booked.id}#ix-${booked.id}`}
          variant="secondary"
          full
          className="mt-row"
        >
          {copy.openPlans}
        </ButtonLink>
      </section>
    );
  }

  return (
    <section className="nf-panel nf-panel--card p-card-sm" data-testid="viewing-slots" aria-live="polite">
      <h2 className="nf-body font-semibold text-[var(--nf-content-primary)]">{copy.pickTitle}</h2>
      <p className="mt-inline nf-caption text-[var(--nf-content-muted)]">{copy.pickNote}</p>
      <nav aria-label={copy.pickTitle} className="mt-row">
        <ChipRow bleed={false}>
          {days.map((d) => (
            <Chip key={d.day} size="sm" selected={d.day === current?.day} onSelectedChange={() => { setDay(d.day); setChosen(null); }}>
              {dayLabel(d.day, locale)}
            </Chip>
          ))}
        </ChipRow>
      </nav>
      <div className="mt-row flex flex-wrap gap-xs" role="radiogroup" aria-label={copy.pickTitle}>
        {current?.slots.map((slot) => (
          <Chip
            key={slot.slotAt}
            size="sm"
            behaviour="choice"
            selected={chosen === slot.slotAt}
            onSelectedChange={() => setChosen(slot.slotAt)}
            data-testid="viewing-slot"
          >
            {when(slot.slotAt, locale, false)}
          </Chip>
        ))}
      </div>
      {chosen && (
        <div className="mt-row flex flex-col gap-row">
          <input
            className="nf-field"
            value={note}
            maxLength={400}
            onChange={(e) => setNote(e.target.value)}
            placeholder={copy.notePlaceholder}
            aria-label={copy.notePlaceholder}
          />
          <Button
            variant="primary"
            full
            loading={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const result = await bookViewingSlot({ listingId, slotAt: chosen, note });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setBooked({ at: chosen, id: result.data.id });
              });
            }}
          >
            {pending ? copy.booking : copy.book.replace("{time}", when(chosen, locale, true))}
          </Button>
        </div>
      )}
      {error && (
        <p className="mt-inline nf-body-sm font-medium text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
