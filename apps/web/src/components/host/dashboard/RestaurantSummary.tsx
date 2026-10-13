import Link from "next/link";
import { countOf, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { KpiTile } from "@/components/ui/KpiTile";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import type { DeskTable } from "@/app/host/reservations/desk";
import type { RestaurantFigures, WeekPoint } from "./restaurant-figures";
import "./dashboard.css";

type Words = Dictionary["hostDash"]["restaurant"];

/** How many of today's tables the home lists before pointing at the desk. */
const TODAY_ROWS = 6;

/**
 * THE RESTAURANT'S HOME, COMPACT (reference: a restaurant dashboard).
 *
 * Today's covers, the bookings waiting for an answer, the tables seated and
 * this month's no-shows; the next seven days as a line; today's tables as a
 * list that opens the table desk. The desk itself (`/host/reservations`) is
 * not changed; this only points at it.
 *
 * There is no table grid. A grid of tables with their state needs a table
 * record per table, and `restaurant_tables` does not exist: the database holds
 * reservations, not a floor plan. Drawing tiles anyway would be invented data.
 */
export function RestaurantSummary({
  figures,
  words,
  locale,
}: {
  figures: RestaurantFigures;
  words: Words;
  locale: Locale;
}) {
  const tag = locale === "en" ? "en-NG" : locale;
  const tables = (n: number) => plural(n, words.tables, locale);

  if (!figures.hasTables) {
    return (
      <section className="nf-dash" aria-label={words.summaryLabel} data-testid="restaurant-summary">
        <EmptyState
          icon="concierge-bell"
          title={words.emptyTitle}
          body={words.emptyBody}
          action={
            <ButtonLink href="/host/reservations" variant="secondary" size="lg">
              {words.openDesk}
            </ButtonLink>
          }
        />
      </section>
    );
  }

  const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
  /* Called-off tables are on the desk; the home lists what is still a table. */
  const todays = figures.todayTables.filter((t) => t.status !== "CANCELLED");
  const shown = todays.slice(0, TODAY_ROWS);
  const more = todays.length - shown.length;

  return (
    <section className="nf-dash" aria-label={words.summaryLabel} data-testid="restaurant-summary">
      <div className="nf-dash__tiles nf-dash__tiles--four">
        <KpiTile
          icon="users"
          label={words.covers}
          value={figures.coversExpected}
          tag={tag}
          sub={words.coversSub.replace("{tables}", tables(figures.coverTables))}
          href="/host/reservations"
        />
        <KpiTile
          icon="hourglass"
          label={words.toConfirm}
          value={figures.toConfirm}
          tag={tag}
          sub={figures.toConfirm === 0 ? words.toConfirmNone : figures.toConfirmToday > 0 ? plural(figures.toConfirmToday, words.toConfirmToday, locale) : undefined}
          href="/host/reservations"
        />
        <KpiTile
          icon="utensils"
          label={words.seated}
          value={figures.seated}
          tag={tag}
          sub={figures.seated === 0 ? words.seatedNone : countOf(figures.seatedGuests, "guests", locale)}
        />
        {figures.noShowsMonth === null ? (
          <div className="nf-kpi">
            <p className="nf-kpi__head">
              <span className="nf-section-label nf-kpi__label">{words.noShows}</span>
            </p>
            <p className="nf-kpi__figure">{"–"}</p>
            <p className="nf-kpi__sub">{words.noShowsUnavailable}</p>
          </div>
        ) : (
          <KpiTile icon="circle-x" label={words.noShows} value={figures.noShowsMonth} tag={tag} sub={words.noShowsSub} />
        )}
      </div>

      <div className="nf-dash__split">
        <WeekLine week={figures.week} today={figures.today} words={words} locale={locale} />

        <ListGroup
          label={words.todayTitle}
          labelAs="h2"
          action={
            <Link href="/host/reservations" className="nf-link-quiet nf-tap">
              {words.openDesk}
            </Link>
          }
        >
          {shown.length === 0 ? (
            <li className="nf-list-item">
              <p className="nf-fd__empty">{words.todayEmpty}</p>
            </li>
          ) : (
            shown.map((t) => <TodayRow key={t.id} table={t} time={time} words={words} locale={locale} />)
          )}
          {more > 0 ? (
            <ListRow href="/host/reservations" title={plural(more, words.todayMore, locale)} chevron />
          ) : null}
        </ListGroup>
      </div>
    </section>
  );
}

const TONE: Record<string, StatusTone> = { PENDING: "warning", CONFIRMED: "brand", COMPLETED: "success", NO_SHOW: "danger" };

function TodayRow({ table, time, words, locale }: { table: DeskTable; time: Intl.DateTimeFormat; words: Words; locale: Locale }) {
  const status =
    table.status === "PENDING"
      ? words.status.request
      : table.status === "CONFIRMED"
        ? words.status.confirmed
        : table.status === "COMPLETED"
          ? words.status.seated
          : words.status.noShow;
  return (
    <ListRow
      href="/host/reservations"
      leading={<InitialsTile name={table.guestName} />}
      title={table.guestName}
      sub={
        <span className="nf-today__time">
          {time.format(new Date(table.reservedFor))} {"·"} {countOf(table.partySize, "guests", locale)}
        </span>
      }
      status={<StatusPill tone={TONE[table.status] ?? "neutral"}>{status}</StatusPill>}
    />
  );
}

/* ---------------------------------------------------------------- the line */

const W = 420;
const H = 150;
const PAD_X = W / 14;
const PAD_TOP = 24;
const PAD_BOTTOM = 12;

/**
 * Tables booked on each of the next seven days, a line through real counts.
 * A week with nothing in it says so in words instead of drawing a flat line;
 * a week that could not be read says that. The numbers are also in the table
 * for a screen reader.
 */
function WeekLine({ week, today, words, locale }: { week: WeekPoint[] | null; today: string; words: Words; locale: Locale }) {
  const tag = locale === "en" ? "en-NG" : locale;
  const total = week?.reduce((n, p) => n + p.bookings, 0) ?? 0;
  const dayName = new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" });
  return (
    <section className="nf-week" aria-label={words.weekTitle} data-testid="restaurant-week">
      <h2 className="nf-week__title">{words.weekTitle}</h2>
      {week === null ? (
        <p className="nf-week__empty" role="status">
          {words.weekUnavailable}
        </p>
      ) : total === 0 ? (
        <p className="nf-week__empty">{words.weekEmpty}</p>
      ) : (
        <>
          <p className="nf-week__figure">{plural(total, words.weekTotal, locale)}</p>
          <Chart week={week} />
          <div className="nf-week__days" aria-hidden="true">
            {week.map((p) => (
              <span key={p.day} className={p.day === today ? "nf-week__day--today" : undefined}>
                {dayName.format(new Date(`${p.day}T12:00:00Z`))}
              </span>
            ))}
          </div>
          <ul className="sr-only">
            {week.map((p) => (
              <li key={p.day}>
                {dayName.format(new Date(`${p.day}T12:00:00Z`))}:{" "}
                {words.weekDay.replace("{tables}", plural(p.bookings, words.tables, locale)).replace("{guests}", countOf(p.guests, "guests", locale))}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Chart({ week }: { week: WeekPoint[] }) {
  const max = Math.max(1, ...week.map((p) => p.bookings));
  const step = (W - PAD_X * 2) / (week.length - 1);
  const points = week.map((p, i) => ({
    x: PAD_X + i * step,
    y: PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 - p.bookings / max),
    n: p.bookings,
  }));
  const line = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${points[points.length - 1]!.x.toFixed(1)} ${H} L ${points[0]!.x.toFixed(1)} ${H} Z`;
  return (
    <svg className="nf-week__chart" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      {[0, 0.5, 1].map((share) => {
        const y = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * share;
        return <line key={share} x1={0} x2={W} y1={y} y2={y} className="nf-week__grid" />;
      })}
      <path d={area} className="nf-week__area" />
      <path d={line} className="nf-week__line" />
      {points.map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r={4} className={i === 0 ? "nf-week__dot nf-week__dot--today" : "nf-week__dot"} />
          <text x={pt.x} y={pt.y - 10} className="nf-week__value">
            {pt.n}
          </text>
        </g>
      ))}
    </svg>
  );
}
