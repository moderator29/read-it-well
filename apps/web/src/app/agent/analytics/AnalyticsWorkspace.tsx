import {
  formatDate,
  formatMoney,
  formatNumber,
  formatRating,
  type Dictionary,
  type Locale,
} from "@naijafinds/i18n";
import { fill } from "../_copy";
import type {
  AgentAnalytics,
  CalendarPressure,
  ListingPerformance,
  RequestOutcomes,
  SettledPoint,
} from "@/lib/agent/analytics-queries";
import { CALENDAR_WINDOW_NIGHTS } from "@/lib/agent/analytics-queries";
import { HOLD_WINDOW_HOURS } from "@/lib/agent/bookings-schema";
import type { ListingStatus } from "@/lib/agent/listings-queries";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Amount, Figure } from "@/components/ui/Amount";
import { Progress } from "@/components/ui/Progress";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

/**
 * The agent's analytics console.
 *
 * A server component, like the earnings workspace beside it: nothing on this
 * screen mutates anything, so there is no reason to ship any of it as client
 * JavaScript. Every figure arrives already computed by analytics-queries.ts and
 * this file only decides how to draw it. That split is deliberate rather than
 * tidy: the rules about which numbers may exist belong in one file, and a
 * component that did its own arithmetic on the way to the screen would be a
 * second place for one of them to be broken.
 *
 * THE RULE THIS WHOLE FILE OBEYS. A missing figure is drawn as missing. There
 * is no branch anywhere below that substitutes a zero, an average, a dash
 * standing in for a plausible value, or a bar of nominal height so a chart does
 * not look bare. When a read failed the panel says it could not be read; when a
 * read succeeded and found nothing, the panel says there is nothing. Those two
 * sentences are different and the screen never blurs them, because a host who
 * reads "no requests" during an outage will conclude their listings are dead.
 */

export type AnalyticsCopy = Dictionary["agentAnalytics"];

/**
 * "1 hour" and "{count} hours", borrowed from the bookings card.
 *
 * Passed in rather than re-keyed under agentAnalytics because those two
 * sentences already exist, correctly, in all four languages. Adding a second
 * pair would mean three more translations of a phrase this repository has
 * already translated, and the two copies would eventually disagree.
 */
export type HoursCopy = { one: string; other: string };

/* --------------------------------------------------------------- fragments */

/**
 * A headline tile.
 *
 * Not `StatCard`, which is the dashboard's tile and requires a signed
 * month-over-month delta on every instance. There is no honest delta available
 * for three of these four figures: a lifetime total has nothing to compare
 * against, a rating moves so slowly that a month's change is mostly noise, and
 * a forward calendar figure has no previous value at all. A tile that demanded
 * one would have been fed an invented number, which is the exact failure this
 * screen exists to avoid.
 *
 * The figure is never truncated. A clipped number is not a shortened number, it
 * is a wrong one, so the tile grows and the digits stay whole.
 */
function Tile({
  icon,
  label,
  value,
  note,
}: {
  icon: BrandIconName;
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="nf-card flex flex-col gap-2 p-3.5 sm:gap-2.5 sm:p-4">
      <span className="h-9 w-9 shrink-0 sm:h-10 sm:w-10">
        <BrandIcon name={icon} fill />
      </span>
      <div className="min-w-0">
        <p className="text-[0.75rem] font-medium leading-snug text-[var(--nf-content-muted)]">
          {label}
        </p>
        <p className="mt-0.5 leading-tight">{value}</p>
        {note ? (
          <p className="mt-1 text-[0.6875rem] leading-snug text-[var(--nf-content-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** The size and weight every headline figure is set at. */
const TILE_FIGURE =
  "text-[1.0625rem] font-bold tracking-tight text-[var(--nf-content-primary)] sm:text-[1.25rem]";

/**
 * What a tile shows when its own source could not be read.
 *
 * Set in the muted tone at the same size as a figure, so the tile keeps its
 * shape in the grid and the absence reads as an absence rather than as a
 * rendering fault. It is deliberately not a zero and deliberately not a dash.
 */
function Unknown({ label }: { label: string }) {
  return (
    <span className="text-[0.8125rem] font-semibold text-[var(--nf-content-muted)]">{label}</span>
  );
}

/**
 * A panel whose read failed.
 *
 * The warning surface rather than the error surface: nothing is broken for the
 * host and nothing they did caused it, the platform simply cannot answer right
 * now. Both tokens are real ones from tokens.css.
 */
function Unavailable({ children }: { children: string }) {
  return (
    <p
      className="rounded-[var(--nf-radius-md)] p-3.5 text-[0.8125rem] font-medium leading-relaxed"
      style={{ background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }}
      role="status"
    >
      {children}
    </p>
  );
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="nf-card p-4 sm:p-5">
      <h2 className="nf-h3">{title}</h2>
      {blurb ? (
        <p className="mt-1.5 max-w-[68ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {blurb}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ trend */

function monthLabel(point: SettledPoint, locale: Locale, style: "short" | "long"): string {
  const date = new Date(Date.UTC(point.year, Math.max(0, point.month - 1), 1));
  return style === "short"
    ? formatDate(date, locale, { month: "short" })
    : formatDate(date, locale, { month: "long", year: "numeric" });
}

/**
 * Settled money by month, as bars.
 *
 * BARS RATHER THAN THE AREA SPARKLINE THAT ALREADY EXISTS. A monthly settled
 * total is a discrete bucket, not a continuous signal. An area or line chart
 * draws a value for every instant between two months, so a host reading it
 * halfway along the segment between June and August sees a figure that was
 * never true of any day, and the smoothing flatters a jagged history into a
 * trend. Bars can only claim what actually happened, which is the whole
 * requirement here. The sparkline also divides by `data.length - 1`, so a host
 * with a single settled month would have been handed an infinity.
 *
 * NO CHARTING LIBRARY. This is a flex row and a percentage height. The platform
 * has never carried a chart dependency and one bar chart is not the reason to
 * start (Master Rule 52).
 *
 * THE TWO PIXEL FLOOR ON A NON-ZERO BAR. A month that settled a genuinely tiny
 * amount beside a record month resolves to a fraction of a percent and draws as
 * nothing, which a reader correctly interprets as "no money that month" and
 * which is false. The floor is stated in pixels rather than as a minimum
 * percentage on purpose: a percentage floor would scale with the plot and start
 * inflating the value it is meant to keep visible, while two pixels is a
 * visibility device that cannot be misread as a quantity. A month that really
 * did settle nothing gets no bar at all, which is the true picture.
 */
function SettledTrend({
  t,
  points,
  locale,
}: {
  t: AnalyticsCopy;
  points: SettledPoint[];
  locale: Locale;
}) {
  const peak = points.reduce((most, point) => Math.max(most, point.agentShareMinor), 0);
  if (points.length === 0 || peak <= 0) {
    return <p className="text-[0.8125rem] text-[var(--nf-content-secondary)]">{t.trend.empty}</p>;
  }

  const best = points.reduce((top, point) =>
    point.agentShareMinor > top.agentShareMinor ? point : top,
  );

  return (
    <div>
      <ol className="flex h-36 gap-1 border-b border-[var(--nf-border-subtle)] sm:h-44 sm:gap-2">
        {points.map((point) => (
          <li key={point.key} className="flex min-w-0 flex-1 items-end">
            {/* The only accessible rendering of the value. A bar has no text,
                so each one carries its own month and amount for a reader who
                is not looking at the picture. */}
            <span className="sr-only">
              {monthLabel(point, locale, "long")}: {formatMoney(point.agentShareMinor, locale)}
            </span>
            <span
              aria-hidden="true"
              className="block w-full rounded-t-[var(--nf-radius-xs)]"
              style={{
                height: `${(point.agentShareMinor / peak) * 100}%`,
                minHeight: point.agentShareMinor > 0 ? 2 : 0,
                background: "var(--nf-gradient-agent)",
              }}
            />
          </li>
        ))}
      </ol>

      <p aria-hidden="true" className="mt-1.5 flex gap-1 sm:gap-2">
        {points.map((point) => (
          <span
            key={point.key}
            className="min-w-0 flex-1 truncate text-center text-[0.625rem] text-[var(--nf-content-muted)]"
          >
            {monthLabel(point, locale, "short")}
          </span>
        ))}
      </p>

      {/* The scale, stated. Bars with no axis are a shape rather than a
          measurement, and this is the cheapest honest axis: name the tallest
          one and every other bar can be read against it. */}
      <p className="mt-3 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        {t.trend.peak}: <span className="font-semibold">{monthLabel(best, locale, "long")}</span>
        {", "}
        <Amount
          minorUnits={best.agentShareMinor}
          locale={locale}
          className="font-semibold text-[var(--nf-content-primary)]"
        />
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- requests */

/**
 * One outcome and its count.
 *
 * `alarm` is only ever passed for the unanswered group, and only lights up when
 * that group is non-empty. A permanently red row would teach a host to ignore
 * the colour; a row that turns red the day something is actually going wrong
 * keeps meaning something.
 */
function OutcomeRow({
  label,
  count,
  locale,
  alarm = false,
}: {
  label: string;
  count: number;
  locale: Locale;
  alarm?: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-[var(--nf-border-subtle)] py-2 last:border-b-0">
      <span className="text-[0.8125rem] text-[var(--nf-content-secondary)]">{label}</span>
      <Figure
        value={count}
        locale={locale}
        className={
          alarm
            ? "text-[0.9375rem] font-bold text-[var(--nf-state-error)]"
            : "text-[0.9375rem] font-bold text-[var(--nf-content-primary)]"
        }
      />
    </li>
  );
}

function RequestsPanel({
  t,
  hours,
  outcomes,
  locale,
}: {
  t: AnalyticsCopy;
  hours: HoursCopy;
  outcomes: RequestOutcomes;
  locale: Locale;
}) {
  if (outcomes.received === 0) {
    return <p className="text-[0.8125rem] text-[var(--nf-content-secondary)]">{t.requests.empty}</p>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ul>
        <OutcomeRow label={t.requests.received} count={outcomes.received} locale={locale} />
        <OutcomeRow label={t.requests.confirmed} count={outcomes.confirmed} locale={locale} />
        <OutcomeRow label={t.requests.cancelled} count={outcomes.cancelled} locale={locale} />
        <OutcomeRow label={t.requests.waiting} count={outcomes.waiting} locale={locale} />
        <OutcomeRow
          label={t.requests.lapsed}
          count={outcomes.lapsed}
          locale={locale}
          alarm={outcomes.lapsed > 0}
        />
      </ul>

      <div>
        <h3 className="text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
          {t.requests.answerTitle}
        </h3>
        {/* Three states, not two. "We could not read your history" and "you
            have answered nothing" arrive at the same empty median, and telling
            a host the second when the first happened is a false statement
            about their own conduct. */}
        {!outcomes.answerTimingReadable ? (
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {t.requests.answerUnavailable}
          </p>
        ) : outcomes.medianAnswerHours === null ? (
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {t.requests.answerNone}
          </p>
        ) : (
          <>
            {/* The phrase, not a bare number with a unit glued on. "3 hours"
                is written differently in the four languages this ships in, and
                the two strings that already say it correctly live on the
                bookings card, so they are reused rather than retranslated. */}
            <p className="nf-numeric mt-1 text-[1.25rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
              {outcomes.medianAnswerHours === 1
                ? hours.one
                : fill(hours.other, {
                    count: formatNumber(outcomes.medianAnswerHours, locale),
                  })}
            </p>
            <p className="mt-1.5 max-w-[46ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {outcomes.answered === 1
                ? t.requests.answerBodyOne
                : fill(t.requests.answerBody, { count: formatNumber(outcomes.answered, locale) })}
            </p>
          </>
        )}

        {/* Only drawn when there is something to explain. A host with nothing
            lapsed does not need a paragraph about a failure mode they have
            never had. */}
        {outcomes.lapsed > 0 ? (
          <p className="mt-4 max-w-[46ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {fill(t.requests.lapsedNote, { hours: HOLD_WINDOW_HOURS })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- calendar */

function CalendarPanel({
  t,
  calendar,
  locale,
}: {
  t: AnalyticsCopy;
  calendar: CalendarPressure;
  locale: Locale;
}) {
  if (calendar.listings === 0) {
    return <p className="text-[0.8125rem] text-[var(--nf-content-secondary)]">{t.calendar.none}</p>;
  }

  const open = Math.max(0, calendar.offeredNights - calendar.bookedNights - calendar.blockedNights);

  return (
    <div>
      <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {calendar.listings === 1
          ? fill(t.calendar.bodyOne, { offered: formatNumber(calendar.offeredNights, locale) })
          : fill(t.calendar.body, {
              count: formatNumber(calendar.listings, locale),
              offered: formatNumber(calendar.offeredNights, locale),
            })}
      </p>

      {/* The accessible name and the value text are both supplied, because a
          progressbar announcing a bare percentage would say "twenty per cent"
          with no subject. */}
      <Progress
        className="mt-3"
        value={calendar.bookedNights}
        max={calendar.offeredNights}
        label={t.calendar.booked}
        valueText={`${formatNumber(calendar.bookedNights, locale)} / ${formatNumber(
          calendar.offeredNights,
          locale,
        )}`}
        showValue
        locale={locale}
      />

      <ul className="mt-3 grid grid-cols-3 gap-3">
        <li>
          <p className="text-[0.6875rem] text-[var(--nf-content-muted)]">{t.calendar.booked}</p>
          <Figure
            value={calendar.bookedNights}
            locale={locale}
            className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]"
          />
        </li>
        <li>
          <p className="text-[0.6875rem] text-[var(--nf-content-muted)]">{t.calendar.blocked}</p>
          <Figure
            value={calendar.blockedNights}
            locale={locale}
            className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]"
          />
        </li>
        <li>
          <p className="text-[0.6875rem] text-[var(--nf-content-muted)]">{t.calendar.open}</p>
          <Figure
            value={open}
            locale={locale}
            className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]"
          />
        </li>
      </ul>

      {calendar.blockedNights > 0 ? (
        <p className="mt-3 max-w-[62ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.calendar.blockedNote}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- listings */

function ratingCell(
  t: AnalyticsCopy,
  row: ListingPerformance,
  locale: Locale,
): React.ReactNode {
  if (row.rating === null || row.reviews === 0) {
    return <span className="text-[var(--nf-content-muted)]">{t.listings.noRating}</span>;
  }
  const rating = formatRating(row.rating, locale);
  return row.reviews === 1
    ? fill(t.listings.ratingWithOne, { rating })
    : fill(t.listings.ratingWith, { rating, count: formatNumber(row.reviews, locale) });
}

function ListingsPanel({
  t,
  statusLabels,
  rows,
  locale,
}: {
  t: AnalyticsCopy;
  statusLabels: Record<ListingStatus, string>;
  rows: ListingPerformance[];
  locale: Locale;
}) {
  if (rows.length === 0) {
    return <p className="text-[0.8125rem] text-[var(--nf-content-secondary)]">{t.listings.empty}</p>;
  }

  return (
    <>
      {/*
        Phone: stacked cards, not a shrunken table.

        This is the same decision the earnings ledger made and for the same
        reason. Six columns on a 390px screen either scroll sideways or shrink
        their figures, and neither is how somebody compares two properties.
        Both branches read the identical rows, so the two renderings can never
        disagree about a number.
      */}
      <ul className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <li
            key={row.listingId}
            className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 flex-1 text-[0.875rem] font-semibold">{row.title}</p>
              <Amount
                minorUnits={row.settledShareMinor}
                locale={locale}
                className="text-[0.875rem] font-bold"
              />
            </div>
            <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
              {statusLabels[row.status]}
              {" · "}
              {t.listings.columnRequests} {formatNumber(row.requests, locale)}
              {" · "}
              {t.listings.columnConfirmed} {formatNumber(row.confirmed, locale)}
              {" · "}
              {t.listings.columnNights} {formatNumber(row.nightsSold, locale)}
            </p>
            <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
              {ratingCell(t, row, locale)}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden sm:block">
        <Table caption={t.listings.title} density="compact">
          <THead>
            <TR>
              <TH>{t.listings.columnListing}</TH>
              <TH align="end">{t.listings.columnRequests}</TH>
              <TH align="end">{t.listings.columnConfirmed}</TH>
              <TH align="end">{t.listings.columnNights}</TH>
              <TH align="end">{t.listings.columnSettled}</TH>
              <TH>{t.listings.columnRating}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.listingId}>
                <TD className="font-medium text-[var(--nf-content-primary)]">
                  {row.title}
                  <span className="block text-[0.6875rem] font-normal text-[var(--nf-content-muted)]">
                    {statusLabels[row.status]}
                  </span>
                </TD>
                <TD align="end">{formatNumber(row.requests, locale)}</TD>
                <TD align="end">{formatNumber(row.confirmed, locale)}</TD>
                <TD align="end">{formatNumber(row.nightsSold, locale)}</TD>
                <TD align="end" className="font-semibold text-[var(--nf-content-primary)]">
                  <Amount minorUnits={row.settledShareMinor} locale={locale} />
                </TD>
                <TD>{ratingCell(t, row, locale)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ screen */

export function AnalyticsWorkspace({
  t,
  hours,
  statusLabels,
  analytics,
  locale,
}: {
  t: AnalyticsCopy;
  hours: HoursCopy;
  statusLabels: Record<ListingStatus, string>;
  analytics: AgentAnalytics;
  locale: Locale;
}) {
  const { earnings, requests, listings, calendar, reviews } = analytics;

  /*
   * The whole-screen empty state, and the condition is deliberately strict.
   *
   * It fires only when every read SUCCEEDED and every one of them came back
   * with nothing. A single null anywhere means at least one question went
   * unanswered, and an agent who has thirty stays must never be shown "nothing
   * to measure yet" because one table was slow. In that case the panels render
   * and each one says for itself what it does and does not know.
   */
  const nothingHappenedYet =
    listings !== null &&
    listings.length === 0 &&
    requests !== null &&
    requests.received === 0 &&
    reviews !== null &&
    reviews.count === 0 &&
    earnings.readable &&
    earnings.months.length === 0;

  if (nothingHappenedYet) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center sm:py-14">
        <span className="block h-20 w-20">
          <BrandIcon name="report-stats" fill />
        </span>
        <h2 className="nf-h3">{t.emptyTitle}</h2>
        <p className="mx-auto max-w-[42ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.emptyBody}
        </p>
        <ButtonLink href="/agent/list" variant="primary">
          {t.emptyAction}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile
          icon="wallet-secure"
          label={t.headline.settled}
          value={
            earnings.readable ? (
              <Amount
                minorUnits={earnings.totalAgentShareMinor}
                locale={locale}
                className={TILE_FIGURE}
              />
            ) : (
              <Unknown label={t.unavailable} />
            )
          }
        />
        <Tile
          icon="calendar-check"
          label={t.headline.stays}
          value={
            requests ? (
              <Figure value={requests.confirmed} locale={locale} className={TILE_FIGURE} />
            ) : (
              <Unknown label={t.unavailable} />
            )
          }
        />
        <Tile
          icon="reviews"
          label={t.headline.rating}
          value={
            reviews === null ? (
              <Unknown label={t.unavailable} />
            ) : reviews.average === null ? (
              <Unknown label={t.headline.ratingNone} />
            ) : (
              <Figure
                value={formatRating(reviews.average, locale)}
                locale={locale}
                className={TILE_FIGURE}
              />
            )
          }
          /* The count travels with the average, always. 5.0 from one review
             and 5.0 from two hundred are different facts, and an average shown
             on its own invites a host to read the wrong one. */
          note={
            reviews && reviews.count > 0
              ? reviews.count === 1
                ? t.headline.ratingFromOne
                : fill(t.headline.ratingFrom, { count: formatNumber(reviews.count, locale) })
              : undefined
          }
        />
        <Tile
          icon="calendar-clock"
          label={fill(t.headline.booked, { nights: CALENDAR_WINDOW_NIGHTS })}
          value={
            calendar ? (
              <Figure
                value={calendar.bookedNights}
                locale={locale}
                suffix={`/ ${formatNumber(calendar.offeredNights, locale)}`}
                className={TILE_FIGURE}
              />
            ) : (
              <Unknown label={t.unavailable} />
            )
          }
        />
      </div>

      <Section title={t.trend.title} blurb={t.trend.blurb}>
        {earnings.readable ? (
          <SettledTrend t={t} points={analytics.trend} locale={locale} />
        ) : (
          <Unavailable>{t.unavailable}</Unavailable>
        )}
      </Section>

      <Section title={t.requests.title} blurb={t.requests.blurb}>
        {requests ? (
          <RequestsPanel t={t} hours={hours} outcomes={requests} locale={locale} />
        ) : (
          <Unavailable>{t.unavailable}</Unavailable>
        )}
      </Section>

      <Section title={fill(t.calendar.title, { nights: CALENDAR_WINDOW_NIGHTS })}>
        {calendar ? (
          <CalendarPanel t={t} calendar={calendar} locale={locale} />
        ) : (
          <Unavailable>{t.unavailable}</Unavailable>
        )}
      </Section>

      <Section title={t.listings.title} blurb={t.listings.blurb}>
        {listings ? (
          <ListingsPanel t={t} statusLabels={statusLabels} rows={listings} locale={locale} />
        ) : (
          <Unavailable>{t.unavailable}</Unavailable>
        )}
      </Section>

      {/*
        The absences, stated on the screen rather than only in a comment.

        A host looking at an analytics page assumes it shows everything the
        platform knows, so silence about views and saves would be read as "no
        views and no saves" rather than "not counted". Naming what is missing,
        and why, is the difference between a limited report and a misleading
        one, and it is also the only reason a host will trust the numbers that
        ARE here.
      */}
      <section className="nf-card p-4 sm:p-5">
        <h2 className="nf-h3">{t.notCounted.title}</h2>
        <ul className="mt-3 space-y-2.5">
          {[t.notCounted.views, t.notCounted.saves, t.notCounted.occupancy].map((line) => (
            <li
              key={line}
              className="max-w-[76ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
            >
              {line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
