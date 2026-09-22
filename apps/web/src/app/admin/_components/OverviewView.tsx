import { formatDate, formatMoney, formatNumber, type Locale } from "@vallo/i18n";
import { AreaTimeChart } from "@/components/agent/charts/AreaTimeChart";
import { GroupedBarChart } from "@/components/agent/charts/GroupedBarChart";
import { MeterBar } from "@/components/agent/charts/MeterBar";
import type { AlertView } from "@/lib/admin/queries";
import type {
  CollectedRange,
  CollectedSeries,
  ConsolePulse,
  JobHealth,
  ListingsByRole,
  SupplyByType,
  SupplyKind,
} from "./console-shapes";
import { alertBadge, alertSubline, niceTicks, periodDelta, sinceLabel } from "./metrics";
import {
  AlertList,
  KpiGrid,
  KpiStrip,
  Panel,
  PanelEmpty,
  PanelLink,
  PanelUnavailable,
  type AlertRow,
  type KpiItem,
} from "./panels";
import { RangeSelect } from "./RangeSelect";

/**
 * THE OVERVIEW, drawn from 5EAA44CB: the pulse strip, four KPI cards, the
 * money area chart with its range, supply by type, new listings per month by
 * who listed them, and the recent alerts.
 *
 * Every figure arrives as a prop from `admin/page.tsx`, which reads it under
 * the admin gate through `lib/admin/reads/overview.ts` and friends. A read
 * that failed arrives as null and its tile or panel says so. Nothing here
 * computes a number that was not handed to it, and no trend is drawn without
 * both periods behind it.
 */
export type OverviewProps = {
  locale: Locale;
  now: number;
  range: CollectedRange;
  /** `getQueueCounts().listings`: submitted, under review or approved and not yet live. */
  openReviews: number | null;
  pulse: ConsolePulse | null;
  collected: CollectedSeries | null;
  supply: SupplyByType | null;
  byRole: ListingsByRole | null;
  jobs: JobHealth | null;
  alerts: AlertView[] | "unavailable";
};

const KIND_LABEL: Record<SupplyKind, string> = {
  rent: "Rent",
  buy: "Buy",
  land: "Land",
  hotels: "Hotels",
  shortlets: "Shortlets",
  restaurants: "Restaurants",
};

const RANGE_LABEL: Record<CollectedRange, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};

export function alertRows(alerts: readonly AlertView[], now: number, locale: Locale): AlertRow[] {
  return alerts.map((alert) => {
    const badge = alertBadge(alert.severity, alert.status);
    const icon =
      badge.tone === "success"
        ? "check-circle"
        : badge.tone === "error"
          ? "alert-triangle"
          : "info-circle";
    return {
      id: alert.id,
      title: alert.title,
      sub: alertSubline(alert.description, alert.entityType),
      when: sinceLabel(alert.createdAt, now, (d) =>
        formatDate(d, locale, { timeZone: "Africa/Lagos", day: "numeric", month: "short" }),
      ),
      tone: badge.tone,
      word: badge.word,
      icon: { tier: "admin", name: icon },
      href: `/admin/alerts${alert.status === "resolved" ? "?status=resolved" : ""}`,
    };
  });
}

function jobsHealthy(jobs: JobHealth): { healthy: number; total: number } {
  const active = jobs.jobs.filter((job) => job.active);
  const healthy = active.filter((job) => !job.stale && job.lastOutcome !== null && job.lastOutcome !== "failed");
  return { healthy: healthy.length, total: active.length };
}

export function OverviewView(props: OverviewProps) {
  const { locale, pulse } = props;
  const n = (value: number) => formatNumber(value, locale);
  const money = (minor: number) => formatMoney(minor, locale);
  const pending = (what: string) => `${what} did not load; it retries every minute`;
  const days = pulse?.daily ?? [];
  const spark = (id: string, pick: (d: ConsolePulse["daily"][number]) => number, label: string) =>
    pulse ? { id, values: days.map(pick), label } : null;
  const jobs = props.jobs ? jobsHealthy(props.jobs) : null;

  const strip: KpiItem[] = [
    {
      key: "live",
      icon: { tier: "admin", name: "clipboard" },
      label: "Listings live",
      value: pulse ? n(pulse.listingsLive) : null,
      delta: pulse ? periodDelta(pulse.listingsLive, pulse.listingsLiveWeekAgo) : null,
      spark: spark("strip-live", (d) => d.liveAtClose, "Live listings, last 14 days"),
      pending: pending("This figure"),
    },
    {
      key: "signups",
      icon: { tier: "ui", name: "user" },
      label: "Sign-ups today",
      value: pulse ? n(pulse.signupsToday) : null,
      delta: pulse ? periodDelta(pulse.signupsToday, pulse.signupsYesterday) : null,
      spark: spark("strip-signups", (d) => d.signups, "Sign-ups, last 14 days"),
      pending: pending("This figure"),
    },
    {
      key: "collected-today",
      icon: { tier: "admin", name: "naira" },
      label: "Naira transacted today",
      value: pulse ? money(pulse.collectedTodayMinor) : null,
      delta: pulse ? periodDelta(pulse.collectedTodayMinor, pulse.collectedYesterdayMinor) : null,
      spark: spark("strip-collected", (d) => d.collectedMinor, "Naira collected, last 14 days"),
      pending: pending("This figure"),
    },
    {
      key: "jobs",
      icon: { tier: "admin", name: "shield-check" },
      label: "Jobs healthy",
      value: jobs && jobs.total > 0 ? `${Math.round((jobs.healthy / jobs.total) * 100)}%` : null,
      caption: jobs ? `${jobs.healthy} of ${jobs.total} jobs` : undefined,
      pending: pending("The job reads"),
    },
  ];

  const cards: KpiItem[] = [
    {
      key: "live-card",
      icon: { tier: "ui", name: "home" },
      label: "Live listings",
      value: pulse ? n(pulse.listingsLive) : null,
      delta: pulse ? periodDelta(pulse.listingsLive, pulse.listingsLiveWeekAgo) : null,
      caption: pulse ? "vs last week" : "Examples not counted",
      spark: spark("card-live", (d) => d.liveAtClose, "Live listings, last 14 days"),
      href: "/admin/listings",
      pending: pending("This figure"),
    },
    {
      key: "supply-card",
      icon: { tier: "ui", name: "plus" },
      label: "New supply this week",
      value: pulse ? n(pulse.newSupplyWeek) : null,
      delta: pulse ? periodDelta(pulse.newSupplyWeek, pulse.newSupplyPrevWeek) : null,
      caption: "vs last week",
      spark: spark("card-supply", (d) => d.submitted, "Listings submitted, last 14 days"),
      href: "/admin/supply",
      pending: pending("This figure"),
    },
    {
      key: "collected-card",
      icon: { tier: "admin", name: "naira" },
      label: "Naira transacted",
      value: pulse ? money(pulse.collectedWeekMinor) : null,
      delta: pulse ? periodDelta(pulse.collectedWeekMinor, pulse.collectedPrevWeekMinor) : null,
      caption: "vs last week",
      spark: spark("card-collected", (d) => d.collectedMinor, "Naira collected, last 14 days"),
      href: "/admin/money",
      pending: pending("This figure"),
    },
    {
      key: "reviews-card",
      icon: { tier: "ui", name: "document" },
      label: "Open reviews",
      value: props.openReviews === null ? null : n(props.openReviews),
      /* No delta: an open count has no history to compare against until
         something snapshots it. The caption says what the number is instead. */
      delta: null,
      caption: "Waiting on a decision",
      spark: spark("card-reviews", (d) => d.submitted, "Listings submitted, last 14 days"),
      href: "/admin/listings",
      pending: pending("The queue count"),
    },
  ];

  return (
    <div className="nf-admin-stack">
      <h1 className="sr-only">Console overview</h1>
      <KpiStrip items={strip} label="Platform pulse" />
      <KpiGrid items={cards} label="This week" />

      <div className="nf-admin-grid nf-admin-grid--wide-left">
        <Panel
          id="ov-collected"
          title="Naira transacted over time"
          action={<RangeSelect value={props.range} options={RANGE_LABEL} label="Range" />}
        >
          <CollectedChart series={props.collected} locale={locale} />
        </Panel>

        <Panel id="ov-supply" title="Supply by type">
          <SupplyTable supply={props.supply} locale={locale} />
        </Panel>
      </div>

      <div className="nf-admin-grid nf-admin-grid--wide-left">
        <Panel id="ov-roles" title="New listings per month">
          <RoleChart byRole={props.byRole} locale={locale} />
        </Panel>

        <Panel id="ov-alerts" title="Recent alerts" action={<PanelLink href="/admin/alerts">View all</PanelLink>}>
          {props.alerts === "unavailable" ? (
            <PanelUnavailable what="The alert desk" />
          ) : props.alerts.length === 0 ? (
            <PanelEmpty
              icon="verified"
              title="No alerts raised"
              body="When a job, a payment or a safety check needs a person, it is raised here and on the Alerts desk."
            />
          ) : (
            <AlertList rows={alertRows(props.alerts.slice(0, 5), props.now, locale)} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function monthTick(start: string, locale: Locale, withYear = false): string {
  const date = new Date(`${start.length === 7 ? `${start}-01` : start}T12:00:00+01:00`);
  return formatDate(date, locale, {
    timeZone: "Africa/Lagos",
    month: "short",
    ...(withYear ? { year: "numeric" } : null),
  });
}

function dayTick(start: string, locale: Locale, withYear = false): string {
  const date = new Date(`${start}T12:00:00+01:00`);
  return formatDate(date, locale, {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : null),
  });
}

function CollectedChart({ series, locale }: { series: CollectedSeries | null; locale: Locale }) {
  if (!series) {
    return <PanelUnavailable what="Money collected over time" />;
  }
  const total = series.buckets.reduce((sum, b) => sum + b.amountMinor, 0);
  if (total === 0) {
    return (
      <PanelEmpty
        title="No money has moved yet in this range"
        body="Nothing has been collected through Vallo in this window, so there is no line to draw. The first successful payment will appear here."
      />
    );
  }
  const monthly = series.range === "12m";
  const ticks = niceTicks(Math.max(...series.buckets.map((b) => b.amountMinor)));
  const points = series.buckets.map((b) => ({
    key: b.start,
    tick: monthly ? monthTick(b.start, locale) : dayTick(b.start, locale),
    readout: monthly ? monthTick(b.start, locale, true) : dayTick(b.start, locale, true),
    value: b.amountMinor,
    display: `${formatMoney(b.amountMinor, locale)} · ${formatNumber(b.count, locale)} payments`,
  }));
  return (
    <AreaTimeChart
      points={points}
      yTicks={ticks.map((v) => ({ value: v, label: formatMoney(v, locale, "NGN", { compact: true }) }))}
      label="Naira transacted over time"
      height={220}
      tickEvery={monthly ? 1 : series.range === "90d" ? 2 : 5}
    />
  );
}

function SupplyTable({ supply, locale }: { supply: SupplyByType | null; locale: Locale }) {
  if (!supply) {
    return <PanelUnavailable what="Supply by type" />;
  }
  if (supply.total === 0) {
    return (
      <PanelEmpty
        title="No real supply live yet"
        body="No listing from a real owner, agent or firm is live. Example listings are counted on the Examples desk, not here."
      />
    );
  }
  const rows = [...supply.rows].sort((a, b) => b.count - a.count);
  const max = rows[0]?.count ?? 0;
  return (
    <div className="nf-admin-dist" role="table" aria-label="Supply by type">
      <div className="nf-admin-dist__row nf-admin-dist__row--head" role="row">
        <span role="columnheader">Type</span>
        <span role="columnheader" className="nf-admin-dist__num">Count</span>
        <span role="columnheader" className="nf-admin-dist__num">%</span>
        <span role="columnheader" className="sr-only">Share</span>
      </div>
      {rows.map((row, i) => {
        const share = supply.total > 0 ? Math.round((row.count / supply.total) * 100) : 0;
        return (
          <div key={row.kind} className="nf-admin-dist__row" role="row">
            <span className="nf-admin-dist__name" role="cell">
              <span className="nf-admin-dist__dot" style={{ opacity: [1, 0.84, 0.69, 0.55, 0.42][Math.min(i, 4)] }} aria-hidden="true" />
              {KIND_LABEL[row.kind]}
            </span>
            <span className="nf-admin-dist__num nf-numeric" role="cell">{formatNumber(row.count, locale)}</span>
            <span className="nf-admin-dist__num nf-numeric" role="cell">{share}%</span>
            <span role="cell">
              <MeterBar value={row.count} max={max} rank={i} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RoleChart({ byRole, locale }: { byRole: ListingsByRole | null; locale: Locale }) {
  if (!byRole) {
    return <PanelUnavailable what="New listings by lister role" />;
  }
  const total = byRole.months.reduce((sum, m) => sum + m.owner + m.agent + m.firm, 0);
  if (total === 0) {
    return (
      <PanelEmpty
        title="No listings created in these months"
        body="Nobody has created a listing in the last twelve months. Each new listing is counted here under the role of whoever listed it."
      />
    );
  }
  const max = Math.max(...byRole.months.flatMap((m) => [m.owner, m.agent, m.firm]));
  return (
    <GroupedBarChart
      label="New listings per month by lister role"
      series={[
        { key: "owner", label: "Owner" },
        { key: "agent", label: "Agent" },
        { key: "firm", label: "Firm" },
      ]}
      groups={byRole.months.map((m) => ({
        key: m.month,
        tick: monthTick(m.month, locale),
        readout: monthTick(m.month, locale, true),
        values: [m.owner, m.agent, m.firm],
      }))}
      yTicks={niceTicks(max).map((v) => ({ value: v, label: formatNumber(v, locale) }))}
      height={200}
    />
  );
}
