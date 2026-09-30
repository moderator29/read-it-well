"use client";

import { useState, useTransition } from "react";
import { Quantity } from "@/components/ui/Quantity";
import { useRouter } from "next/navigation";
import { countOf, formatMoney, type Locale } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { setNightPrice, setNightsClosed, setNightsRooms } from "@/lib/host/calendar-actions";
import {
  bookedFloor,
  describeSelection,
  nairaToMinor,
  type CalendarRoom,
  type NightCell,
  type RatePlanLite,
} from "@/lib/host/rate-calendar";

/**
 * WHAT A HOST CAN DO TO THE NIGHTS THEY SELECTED: price them, put a number
 * of rooms on sale, close them or open them again. The panel beside the
 * month on a desk, the sheet on a phone. Every button is one server action
 * (`lib/host/calendar-actions.ts`) that writes the host's input and prices
 * nothing.
 *
 * THE FLOOR IS SAID BEFORE ANYBODY TAPS: the fewest rooms a run may be left
 * with is what is already held on its busiest night, because the database
 * refuses less, and a refusal after the tap is a worse way to learn it.
 */
export function SelectionPanel({
  room,
  plan,
  dates,
  cells,
  locale,
  onDone,
  onClear,
}: {
  room: CalendarRoom;
  plan: RatePlanLite | null;
  dates: string[];
  cells: NightCell[];
  locale: Locale;
  onDone: (message: string) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [price, setPrice] = useState("");
  const floor = bookedFloor(cells);
  const openNow = cells.map((c) => c.unitsOpen ?? 0);
  const [units, setUnits] = useState(() => (openNow.length ? Math.max(...openNow, floor) : room.unitsTotal));
  const [error, setError] = useState<string | null>(null);

  if (dates.length === 0) {
    return (
      <div className="nf-rcal-panel nf-rcal-panel--empty">
        <span className="nf-rcal-panel__icon" aria-hidden="true">
          <UiIcon name="calendar-check" size={20} />
        </span>
        <p className="nf-rcal-panel__title">Select nights to change them</p>
        <p className="nf-caption">
          Tap a night, then tap another to take in the run between. Drag across nights with a mouse, or hold a
          night for a moment and drag with a finger.
        </p>
      </div>
    );
  }

  const prices = cells.map((c) => c.priceMinor).filter((p): p is number => p !== null);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  const overrides = cells.some((c) => c.overrideMinor !== null);
  const closed = cells.some((c) => c.closed);
  const allClosed = cells.length > 0 && cells.every((c) => c.closed);
  const nights = countOf(dates.length, "nights", locale);
  const priceMinor = nairaToMinor(price);

  const run = (
    act: () => Promise<{ ok: true; data: { nights: number; heldBack?: number } } | { ok: false; error: string }>,
    word: (n: number, extra?: { heldBack?: number }) => string,
  ) =>
    start(async () => {
      setError(null);
      const result = await act();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone(word(result.data.nights, result.data));
      router.refresh();
    });

  const count = (n: number) => countOf(n, "nights", locale);

  return (
    <div className="nf-rcal-panel" data-testid="rate-calendar-panel">
      <div className="nf-rcal-panel__head">
        <div className="min-w-0">
          <p className="nf-rcal-panel__title">{nights}</p>
          <p className="nf-caption">{describeSelection(dates)}</p>
        </div>
        <Button variant="quiet" size="sm" onClick={onClear} disabled={pending}>
          Clear
        </Button>
      </div>

      <dl className="nf-rcal-panel__facts">
        <div>
          <dt>A night now</dt>
          <dd className="nf-numeric">
            {low === null ? "No rate" : low === high ? formatMoney(low, locale) : `${formatMoney(low, locale)} to ${formatMoney(high ?? low, locale)}`}
          </dd>
        </div>
        {cells.some((c) => c.held > 0) ? (
          <div>
            <dt>Held by other sites</dt>
            <dd className="nf-numeric">
              {(() => {
                const top = cells.reduce((best, c) => (c.held > best.held ? c : best), cells[0]!);
                return `Up to ${top.held} a night${top.imported ? `, ${top.imported}` : ""}`;
              })()}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Already booked</dt>
          <dd className="nf-numeric">{floor === 0 ? "None" : `Up to ${floor} a night`}</dd>
        </div>
      </dl>

      {plan ? (
        <section className="nf-rcal-panel__block" aria-label="Price">
          <h3 className="nf-section-label">Price a night</h3>
          <div className="nf-rcal-panel__row">
            <TextField
              label={`Price for ${nights}`}
              hideLabel
              inputMode="decimal"
              placeholder={formatMoney(plan.rateMinor, locale)}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={pending}
              leadingIcon="banknote"
            />
            <Button
              variant="primary"
              size="md"
              disabled={pending || priceMinor === null || priceMinor < 100}
              loading={pending}
              onClick={() =>
                run(
                  () => setNightPrice({ roomTypeId: room.id, ratePlanId: plan.id, dates, rateMinor: priceMinor }),
                  (n) => `${count(n)} now ${formatMoney(priceMinor ?? 0, locale)} on ${plan.name}.`,
                )
              }
            >
              Set price
            </Button>
          </div>
          {overrides ? (
            <Button
              variant="quiet"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => setNightPrice({ roomTypeId: room.id, ratePlanId: plan.id, dates, rateMinor: null }),
                  (n) => `${count(n)} back on the rate, ${formatMoney(plan.rateMinor, locale)}.`,
                )
              }
            >
              {`Back to the rate, ${formatMoney(plan.rateMinor, locale)}`}
            </Button>
          ) : null}
        </section>
      ) : null}

      <section className="nf-rcal-panel__block" aria-label="Rooms on sale">
        <h3 className="nf-section-label">Rooms on sale</h3>
        <div className="nf-rcal-panel__row">
          <span className="inline-flex items-center gap-2xs">
            <Quantity
              value={units}
              min={floor}
              max={room.unitsTotal}
              label="Rooms on sale each night"
              decreaseLabel="One fewer"
              increaseLabel="One more"
              disabled={pending}
              onChange={setUnits}
            />
            <span className="nf-caption nf-numeric text-[var(--nf-content-muted)]">of {room.unitsTotal}</span>
          </span>
          <Button
            variant="secondary"
            size="md"
            disabled={pending}
            onClick={() =>
              run(
                () => setNightsRooms({ roomTypeId: room.id, dates, unitsOpen: units }),
                (n, extra) =>
                  units === 0
                    ? `No rooms on sale for ${count(n)}.`
                    : `${units} on sale for ${count(n)}.${extra?.heldBack ? ` On ${count(extra.heldBack)}, fewer: another site holds a room there.` : ""}`,
              )
            }
          >
            Set rooms
          </Button>
        </div>
        {floor > 0 ? (
          <p className="nf-caption">At least {floor}, because that many are already booked on one of these nights.</p>
        ) : null}
      </section>

      <section className="nf-rcal-panel__block" aria-label="Open or close">
        <h3 className="nf-section-label">Open or close</h3>
        <div className="nf-rcal-panel__row nf-rcal-panel__row--split">
          {!allClosed ? (
            <Button
              variant="dangerQuiet"
              size="md"
              leadingIcon="lock"
              disabled={pending || !plan}
              onClick={() =>
                run(() => setNightsClosed({ roomTypeId: room.id, dates, closed: true }), (n) => `${count(n)} closed. Guests cannot ask for them.`)
              }
            >
              Close
            </Button>
          ) : null}
          {closed ? (
            <Button
              variant="secondary"
              size="md"
              disabled={pending}
              onClick={() =>
                run(() => setNightsClosed({ roomTypeId: room.id, dates, closed: false }), (n) => `${count(n)} open again.`)
              }
            >
              Reopen
            </Button>
          ) : null}
        </div>
        <p className="nf-caption">Closing stops new requests. A stay already asked for or booked is kept.</p>
        {cells.some((c) => c.held > 0) ? (
          <p className="nf-caption">
            Rooms held by another site stay off sale here whatever you set, and come back when that booking leaves its
            calendar.
          </p>
        ) : null}
      </section>

      {error ? (
        <p className="nf-rcal-panel__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
