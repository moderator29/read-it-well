import Link from "next/link";
import { formatDate, formatNumber, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { axisTicks, type VizPoint } from "@/components/ui/charts/chart-rules";
import { absentMonths, monthPoint } from "@/components/agent/charts/month-points";
import type { Featured } from "@/lib/workspace/dashboard-agent";
import { isBlank, monthGrid, type ContactThread, type MonthBar, type Reminder } from "@/lib/workspace/dashboard-model";
import { DashCard, EmptyNote, Unavailable } from "./DashCard";
import { fillWords } from "./dashboard-format";
import { MonthSeriesChart, type MonthSeries } from "./MonthSeriesChart";

type Base = { t: Dictionary; locale: Locale; area?: string };

/** The featured listing, with its real counts. A count that could not be read is a dash, never a zero. */
export function FeaturedCard({ featured, hasLive, t, locale, area }: Base & { featured: Featured | null; hasLive: boolean }) {
  const w = t.workspaceDash.agent.featured;
  if (featured === null) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-featured">
        {hasLive ? (
          <Unavailable text={t.workspaceDash.common.unavailable} />
        ) : (
          <EmptyNote title={w.empty} body={w.emptyBody} cta={{ href: "/agent/list", label: w.cta }} />
        )}
      </DashCard>
    );
  }
  const n = (value: number | null) => (value === null ? "–" : formatNumber(value, locale));
  return (
    <DashCard title={w.title} action={{ href: `/agent/listings/${featured.listingId}`, label: w.open }} area={area} testId="wsd-featured">
      <div className="wsd-feat">
        {featured.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="wsd-feat__photo" src={featured.photoUrl} alt="" loading="lazy" />
        ) : (
          <div className="wsd-feat__photo wsd-feat__photo--none" aria-hidden="true">
            <UiIcon name="picture" size={28} />
          </div>
        )}
        <div className="grid gap-sm content-start">
          <div>
            <p className="wsd-row__title">{featured.title}</p>
            <p className="wsd-row__sub">
              {[featured.place, featured.bedrooms ? fillWords(w.bedrooms, { count: formatNumber(featured.bedrooms, locale) }) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <dl className="wsd-feat__stats">
            <div className="wsd-stat">
              <dt>{w.enquiries}</dt>
              <dd data-testid="wsd-featured-enquiries">{n(featured.enquiries30)}</dd>
              <small>{w.enquiriesSub}</small>
            </div>
            <div className="wsd-stat">
              <dt>{w.opened}</dt>
              <dd>{n(featured.week?.opened ?? null)}</dd>
              <small>{w.openedSub}</small>
            </div>
            <div className="wsd-stat">
              <dt>{w.viewings}</dt>
              <dd>{n(featured.week?.booked ?? null)}</dd>
              <small>{w.viewingsSub}</small>
            </div>
          </dl>
          <p className="wsd-note">{featured.enquiries30 && featured.enquiries30 > 0 ? w.why : w.whyNewest}</p>
        </div>
      </div>
    </DashCard>
  );
}

function barPoints(bars: readonly MonthBar[], locale: Locale, blank: boolean): VizPoint[] {
  if (blank) return absentMonths(bars[bars.length - 1]!.key, bars.length, locale);
  return bars.map((b) => {
    const [year, month] = b.key.split("-").map(Number) as [number, number];
    return { ...monthPoint({ key: b.key, year, month, minor: 0 }, locale), value: b.count, display: formatNumber(b.count, locale) };
  });
}

/** Enquiries and visits by month for the last six months, from real rows. */
export function PerformanceCard({
  enquiries,
  visits,
  t,
  locale,
  area,
}: Base & { enquiries: readonly MonthBar[] | null; visits: readonly MonthBar[] | null }) {
  const w = t.workspaceDash.agent.chart;
  if (enquiries === null && visits === null) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-chart">
        <Unavailable text={t.workspaceDash.common.unavailable} />
      </DashCard>
    );
  }
  if (isBlank(enquiries) && isBlank(visits) && enquiries !== null && visits !== null) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-chart">
        <EmptyNote title={w.empty} />
      </DashCard>
    );
  }
  const series: MonthSeries[] = [];
  for (const [key, label, bars] of [
    ["enquiries", w.enquiries, enquiries],
    ["visits", w.visits, visits],
  ] as const) {
    if (bars === null) continue;
    const blank = isBlank(bars);
    const max = Math.max(0, ...bars.map((b) => b.count));
    series.push({
      key,
      label,
      points: barPoints(bars, locale, blank),
      yTicks: axisTicks(max, (v) => formatNumber(v, locale)),
    });
  }
  return (
    <DashCard title={w.title} area={area} testId="wsd-chart">
      <MonthSeriesChart title={w.title} periodHead={w.periodHead} empty={w.empty} series={series} />
      {enquiries === null || visits === null ? <Unavailable text={t.workspaceDash.common.unavailable} /> : null}
    </DashCard>
  );
}

/** Who wrote to you lately, with a message button and, where a number is allowed, a call button. */
export function ContactsCard({
  contacts,
  numbers,
  t,
  area,
}: Base & { contacts: readonly ContactThread[] | null; numbers: ReadonlyMap<string, string> }) {
  const w = t.workspaceDash.agent.contacts;
  if (contacts === null) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-contacts">
        <Unavailable text={t.workspaceDash.common.unavailable} />
      </DashCard>
    );
  }
  if (contacts.length === 0) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-contacts">
        <EmptyNote title={w.empty} body={w.emptyBody} />
      </DashCard>
    );
  }
  return (
    <DashCard title={w.title} action={{ href: "/agent/messages?filter=all", label: t.workspaceDash.common.viewAll }} area={area} testId="wsd-contacts">
      <ul className="wsd-list">
        {contacts.map((c) => {
          const number = c.counterpartId ? numbers.get(c.counterpartId) : undefined;
          return (
            <li key={c.id} className="wsd-row">
              {c.counterpartAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="wsd-avatar" src={c.counterpartAvatarUrl} alt="" loading="lazy" />
              ) : (
                <InitialsTile name={c.counterpartName} size="md" />
              )}
              <span className="wsd-row__body">
                <span className="wsd-row__title">{c.counterpartName}</span>
                {c.listingTitle ? (
                  <>
                    <br />
                    <span className="wsd-row__sub">{fillWords(w.about, { listing: c.listingTitle })}</span>
                  </>
                ) : null}
              </span>
              <span className="wsd-row__end">
                <Link href={`/agent/messages/${c.id}`} className="wsd-call nf-tap" aria-label={`${w.message}: ${c.counterpartName}`}>
                  <UiIcon name="chat-bubble" size={20} />
                </Link>
                {number ? (
                  <a href={`tel:${number}`} className="wsd-call nf-tap" aria-label={`${w.call}: ${c.counterpartName}`}>
                    <UiIcon name="phone" size={20} />
                  </a>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </DashCard>
  );
}

/** Follow-ups due, visits today, listings to confirm: each a line with a chevron to the screen that handles it. */
export function RemindersCard({
  items,
  unread,
  t,
  locale,
  area,
}: Base & { items: readonly Reminder[]; unread: readonly string[] }) {
  const w = t.workspaceDash.agent.reminders;
  const text = (r: Reminder) =>
    r.kind === "followup" ? plural(r.count, w.followups, locale) : r.kind === "visit" ? plural(r.count, w.visits, locale) : plural(r.count, w.expiring, locale);
  const icon = (r: Reminder) => (r.kind === "followup" ? "chat-bubble" : r.kind === "visit" ? "calendar-clock" : "clock");
  return (
    <DashCard title={w.title} area={area} testId="wsd-reminders">
      {items.length === 0 && unread.length === 0 ? <EmptyNote title={w.empty} body={w.emptyBody} /> : null}
      {items.length > 0 ? (
        <ul className="wsd-list">
          {items.map((r) => (
            <li key={r.kind}>
              <Link href={r.href} className="wsd-row nf-tap" data-testid={`wsd-reminder-${r.kind}`}>
                <IconPlate size="sm" shape="round" tone={r.kind === "expiring" ? "warning" : "brand"}>
                  <UiIcon name={icon(r)} size={20} />
                </IconPlate>
                <span className="wsd-row__body">
                  <span className="wsd-row__title">{text(r)}</span>
                  {r.overdue ? (
                    <>
                      <br />
                      <span className="wsd-row__sub">{plural(r.overdue, w.overdue, locale)}</span>
                    </>
                  ) : null}
                </span>
                <span className="wsd-row__end">
                  <UiIcon name="chevron-right" size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {unread.length > 0 ? <Unavailable text={w.unread} /> : null}
    </DashCard>
  );
}

/** The month, with a dot on every day that has a visit; each such day opens the visits screen. */
export function CalendarCard({
  today,
  counts,
  t,
  locale,
  area,
}: Base & { today: string; counts: ReadonlyMap<string, number> | null }) {
  const w = t.workspaceDash.agent.calendar;
  const weeks = monthGrid(today, counts ?? new Map());
  const monthName = formatDate(new Date(`${today.slice(0, 7)}-15T12:00:00Z`), locale, { month: "long", year: "numeric", timeZone: "UTC" });
  /* Monday-first weekday initials from Intl: 5 Oct 2026 is a Monday. */
  const dow = Array.from({ length: 7 }, (_, i) =>
    formatDate(new Date(Date.UTC(2026, 9, 5 + i, 12)), locale, { weekday: "narrow", timeZone: "UTC" }),
  );
  const any = counts !== null && [...counts].some(([day, n]) => day.startsWith(today.slice(0, 7)) && n > 0);
  return (
    <DashCard title={`${w.title} · ${monthName}`} action={{ href: "/agent/inspections", label: w.open }} area={area} testId="wsd-calendar">
      {counts === null ? <Unavailable text={t.workspaceDash.common.unavailable} /> : null}
      <div className="wsd-cal" role="grid" aria-label={monthName}>
        {dow.map((d, i) => (
          <span key={i} className="wsd-cal__dow" role="columnheader">
            {d}
          </span>
        ))}
        {weeks.flat().map((cell, i) =>
          cell.day === null ? (
            <span key={`b${i}`} className="wsd-cal__day wsd-cal__day--blank" role="gridcell" />
          ) : cell.count > 0 ? (
            <Link
              key={cell.day}
              href="/agent/inspections"
              role="gridcell"
              className={["wsd-cal__day", "wsd-cal__day--has", cell.isToday ? "wsd-cal__day--today" : ""].filter(Boolean).join(" ")}
              aria-label={`${cell.date}, ${plural(cell.count, w.visits, locale)}`}
            >
              {cell.date}
              <span className="wsd-cal__dot" aria-hidden="true" />
            </Link>
          ) : (
            <span key={cell.day} role="gridcell" className={["wsd-cal__day", cell.isToday ? "wsd-cal__day--today" : ""].filter(Boolean).join(" ")}>
              {cell.date}
            </span>
          ),
        )}
      </div>
      {counts !== null ? <p className="wsd-note">{any ? w.legend : w.empty}</p> : null}
    </DashCard>
  );
}
