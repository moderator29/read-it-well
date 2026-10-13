"use client";

import "@/app/css/visit-calendar.css";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { countOf, formatDate, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import type { InspectionState } from "@/lib/inspections/types";
import {
  VISIT_FILTERS,
  applyFilter,
  filterCounts,
  groupByDay,
  monthGrid,
  monthOf,
  shiftDay,
  shiftMonth,
  summarise,
  weekOf,
  type VisitFilter,
  type VisitMode,
} from "@/lib/visit-calendar/model";
import { VisitRow } from "./VisitRow";
import { DayFace } from "./DayFace";

/**
 * THE LISTER'S VISIT CALENDAR, on /agent/inspections (13 October 2026).
 *
 * Three figures at the top (Today, Next 7 days, Needs your answer), the
 * requests waiting on this lister as rows, then the calendar: a week strip
 * with every day of that week listed underneath, or a month grid with the
 * picked day listed underneath. Each visit is one row (time, the renter's
 * name, the listing, the visit mode, the state) and a tap opens the existing
 * inspection sheet over the page, with confirm, propose a time, decline and
 * the day kit exactly as they were. The sheets are drawn on the server and
 * handed in by id, so nothing about them is re-implemented here.
 *
 * REAL DATA ONLY. The rows are the lister's own inspection requests; a day
 * with none says so, and an empty calendar says what will fill it.
 *
 * Every day is a LAGOS day (`lib/visit-calendar/model.ts`), and "today" is
 * decided on the server so the first paint and the browser agree.
 */

export type CalendarRow = {
  id: string;
  /** ISO: the agreed time, or the asked time until one is agreed. */
  at: string;
  /** True while `at` is the asked time, not an agreed one. */
  asked: boolean;
  state: InspectionState;
  /** Null when the mode could not be read: no icon rather than a wrong one. */
  mode: VisitMode | null;
  listingTitle: string | null;
  personName: string | null;
};

type Copy = Dictionary["visitOps"];
type View = "week" | "month";

function dayLabel(day: string, locale: Locale, options: Intl.DateTimeFormatOptions): string {
  return formatDate(new Date(`${day}T12:00:00Z`), locale, options);
}

export function VisitCalendar({
  rows,
  sheets,
  today,
  copy,
  locale,
  aside,
  notice = null,
  footnote = null,
  initialView = "week",
}: {
  rows: CalendarRow[];
  /** The existing inspection sheet for each visit, drawn on the server, by id. */
  sheets: Record<string, ReactNode>;
  /** Today's Lagos date, `YYYY-MM-DD`, from the server. */
  today: string;
  copy: Copy;
  locale: Locale;
  /** The side column: the viewing windows and the day's route. */
  aside?: ReactNode;
  /**
   * Drawn INSTEAD of the figures and the calendar: the empty state when the
   * lister has no visits at all, or the refusal when they could not be read.
   * The side column stays, so windows can be set before the first request.
   */
  notice?: ReactNode;
  /** One quiet line under the calendar (the read's cap, when it is reached). */
  footnote?: string | null;
  initialView?: View;
}) {
  const c = copy.calendar;
  const [view, setView] = useState<View>(initialView);
  const [anchor, setAnchor] = useState(today);
  const [picked, setPicked] = useState(today);
  const [filter, setFilter] = useState<VisitFilter | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const dayRefs = useRef(new Map<string, HTMLElement>());

  const summary = useMemo(() => summarise(rows, today), [rows, today]);
  const counts = useMemo(() => filterCounts(rows), [rows]);
  const shown = useMemo(() => applyFilter(rows, filter), [rows, filter]);
  const byDay = useMemo(() => groupByDay(shown), [shown]);
  const waiting = useMemo(
    () => rows.filter((row) => row.state === "REQUESTED").sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)),
    [rows],
  );

  const week = weekOf(anchor);
  const grid = monthGrid(anchor);
  const stateWord = filter === "all" ? "" : copy.states[filter].toLowerCase();

  const rangeLabel =
    view === "week"
      ? c.weekOf.replace("{date}", dayLabel(week[0]!, locale, { day: "numeric", month: "short", year: "numeric" }))
      : dayLabel(`${monthOf(anchor)}-15`, locale, { month: "long", year: "numeric" });

  function move(step: -1 | 1) {
    const next = view === "week" ? shiftDay(anchor, step * 7) : shiftMonth(anchor, step);
    setAnchor(next);
    setPicked(view === "week" ? weekOf(next)[0]! : `${monthOf(next)}-01`);
  }
  function jumpToday() {
    setAnchor(today);
    setPicked(today);
  }
  function showDay(day: string) {
    setPicked(day);
    if (view === "week") dayRefs.current.get(day)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const row = (one: CalendarRow) => (
    <li key={one.id}>
      <VisitRow
        time={formatDate(new Date(one.at), locale, { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}
        asked={one.asked ? c.askedFor : null}
        name={one.personName ?? c.nameNotShared}
        listing={one.listingTitle ?? c.listingGone}
        mode={one.mode}
        modeWord={one.mode ? copy.modes[one.mode] : null}
        state={one.state}
        stateWords={copy.states}
        context={formatDate(new Date(one.at), locale, { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" })}
        onOpen={sheets[one.id] ? () => setOpenId(one.id) : null}
      />
    </li>
  );

  const pickedRows = byDay.get(picked) ?? [];
  const weekHasAny = week.some((day) => (byDay.get(day)?.length ?? 0) > 0);

  return (
    <div className="nf-vcal" data-testid="visit-calendar">
      <div className="nf-vcal__main">
        {notice ?? (
        <>
        {/* The three figures. Each one is also a way in. */}
        <section aria-label={c.summaryLabel} className="nf-vcal-sum">
          <button
            type="button"
            className="nf-vcal-sum__item"
            onClick={() => {
              setView("week");
              jumpToday();
              setFilter("all");
            }}
          >
            <span className="nf-vcal-sum__figure nf-numeric" data-testid="visit-sum-today">{summary.today}</span>
            <span className="nf-vcal-sum__word">{c.today}</span>
          </button>
          <button
            type="button"
            className="nf-vcal-sum__item"
            onClick={() => {
              setView("week");
              setAnchor(shiftDay(today, 1));
              setPicked(shiftDay(today, 1));
              setFilter("all");
            }}
          >
            <span className="nf-vcal-sum__figure nf-numeric" data-testid="visit-sum-next">{summary.next7}</span>
            <span className="nf-vcal-sum__word">{c.next7}</span>
          </button>
          <button
            type="button"
            className="nf-vcal-sum__item"
            data-attention={summary.needsAnswer > 0 ? "" : undefined}
            onClick={() => setFilter("requested")}
          >
            <span className="nf-vcal-sum__figure nf-numeric" data-testid="visit-sum-needs">{summary.needsAnswer}</span>
            <span className="nf-vcal-sum__word">{c.needsAnswer}</span>
          </button>
        </section>

        {waiting.length > 0 && (
          <section className="nf-vcal-card" aria-labelledby="vcal-needs" data-testid="visit-needs-answer">
            <h2 id="vcal-needs" className="nf-h4 text-[var(--nf-content-primary)]">
              {c.needsTitle}
            </h2>
            <p className="mt-inline nf-body-sm text-[var(--nf-content-secondary)]">{c.needsNote}</p>
            <ul className="nf-vcal-rows mt-group">{waiting.map(row)}</ul>
          </section>
        )}

        <section className="nf-vcal-card" aria-labelledby="vcal-title">
          <div className="nf-vcal-head">
            <div className="min-w-0">
              <h2 id="vcal-title" className="nf-h4 text-[var(--nf-content-primary)]">
                {c.calendarTitle}
              </h2>
              <p className="nf-body-sm text-[var(--nf-content-secondary)]" aria-live="polite" data-testid="visit-range">
                {rangeLabel}
              </p>
            </div>
            <Segmented
              size="sm"
              label={c.viewLabel}
              value={view}
              onChange={(next) => {
                setView(next);
                setPicked(anchor);
              }}
              options={[
                { value: "week", label: c.week },
                { value: "month", label: c.month },
              ]}
            />
          </div>

          <div className="nf-vcal-nav">
            <button
              type="button"
              className="nf-vcal-nav__step"
              aria-label={view === "week" ? c.previousWeek : c.previousMonth}
              onClick={() => move(-1)}
            >
              <UiIcon name="arrow-left" size={18} />
            </button>
            <button type="button" className="nf-vcal-nav__today" onClick={jumpToday}>
              {c.jumpToday}
            </button>
            <button
              type="button"
              className="nf-vcal-nav__step"
              aria-label={view === "week" ? c.nextWeek : c.nextMonth}
              onClick={() => move(1)}
            >
              <UiIcon name="arrow-right" size={18} />
            </button>
          </div>

          <ChipRow radiogroup label={c.filterLabel} className="mt-group">
            <Chip behaviour="choice" size="sm" selected={filter === "all"} count={counts.all} onSelectedChange={() => setFilter("all")}>
              {c.all}
            </Chip>
            {VISIT_FILTERS.map((key) => (
              <Chip
                key={key}
                behaviour="choice"
                size="sm"
                selected={filter === key}
                count={counts[key]}
                onSelectedChange={() => setFilter(key)}
                data-testid={`visit-filter-${key}`}
              >
                {copy.states[key]}
              </Chip>
            ))}
          </ChipRow>

          {view === "week" ? (
            <>
              <ol className="nf-vcal-strip mt-group" aria-label={rangeLabel}>
                {week.map((day) => {
                  const n = byDay.get(day)?.length ?? 0;
                  return (
                    <li key={day}>
                      <button
                        type="button"
                        className="nf-vcal-day"
                        aria-current={day === today ? "date" : undefined}
                        aria-pressed={day === picked}
                        onClick={() => showDay(day)}
                      >
                        <DayFace day={day} count={n} locale={locale} variant="strip" />
                      </button>
                    </li>
                  );
                })}
              </ol>

              {rows.length > 0 && !weekHasAny ? (
                <p className="nf-vcal-empty mt-group" data-testid="visit-week-empty">
                  {filter === "all" ? c.weekEmpty : c.weekEmptyFiltered.replace("{state}", stateWord)}
                </p>
              ) : (
                <div className="nf-vcal-week mt-group">
                  {week.map((day) => {
                    const list = byDay.get(day) ?? [];
                    return (
                      <section
                        key={day}
                        ref={(node) => {
                          if (node) dayRefs.current.set(day, node);
                          else dayRefs.current.delete(day);
                        }}
                        className="nf-vcal-agenda"
                        data-today={day === today ? "" : undefined}
                        data-picked={day === picked ? "" : undefined}
                        aria-label={dayLabel(day, locale, { weekday: "long", day: "numeric", month: "long" })}
                      >
                        <h3 className="nf-vcal-agenda__day">
                          <span>{dayLabel(day, locale, { weekday: "long" })}</span>
                          <span className="nf-vcal-agenda__date">{dayLabel(day, locale, { day: "numeric", month: "short" })}</span>
                          {list.length > 0 && (
                            <span className="nf-vcal-agenda__count nf-numeric">{countOf(list.length, "visits", locale)}</span>
                          )}
                        </h3>
                        {list.length === 0 ? (
                          <p className="nf-vcal-agenda__none">{c.dayEmpty}</p>
                        ) : (
                          <ul className="nf-vcal-rows">{list.map(row)}</ul>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="nf-vcal-month mt-group" role="grid" aria-label={rangeLabel}>
                <div className="nf-vcal-month__head" role="row">
                  {week.map((day) => (
                    <span key={day} role="columnheader" className="nf-vcal-month__weekday">
                      {dayLabel(day, locale, { weekday: "narrow" })}
                    </span>
                  ))}
                </div>
                {Array.from({ length: grid.length / 7 }, (_, r) => (
                  <div key={r} className="nf-vcal-month__row" role="row">
                    {grid.slice(r * 7, r * 7 + 7).map((cell) => {
                      const n = byDay.get(cell.day)?.length ?? 0;
                      return (
                        <span key={cell.day} role="gridcell" className="contents">
                          <button
                            type="button"
                            className="nf-vcal-cell"
                            data-out={cell.inMonth ? undefined : ""}
                            aria-current={cell.day === today ? "date" : undefined}
                            aria-pressed={cell.day === picked}
                            onClick={() => setPicked(cell.day)}
                            data-testid={`visit-cell-${cell.day}`}
                          >
                            <DayFace day={cell.day} count={n} locale={locale} variant="cell" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>

              <section className="nf-vcal-agenda mt-group" aria-live="polite" data-testid="visit-picked-day">
                <h3 className="nf-vcal-agenda__day">
                  <span>{dayLabel(picked, locale, { weekday: "long" })}</span>
                  <span className="nf-vcal-agenda__date">{dayLabel(picked, locale, { day: "numeric", month: "short" })}</span>
                </h3>
                {pickedRows.length === 0 ? (
                  <p className="nf-vcal-agenda__none">
                    {(filter === "all" ? c.dayNone : c.dayNoneFiltered.replace("{state}", stateWord)).replace(
                      "{date}",
                      dayLabel(picked, locale, { day: "numeric", month: "long" }),
                    )}
                  </p>
                ) : (
                  <ul className="nf-vcal-rows">{pickedRows.map(row)}</ul>
                )}
              </section>
            </>
          )}
          {footnote && <p className="nf-vcal-empty mt-group">{footnote}</p>}
        </section>
        </>
        )}
      </div>

      {aside && <div className="nf-vcal__aside">{aside}</div>}

      <Sheet
        open={openId !== null}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
        title={c.visitTitle}
        closeLabel={c.close}
        fullPage
        sideOnWide
        testId="visit-sheet"
      >
        {openId ? sheets[openId] : null}
      </Sheet>
    </div>
  );
}
