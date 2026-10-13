import "@/app/css/visit-calendar.css";
import Link from "next/link";
import { countOf, formatDate, type Dictionary, type Locale } from "@vallo/i18n/core";
import { StatusChip } from "@/components/ui/StatusChip";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { VisitRow } from "@/components/agent/visit-calendar/VisitRow";
import { chipStateOf } from "@/components/agent/visit-calendar/chip-state";
import { DayFace } from "@/components/agent/visit-calendar/DayFace";
import {
  VISIT_FILTERS,
  chipOf,
  groupByDay,
  monthGrid,
  monthOf,
  shiftDay,
  shiftMonth,
  weekOf,
} from "@/lib/visit-calendar/model";
import {
  dayCounts,
  historyOf,
  isNarrowed,
  visitsHref,
  type AdminVisitQuery,
  type AdminVisitRow,
} from "@/lib/admin/reads/visits-model";
import type { VisitCalendarData, VisitDetail } from "@/lib/admin/reads/visits";
import { CalmNote, PageHead, Panel, ReadOnlyNote } from "../../_components/panels";

/**
 * BOOKINGS > VISITS, the console's visit calendar (`/admin/bookings/visits`).
 *
 * Every inspection request on the platform on the Lagos day it is for, as a
 * week (seven days, each listed) or a month (a grid with the count on each
 * day, the picked day listed). Filters for state, visit mode, city and
 * lister are a plain GET form, so the whole desk is an address and works
 * without script. A visit opens its detail beside the calendar (above it on
 * a phone): the listing, the two sides by display name with links to their
 * member files, the history from the record's own timestamps, the reminders
 * sent (`viewing_reminders`) and any no-show. Read only: there is no control
 * here that changes a visit.
 */

export const VISITS_BASE = "/admin/bookings/visits";

type Copy = Dictionary["visitOps"];

function dayLabel(day: string, locale: Locale, options: Intl.DateTimeFormatOptions): string {
  return formatDate(new Date(`${day}T12:00:00Z`), locale, options);
}

function stamp(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

export function VisitsDesk({
  query,
  today,
  read,
  detail,
  copy,
  locale,
}: {
  query: AdminVisitQuery;
  today: string;
  /** The range's visits, or why there are none to draw. */
  read: { state: "ok"; data: VisitCalendarData } | { state: "unavailable" } | { state: "too-many" };
  /** The open visit's reminders and no-shows, when one is open and was read. */
  detail: VisitDetail | null;
  copy: Copy;
  locale: Locale;
}) {
  const a = copy.admin;
  const href = (patch: Partial<AdminVisitQuery>) => visitsHref(VISITS_BASE, query, patch);
  const week = weekOf(query.day);
  const step = (n: -1 | 1) => (query.view === "week" ? shiftDay(query.day, n * 7) : shiftMonth(query.day, n));
  const rangeLabel =
    query.view === "week"
      ? a.rangeWeek
          .replace("{from}", dayLabel(week[0]!, locale, { day: "numeric", month: "short" }))
          .replace("{to}", dayLabel(week[6]!, locale, { day: "numeric", month: "short", year: "numeric" }))
      : dayLabel(`${monthOf(query.day)}-15`, locale, { month: "long", year: "numeric" });

  const ok = read.state === "ok" ? read.data : null;
  const rows = ok?.rows ?? [];
  const byDay = groupByDay(rows);
  const counts = dayCounts(rows);
  const selected = query.visit ? (rows.find((row) => row.id === query.visit) ?? null) : null;

  const visitRow = (row: AdminVisitRow) => (
    <li key={row.id}>
      <VisitRow
        time={formatDate(new Date(row.at), locale, { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}
        asked={row.asked ? copy.calendar.askedFor : null}
        name={a.rowPeople.replace("{renter}", row.renterName ?? a.unnamed).replace("{lister}", row.listerName ?? a.unnamed)}
        listing={[row.listingTitle ?? a.listingGone, row.city].filter(Boolean).join(", ")}
        mode={row.mode}
        modeWord={copy.modes[row.mode]}
        state={row.state}
        stateWords={copy.states}
        context={formatDate(new Date(row.at), locale, { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" })}
        onOpen={null}
        href={href({ visit: row.id })}
        selected={row.id === query.visit}
      />
    </li>
  );

  const narrowed = isNarrowed(query);
  const pickedRows = byDay.get(query.day) ?? [];

  return (
    <div className="nf-console" data-testid="admin-visits">
      <Link href="/admin/bookings" className="nf-chip mb-md inline-flex w-fit items-center gap-2xs">
        {a.allStays}
      </Link>
      <PageHead
        title={a.title}
        lede={a.lede}
        action={
          <nav aria-label={a.viewLabel} className="flex flex-wrap gap-xs">
            {(["week", "month"] as const).map((view) => (
              <Link
                key={view}
                href={href({ view, visit: null })}
                className={`nf-btn nf-btn--sm ${query.view === view ? "nf-btn--primary" : "nf-btn--glass"}`}
                aria-current={query.view === view ? "page" : undefined}
              >
                {view === "week" ? a.week : a.month}
              </Link>
            ))}
          </nav>
        }
      />
      <ReadOnlyNote locale={locale} />

      {/* The filters: a GET form, so a filtered desk is an address. */}
      <form method="get" action={VISITS_BASE} className="nf-vdesk__filters" aria-label={a.filtersLabel}>
        <input type="hidden" name="view" value={query.view} />
        <input type="hidden" name="day" value={query.day} />
        <label className="block">
          <span className="nf-label">{a.state}</span>
          <select name="state" className="nf-field" defaultValue={query.state ?? ""}>
            <option value="">{a.anyState}</option>
            {VISIT_FILTERS.map((key) => (
              <option key={key} value={key}>
                {copy.states[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="nf-label">{a.mode}</span>
          <select name="mode" className="nf-field" defaultValue={query.mode ?? ""}>
            <option value="">{a.anyMode}</option>
            <option value="in_person">{copy.modes.in_person}</option>
            <option value="video">{copy.modes.video}</option>
          </select>
        </label>
        <label className="block">
          <span className="nf-label">{a.city}</span>
          <select name="city" className="nf-field" defaultValue={query.city ?? ""}>
            <option value="">{a.anyCity}</option>
            {[...new Set([...(ok?.cities ?? []), ...(query.city ? [query.city] : [])])].map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="nf-label">{a.lister}</span>
          <select name="lister" className="nf-field" defaultValue={query.lister ?? ""}>
            <option value="">{a.anyLister}</option>
            {(ok?.listers ?? []).map((lister) => (
              <option key={lister.id} value={lister.id}>
                {lister.name || a.unnamed}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="nf-btn nf-btn--primary nf-btn--sm">
          {a.apply}
        </button>
        {narrowed && (
          <Link href={visitsHref(VISITS_BASE, { ...query, state: null, mode: null, city: null, lister: null, visit: null })} className="nf-btn nf-btn--glass nf-btn--sm">
            {a.clear}
          </Link>
        )}
      </form>

      {read.state === "unavailable" ? (
        <div className="mt-lg">
          <CalmNote kind="error" title={a.title} fills={a.unavailable} />
        </div>
      ) : read.state === "too-many" ? (
        <div className="mt-lg">
          <CalmNote kind="error" title={a.title} fills={a.tooMany} />
        </div>
      ) : (
        <div className="nf-vdesk mt-lg">
          <div className="min-w-0">
            <Panel
              id="visits-calendar"
              title={rangeLabel}
              action={
                <nav className="nf-vcal-nav mt-0" aria-label={a.stepLabel}>
                  <Link className="nf-vcal-nav__step" href={href({ day: step(-1), visit: null })} aria-label={a.previous}>
                    <UiIcon name="arrow-left" size={18} />
                  </Link>
                  <Link className="nf-vcal-nav__today" href={href({ day: today, visit: null })}>
                    {a.jumpToday}
                  </Link>
                  <Link className="nf-vcal-nav__step" href={href({ day: step(1), visit: null })} aria-label={a.next}>
                    <UiIcon name="arrow-right" size={18} />
                  </Link>
                </nav>
              }
            >
              <p className="nf-body-sm text-[var(--nf-content-secondary)]" data-testid="visits-in-range">
                {a.inRange.replace("{visits}", countOf(rows.length, "visits", locale))}
              </p>

              {query.view === "week" ? (
                <>
                  <ol className="nf-vcal-strip mt-group" aria-label={a.countsLabel}>
                    {week.map((day) => {
                      const n = counts.get(day) ?? 0;
                      return (
                        <li key={day}>
                          <Link
                            href={`${href({ day, visit: null })}#day-${day}`}
                            className="nf-vcal-day"
                            aria-current={day === today ? "date" : undefined}
                            data-picked={day === query.day ? "" : undefined}
                          >
                            <DayFace day={day} count={n} locale={locale} variant="strip" />
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                  {rows.length === 0 ? (
                    <div className="mt-group">
                      <CalmNote
                        title={narrowed ? a.noMatchTitle : a.noneTitle}
                        fills={narrowed ? a.noMatchBody : a.noneBody}
                      />
                    </div>
                  ) : (
                    <div className="nf-vcal-week mt-group">
                      {week.map((day) => {
                        const list = byDay.get(day) ?? [];
                        return (
                          <section key={day} id={`day-${day}`} className="nf-vcal-agenda" data-today={day === today ? "" : undefined}>
                            <h3 className="nf-vcal-agenda__day">
                              <span>{dayLabel(day, locale, { weekday: "long" })}</span>
                              <span className="nf-vcal-agenda__date">{dayLabel(day, locale, { day: "numeric", month: "short" })}</span>
                              {list.length > 0 && (
                                <span className="nf-vcal-agenda__count nf-numeric">{countOf(list.length, "visits", locale)}</span>
                              )}
                            </h3>
                            {list.length === 0 ? (
                              <p className="nf-vcal-agenda__none">{copy.calendar.dayEmpty}</p>
                            ) : (
                              <ul className="nf-vcal-rows">{list.map(visitRow)}</ul>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="nf-vcal-month mt-group" role="grid" aria-label={a.countsLabel}>
                    <div className="nf-vcal-month__head" role="row">
                      {week.map((day) => (
                        <span key={day} role="columnheader" className="nf-vcal-month__weekday">
                          {dayLabel(day, locale, { weekday: "narrow" })}
                        </span>
                      ))}
                    </div>
                    {(() => {
                      const grid = monthGrid(query.day);
                      return Array.from({ length: grid.length / 7 }, (_, r) => (
                        <div key={r} className="nf-vcal-month__row" role="row">
                          {grid.slice(r * 7, r * 7 + 7).map((cell) => {
                            const n = counts.get(cell.day) ?? 0;
                            return (
                              <span key={cell.day} role="gridcell" className="contents">
                                <Link
                                  href={href({ day: cell.day, visit: null })}
                                  className="nf-vcal-cell"
                                  data-out={cell.inMonth ? undefined : ""}
                                  data-picked={cell.day === query.day ? "" : undefined}
                                  aria-current={cell.day === today ? "date" : undefined}
                                  data-testid={`visits-cell-${cell.day}`}
                                >
                                  <DayFace day={cell.day} count={n} locale={locale} variant="cell" />
                                </Link>
                              </span>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                  {rows.length === 0 ? (
                    <div className="mt-group">
                      <CalmNote
                        title={narrowed ? a.noMatchTitle : a.noneTitle}
                        fills={narrowed ? a.noMatchBody : a.noneBody}
                      />
                    </div>
                  ) : (
                    <section className="nf-vcal-agenda mt-group" data-testid="visits-picked-day">
                      <h3 className="nf-vcal-agenda__day">
                        <span>{dayLabel(query.day, locale, { weekday: "long" })}</span>
                        <span className="nf-vcal-agenda__date">{dayLabel(query.day, locale, { day: "numeric", month: "short" })}</span>
                      </h3>
                      {pickedRows.length === 0 ? (
                        <p className="nf-vcal-agenda__none">
                          {a.dayNone.replace("{date}", dayLabel(query.day, locale, { day: "numeric", month: "long" }))}
                        </p>
                      ) : (
                        <ul className="nf-vcal-rows">{pickedRows.map(visitRow)}</ul>
                      )}
                    </section>
                  )}
                </>
              )}
            </Panel>
          </div>

          <aside className={`nf-vdesk__detail${query.visit ? "" : " nf-vdesk__detail--idle"}`} aria-label={a.detailTitle}>
            <Panel
              id="visit-detail"
              title={a.detailTitle}
              action={
                query.visit ? (
                  <Link href={href({ visit: null })} className="nf-vcal-nav__step" aria-label={a.closeDetail}>
                    <UiIcon name="close" size={18} />
                  </Link>
                ) : undefined
              }
            >
              {!query.visit ? (
                <p className="nf-body-sm text-[var(--nf-content-secondary)]">{a.detailEmpty}</p>
              ) : !selected ? (
                <p className="nf-body-sm text-[var(--nf-content-secondary)]">{a.detailMissing}</p>
              ) : (
                <VisitDetailBody row={selected} detail={detail} copy={copy} locale={locale} />
              )}
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}

function VisitDetailBody({
  row,
  detail,
  copy,
  locale,
}: {
  row: AdminVisitRow;
  detail: VisitDetail | null;
  copy: Copy;
  locale: Locale;
}) {
  const a = copy.admin;
  const history = historyOf(row, detail?.noShows ?? null);
  return (
    <div className="flex flex-col gap-md" data-testid="visit-detail">
      <div className="flex flex-wrap items-center gap-xs">
        <StatusChip state={chipStateOf(row.state)} size="sm">
          {copy.states[chipOf(row.state)]}
        </StatusChip>
        <span className="inline-flex items-center gap-2xs nf-body-sm text-[var(--nf-content-secondary)]">
          <UiIcon name={row.mode === "video" ? "video" : "location"} size={16} />
          {copy.modes[row.mode]}
        </span>
      </div>

      <dl className="nf-vdesk__facts">
        <dt>{row.asked ? a.askedFor : a.when}</dt>
        <dd className="nf-numeric">{stamp(row.at, locale)}</dd>
        <dt>{a.listing}</dt>
        <dd>
          <Link href={`/admin/listings/${row.listingId}`} className="nf-link">
            {row.listingTitle ?? a.listingGone}
          </Link>
          {(row.area || row.city) && (
            <span className="block text-[var(--nf-content-secondary)]">{[row.area, row.city].filter(Boolean).join(", ")}</span>
          )}
        </dd>
        <dt>{a.listerSide}</dt>
        <dd>
          <Link href={`/admin/people/${row.listerId}`} className="nf-link" aria-label={`${a.openPerson}: ${row.listerName ?? a.unnamed}`}>
            {row.listerName ?? a.unnamed}
          </Link>
        </dd>
        <dt>{a.renterSide}</dt>
        <dd>
          <Link href={`/admin/people/${row.renterId}`} className="nf-link" aria-label={`${a.openPerson}: ${row.renterName ?? a.unnamed}`}>
            {row.renterName ?? a.unnamed}
          </Link>
        </dd>
      </dl>

      <section aria-labelledby="visit-history">
        <h3 id="visit-history" className="nf-label">
          {a.history}
        </h3>
        <ol className="nf-vdesk__history mt-inline">
          {history.map((step, i) => (
            <li key={`${step.key}-${i}`}>
              <span>{a.historySteps[step.key]}</span>
              <span className="nf-numeric text-[var(--nf-content-secondary)]">{stamp(step.at, locale)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="visit-reminders">
        <h3 id="visit-reminders" className="nf-label">
          {a.reminders}
        </h3>
        {!detail || detail.reminders === null ? (
          <p className="mt-inline nf-body-sm text-[var(--nf-content-muted)]">{a.remindersUnreadable}</p>
        ) : detail.reminders.length === 0 ? (
          <p className="mt-inline nf-body-sm text-[var(--nf-content-muted)]">{a.remindersNone}</p>
        ) : (
          <ol className="nf-vdesk__history mt-inline" data-testid="visit-reminders">
            {detail.reminders.map((r) => (
              <li key={`${r.stage}-${r.audience}-${r.sentAt}`}>
                <span>
                  {a.reminderStages[r.stage]} {a.audiences[r.audience]}
                </span>
                <span className="nf-numeric text-[var(--nf-content-secondary)]">{stamp(r.sentAt, locale)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="visit-no-show">
        <h3 id="visit-no-show" className="nf-label">
          {a.noShows}
        </h3>
        {!detail || detail.noShows === null ? (
          <p className="mt-inline nf-body-sm text-[var(--nf-content-muted)]">{a.noShowsUnreadable}</p>
        ) : detail.noShows.length === 0 ? (
          <p className="mt-inline nf-body-sm text-[var(--nf-content-muted)]">{a.noShowNone}</p>
        ) : (
          <ul className="nf-vdesk__history mt-inline">
            {detail.noShows.map((n) => (
              <li key={n.reportedAt}>
                <span>{n.absentRole === "lister" ? a.absentLister : a.absentRequester}</span>
                <span className="text-[var(--nf-content-secondary)]">
                  {n.resolution === "upheld" ? a.resolutionUpheld : n.resolution === "overturned" ? a.resolutionOverturned : a.resolutionOpen}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
