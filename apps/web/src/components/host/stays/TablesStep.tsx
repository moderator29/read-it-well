"use client";

import { useHostCopy } from "@/components/host/host-copy";
import { useState } from "react";
import { differs, useGuard, useHeld } from "../wizard-memory";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { setOpeningHoursDraft, setRestaurantProfileDraft } from "@/lib/host/actions";
import {
  SITTING_DURATIONS,
  TABLE_SIZES,
  WEEK_FROM_MONDAY,
  clockLabel,
  closingTimes,
  coversFrom,
  daysClosingBeforeOpening,
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
 * THE SITTING DURATION IS SAVED on the restaurant's profile
 * (`restaurant_profiles.sitting_minutes`, `20261013090200_...`) and read back
 * here and on the restaurant's page, where a guest sees it before asking for a
 * table. Until that migration has run it cannot be kept, and the save says so.
 */
/** One row of the week, as the screen holds it while it is being edited. */
type DayRow = { weekday: number; label: string; on: boolean; opens: string; closes: string };

export function TablesStep({ draft, pending, runAsync, setNotice, advance, locale }: StaysStepProps) {
  const hw = useHostCopy();
  /*
   * THE WEEK IS AN ARRAY IN THE DRAWN ORDER AND NOT A MAP KEYED BY WEEKDAY.
   * `WEEK_FROM_MONDAY` already carries the order the render lists and the
   * number the column stores, so carrying both on each row means no lookup can
   * miss and no index can come back undefined.
   */
  const savedWeek: DayRow[] = (() => {
    const saved = new Map(draft.serviceWindows.map((window) => [window.weekday, window]));
    return WEEK_FROM_MONDAY.map((day) => {
      const row = saved.get(day.weekday);
      return row
        ? { ...day, on: true, opens: row.opens, closes: row.closes }
        : { ...day, on: false, opens: "08:00", closes: "23:00" };
    });
  })();
  const savedMinutes = draft.restaurant?.sittingMinutes ?? SITTING_DURATIONS[1]?.minutes ?? 90;
  /* Held in the wizard so Back keeps the week, the table count and the
     sitting length, and measured against what is on record. */
  const [days, setDays] = useHeld<DayRow[]>("days", savedWeek);
  const [tables, setTables] = useHeld<TableInventory>("tables", {});
  const [minutes, setMinutes] = useHeld("minutes", savedMinutes);
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
  /* A day that closes at or before it opens is refused by the database, and
     the refusal used to come back as one sentence that named no day. It is
     named here, before anything is sent. */
  const backwards = daysClosingBeforeOpening(days);

  /* The week and the covers, then the sitting length on the restaurant's
     profile, where `20261013090200_...` gives it a column. */
  let sittingKept = true;
  const save = async () => {
    if (openDays.length === 0 || sending <= 0 || backwards.length > 0) {
      setNotice({ tone: "error", text: "Open at least one day, count the tables, and close each day after it opens, to save the week." });
      return false;
    }
    const week = await runAsync(() =>
      setOpeningHoursDraft({
        days: openDays.map((day) => ({ weekday: day.weekday, opens: day.opens, closes: day.closes })),
        covers: sending,
      }),
    );
    if (!week) return false;
    return runAsync(async () => {
      const result = await setRestaurantProfileDraft({ sittingMinutes: minutes as 60 | 90 | 120 | 180 });
      if (result.ok) sittingKept = result.data.rulesKept;
      return result;
    });
  };
  useGuard(
    "week",
    differs(days, savedWeek) || coversFrom(tables) > 0 || minutes !== savedMinutes,
    save,
  );
  const saveAndGo = async () => {
    if (!(await save())) return;
    setNotice({
      tone: "ok",
      text:
        `${countOf(openDays.length, "days", locale)} saved, seating ${sending}.` +
        (sittingKept ? "" : " The sitting length is not kept yet; it will be once this estate is updated."),
    });
    advance();
  };

  return (
    <>
      <StaysPlate label={hw.steps.openingHours}>
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
                    className={`nf-stays-day__hours text-left${
                      backwards.includes(row) ? " text-[var(--nf-state-error)]" : ""
                    }`}
                    disabled={!row.on || pending}
                    aria-expanded={open}
                    aria-invalid={backwards.includes(row) ? true : undefined}
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
        {backwards.length > 0 ? (
          <p className="nf-stays-plate__note text-[var(--nf-state-error)]" role="alert">
            {backwards.map((day) => day.label).join(", ")}: the closing time is not after the opening
            time. Set it later, or switch the day off.
          </p>
        ) : null}
      </StaysPlate>

      <StaysPlate label={hw.steps.tableInventory}>
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
              aria-label={hw.steps.sittingDuration}
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
          How long a table is the party&rsquo;s. Guests see it before they ask for a table, and it is
          saved with your week.
        </p>
      </section>

      <Button
        variant="primary"
        size="lg"
        full
        trailingIcon="chevron-right"
        onClick={() => void saveAndGo()}
        loading={pending}
        disabled={pending || openDays.length === 0 || sending <= 0 || backwards.length > 0}
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
