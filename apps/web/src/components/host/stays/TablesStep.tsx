"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { setOpeningHoursDraft } from "@/lib/host/actions";
import {
  SITTING_DURATIONS,
  TABLE_SIZES,
  WEEK_FROM_MONDAY,
  clockLabel,
  closingTimes,
  coversFrom,
  halfHours,
  windowLabel,
  type TableInventory,
} from "@/lib/host/stays-setup";
import { StaysCountRow, StaysNote, StaysPlate, StaysRow } from "./StaysParts";
import type { StaysStepProps } from "./types";
import { countOf } from "@vallo/i18n/core";

/**
 * TABLES AND HOURS. `GOVERNING-11` screen four.
 *
 * WHAT WAS THERE. One "service window" form: a weekday select, three time
 * inputs, a covers box, and a button that added one row. Setting a whole week
 * meant filling that form seven times, and there was no way to see what had
 * been added or to close on a Sunday you had opened by mistake. The render
 * draws the week, so this writes the week.
 *
 * THE SWITCHES DELETE AS WELL AS ADD, which is why `setOpeningHoursDraft`
 * replaces the set rather than appending to it. A switch that can only ever
 * turn on is not a switch.
 *
 * THE TABLE STEPPERS ARE HOW THE COVERS ARE COUNTED, AND THE COVERS ARE WHAT
 * IS SAVED. `service_windows.covers` is the only seating number this database
 * holds and the number every reservation is checked against. This database has
 * no table of tables, so the four steppers are an input method and the total
 * is printed under them in words, so that nobody has to trust an arithmetic
 * they cannot see and nobody is told a breakdown is kept that is not.
 *
 * THE SITTING DURATION IS DRAWN AND IS NOT SAVED, and the panel says exactly
 * that rather than saving it somewhere it would never be read from. There is
 * no column for it, nothing in the reservation path reads one, and a control
 * that silently discards its value is the defect this build has spent the week
 * removing. It is drawn because the render draws it and because the question
 * is the right one to ask next; it is inert because the honest alternative to
 * an inert control is a lying one.
 */
/** One row of the week, as the screen holds it while it is being edited. */
type DayRow = { weekday: number; label: string; on: boolean; opens: string; closes: string };

export function TablesStep({ draft, pending, run, setNotice, advance, locale }: StaysStepProps) {
  /*
   * THE WEEK IS AN ARRAY IN THE DRAWN ORDER AND NOT A MAP KEYED BY WEEKDAY.
   * `WEEK_FROM_MONDAY` already carries the order the render lists and the
   * number the column stores, so carrying both on each row means no lookup can
   * miss and no index can come back undefined.
   */
  const [days, setDays] = useState<DayRow[]>(() => {
    const saved = new Map(draft.serviceWindows.map((window) => [window.weekday, window]));
    return WEEK_FROM_MONDAY.map((day) => {
      const row = saved.get(day.weekday);
      return row
        ? { ...day, on: true, opens: row.opens, closes: row.closes }
        : { ...day, on: false, opens: "08:00", closes: "23:00" };
    });
  });
  const [tables, setTables] = useState<TableInventory>({});
  const [minutes, setMinutes] = useState(SITTING_DURATIONS[0]?.minutes ?? 60);
  const [editing, setEditing] = useState<number | null>(null);

  const edit = (weekday: number, patch: Partial<DayRow>) =>
    setDays((current) =>
      current.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row)),
    );

  const times = halfHours();
  const closes = closingTimes();
  const covers = coversFrom(tables);
  /* A restaurant that has already saved a week has covers on record, and the
     steppers start at none. Its own number stands until it is recounted. */
  const savedCovers = draft.serviceWindows[0]?.covers ?? 0;
  const sending = covers > 0 ? covers : savedCovers;
  const openDays = days.filter((day) => day.on);

  const save = () =>
    run(
      () =>
        setOpeningHoursDraft({
          days: openDays.map((day) => ({
            weekday: day.weekday,
            opens: day.opens,
            closes: day.closes,
          })),
          covers: sending,
        }),
      () => {
        setNotice({
          tone: "ok",
          text: `${countOf(openDays.length, "days", locale)} saved, seating ${sending}.`,
        });
        advance();
      },
    );

  return (
    <>
      <StaysPlate label="Opening hours">
        <div className="nf-stays-list">
          {days.map((row) => {
            const day = row;
            const open = editing === day.weekday;
            return (
              <div key={day.weekday}>
                <div className="nf-stays-day">
                  <span className="nf-stays-day__name">{day.label}</span>
                  <button
                    type="button"
                    className="nf-stays-day__hours text-left"
                    disabled={!row.on || pending}
                    aria-expanded={open}
                    onClick={() => setEditing(open ? null : day.weekday)}
                  >
                    {row.on ? windowLabel(row.opens, row.closes) : "Closed"}
                  </button>
                  <Switch
                    checked={row.on}
                    aria-label={`Open on ${day.label}`}
                    disabled={pending}
                    onCheckedChange={(next) => {
                      edit(day.weekday, { on: next });
                      if (!next && open) setEditing(null);
                    }}
                  />
                </div>
                {open && row.on && (
                  <div className="grid grid-cols-2 gap-[var(--nf-space-sm)] px-[var(--nf-space-sm)] pb-[var(--nf-space-sm)]">
                    <div>
                      <label
                        className="nf-stays-plate__label"
                        htmlFor={`stays-opens-${day.weekday}`}
                      >
                        Opens
                      </label>
                      <select
                        id={`stays-opens-${day.weekday}`}
                        className="nf-field nf-field--glass nf-stays-select"
                        value={row.opens}
                        onChange={(event) => edit(day.weekday, { opens: event.target.value })}
                      >
                        {times.map((time) => (
                          <option key={time} value={time}>
                            {clockLabel(time)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className="nf-stays-plate__label"
                        htmlFor={`stays-closes-${day.weekday}`}
                      >
                        Closes
                      </label>
                      <select
                        id={`stays-closes-${day.weekday}`}
                        className="nf-field nf-field--glass nf-stays-select"
                        value={row.closes}
                        onChange={(event) => edit(day.weekday, { closes: event.target.value })}
                      >
                        {closes.map((time) => (
                          <option key={time} value={time}>
                            {clockLabel(time)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="nf-stays-plate__note">
          Tap a day&rsquo;s hours to change them. A day that is off is a day nobody can book. A
          service stays inside one day, so a kitchen that runs to midnight closes at 11:59 PM.
        </p>
      </StaysPlate>

      <StaysPlate label="Table inventory">
        <div className="nf-stays-list">
          {TABLE_SIZES.map((size) => (
            <StaysCountRow
              key={size.seats}
              label={size.label}
              value={tables[size.seats] ?? 0}
              min={0}
              max={200}
              disabled={pending}
              onChange={(next) => setTables((current) => ({ ...current, [size.seats]: next }))}
            />
          ))}
        </div>
        <p className="nf-stays-plate__note">
          {covers > 0
            ? `That is ${covers} seats, and ${covers} is the number saved against every day you are open.`
            : savedCovers > 0
              ? `${savedCovers} seats are on record. Count the tables again to change it.`
              : "Count the tables and the seats add up. The total is what a reservation is checked against; the breakdown is not kept."}
        </p>
      </StaysPlate>

      <section className="nf-stays-plate">
        <StaysRow
          trailing={
            <select
              className="nf-field nf-field--glass nf-stays-select w-auto"
              value={minutes}
              aria-label="Sitting duration"
              onChange={(event) => setMinutes(Number(event.target.value))}
            >
              {SITTING_DURATIONS.map((option) => (
                <option key={option.minutes} value={option.minutes}>
                  {option.label}
                </option>
              ))}
            </select>
          }
        >
          <span className="nf-stays-row__value whitespace-nowrap">Sitting duration</span>
        </StaysRow>
        <p className="nf-stays-plate__note">
          Nothing reads this yet. There is no column for it and no part of the reservation path asks
          for one, so it is asked here and not stored, rather than saved somewhere it would never be
          read back from.
        </p>
      </section>

      <Button
        variant="primary"
        size="lg"
        full
        trailingIcon="chevron-right"
        onClick={save}
        loading={pending}
        disabled={pending || openDays.length === 0 || sending <= 0}
      >
        Continue
      </Button>

      <StaysNote>
        {openDays.length === 0
          ? "A restaurant needs at least one open day before the application can be sent."
          : `Saving writes ${countOf(openDays.length, "days", locale)} and replaces whatever week was on record.`}
      </StaysNote>
    </>
  );
}
