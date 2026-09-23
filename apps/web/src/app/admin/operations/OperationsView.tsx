import { formatDate, formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import { tx } from "@/app/admin/_components/shell-text";
import type { AuditActivity, AuditRowView } from "@/lib/admin/audit-queries";
import { actionLabel, entityTypeLabel } from "@/lib/admin/audit-filter";
import type { AlertView } from "@/lib/admin/queries";
import { AreaTimeChart } from "@/components/agent/charts/AreaTimeChart";
import type { AlertTrend, InspectionActivity, JobHealth, NotificationActivity, PersonTier, PushActivity } from "@/lib/admin/reads/shapes";
import { EmailOutboxPanel, PushActivityPanels } from "./PushActivityPanels";
import { InFlight } from "./InFlight";
import {
  PG_CRON_JOBS,
  durationLabel,
  jobStatus,
  jobTitle,
  type DatabaseJobsSummary,
} from "@/lib/admin/reads/jobs";
import { niceTicks, periodDelta, sinceLabel } from "../_components/metrics";
import { alertRows } from "../_components/OverviewView";
import {
  AlertList,
  Badge,
  CalmNote,
  EmptyChart,
  KpiGrid,
  NotWired,
  PageHead,
  Panel,
  PanelLink,
  PanelUnavailable,
  TabRow,
  type AlertRow,
  type KpiItem,
} from "../_components/panels";

/**
 * OPERATIONS, drawn from 01F7DFC7 panel two: jobs healthy and active alerts,
 * the Scheduled jobs / Alerts / Audit log tabs over the jobs table, and the
 * recent alerts and audit log side by side beneath. A fourth tab,
 * Notifications, carries every notification the platform sends (founder
 * update, 22 September).
 *
 * The data is real today: each job's last run is read from `audit_log`
 * through `lib/admin/reads/operations.ts`, the alerts through
 * `getRiskAlerts`, the log through `getAuditLog` and `getAuditActivity`. The
 * database's own pg_cron jobs are summarised from the platform's watch job
 * until Request A5 lists them; notification volumes need Request A6.
 */
export type OpsTab = "jobs" | "alerts" | "audit" | "notifications" | "inflight";

export type OperationsProps = {
  locale: Locale;
  now: number;
  tab: OpsTab;
  jobs: JobHealth | null;
  database: DatabaseJobsSummary | null;
  /** Scheduled runs per day, fourteen days, for the jobs card's line. */
  runDays: { day: string; runs: number; failed: number }[] | null;
  trend: AlertTrend | null;
  alerts: AlertView[] | "unavailable";
  audit: AuditRowView[] | "unavailable";
  activity: AuditActivity | null;
  notifications: NotificationActivity | null;
  /** Push, from `push_queue` and `push_deliveries` (read on the Notifications tab only). */
  push?: PushActivity | null;
  /** Published badge tiers of the people the audit rows name (`getPersonTiers`). */
  tiers?: ReadonlyMap<string, PersonTier>;
  inspections?: InspectionActivity | null;
};

function stamp(iso: string | null, locale: Locale): string {
  if (!iso) return "Never";
  return formatDate(new Date(iso), locale, {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

export function auditRows(
  rows: readonly AuditRowView[],
  now: number,
  locale: Locale,
  tiers?: ReadonlyMap<string, PersonTier>,
): AlertRow[] {
  return rows.map((row) => {
    const system = row.actorId === null;
    return {
      id: row.id,
      title: `${row.actorName ?? (system ? "System" : "An admin")}: ${actionLabel(row.action)}`,
      sub: `${entityTypeLabel(row.entityType)}${row.entityId ? ` · ${row.entityId.slice(0, 14)}` : ""}`,
      when: sinceLabel(row.createdAt, now, (d) =>
        formatDate(d, locale, { timeZone: "Africa/Lagos", day: "numeric", month: "short" }),
      ),
      tone: "info",
      word: system ? "System" : "Admin",
      icon: { tier: "admin", name: system ? "operations" : "user-check" },
      href: row.entityId ? `/admin/audit?q=${encodeURIComponent(row.entityId)}` : "/admin/audit",
      tier: row.actorId ? (tiers?.get(row.actorId) ?? null) : null,
    };
  });
}

export function OperationsView(props: OperationsProps) {
  const { locale, jobs } = props;
  const shell = getDictionary(locale).admin.shell;
  const c = shell.operations;
  const active = jobs?.jobs.filter((j) => j.active) ?? [];
  const healthy = active.filter((j) => jobStatus(j).tone === "success" || jobStatus(j).tone === "info");

  const kpis: KpiItem[] = [
    {
      key: "jobs",
      label: shell.overview.jobsHealthy,
      value: jobs ? `${healthy.length} / ${active.length}` : null,
      caption: jobs && active.length > 0 ? c.onSchedule.replace("{percent}", String(Math.round((healthy.length / active.length) * 100))) : undefined,
      spark: props.runDays
        ? { id: "ops-runs", values: props.runDays.map((d) => d.runs - d.failed), label: "Scheduled runs that did not fail, per day, last 14 days" }
        : null,
      pending: "The job reads did not load; they retry every minute",
    },
    {
      key: "alerts",
      label: c.activeAlerts,
      value: props.trend ? formatNumber(props.trend.openNow, locale) : null,
      delta: props.trend ? periodDelta(props.trend.openNow, props.trend.openWeekAgo, { higherIsGood: false }) : null,
      caption: props.trend ? c.vsWeekAgo : undefined,
      spark: props.trend
        ? { id: "ops-alerts", values: props.trend.daily.map((d) => d.opened), label: "Alerts raised per day, last 14 days" }
        : null,
      href: "/admin/alerts",
      pending: "The alert count did not load; it retries every minute",
    },
  ];

  const tabs = [
    { key: "jobs", label: c.tabJobs },
    { key: "alerts", label: c.tabAlerts, count: props.trend?.openNow },
    { key: "audit", label: c.tabAudit },
    { key: "notifications", label: c.tabNotifications },
    { key: "inflight", label: c.tabInFlight },
  ].map((t) => ({
    ...t,
    href: t.key === "jobs" ? "/admin/operations" : `/admin/operations?tab=${t.key}`,
    active: props.tab === t.key,
  }));

  return (
    <div className="nf-admin-stack">
      <PageHead title={c.title} lede={c.lede} />
      <div className="nf-admin-ops-kpis">
        <KpiGrid items={kpis} label={c.lede} />
      </div>
      <TabRow items={tabs} label={c.title} />

      {props.tab === "jobs" && <JobsPanel {...props} />}
      {props.tab === "alerts" && (
        <Panel id="ops-alerts-all" title={tx(locale, "opsAlerts")} action={<PanelLink href="/admin/alerts">{tx(locale, "opsOpenTheAlertDesk")}</PanelLink>}>
          <AlertsBody alerts={props.alerts} now={props.now} locale={locale} limit={40} />
        </Panel>
      )}
      {props.tab === "audit" && <AuditPanel {...props} />}
      {props.tab === "notifications" && (
        <>
          <PushActivityPanels push={props.push ?? null} locale={locale} />
          <div className="nf-admin-grid nf-admin-grid--halves">
            <NotificationsPanel activity={props.notifications} locale={locale} />
            <EmailOutboxPanel locale={locale} />
          </div>
        </>
      )}
      {props.tab === "inflight" && <InFlight locale={locale} inspections={props.inspections ?? null} />}

      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="ops-recent-alerts" title={shell.overview.alertsTitle} action={<PanelLink href="/admin/alerts">{shell.states.viewAll}</PanelLink>}>
          <AlertsBody alerts={props.alerts} now={props.now} locale={locale} limit={4} />
        </Panel>
        <Panel id="ops-recent-audit" title={c.tabAudit} action={<PanelLink href="/admin/audit">{shell.states.viewAll}</PanelLink>}>
          {props.audit === "unavailable" ? (
            <PanelUnavailable what={tx(locale, "opsTheAuditLog")} locale={locale} />
          ) : props.audit.length === 0 ? (
            <CalmNote
              title={tx(locale, "opsNothingRecordedYet")}
              fills={tx(locale, "opsEveryDecisionTakenOnThis")}
              action={{ href: "/admin/audit", label: "Open the audit log" }}
            />
          ) : (
            <AlertList rows={auditRows(props.audit.slice(0, 5), props.now, locale, props.tiers)} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function AlertsBody({
  alerts,
  now,
  locale,
  limit,
}: {
  alerts: AlertView[] | "unavailable";
  now: number;
  locale: Locale;
  limit: number;
}) {
  if (alerts === "unavailable") return <PanelUnavailable what={tx(locale, "opsTheAlertDesk")} locale={locale} />;
  if (alerts.length === 0) {
    return (
      <CalmNote
        kind="clear"
        title={tx(locale, "opsNoAlertsRaised")}
        fills={tx(locale, "opsAFailedJobAMoney")}
        creates={tx(locale, "opsTheScheduledJobsTheMoney")}
        action={{ href: "/admin/alerts", label: "Open the alert desk" }}
      />
    );
  }
  return <AlertList rows={alertRows(alerts.slice(0, limit), now, locale)} />;
}

function JobsPanel({ jobs, database, locale, now }: OperationsProps) {
  const c = getDictionary(locale).admin.shell.operations;
  const word: Record<string, string> = {
    Healthy: c.healthy,
    Attention: c.attention,
    Failed: c.failed,
    Overdue: c.overdue,
    "No run yet": c.noRunYet,
  };
  return (
    <Panel id="ops-jobs" flush className="nf-admin-panel--table">
      {!jobs ? (
        <div className="nf-admin-panel__pad">
          <PanelUnavailable what={tx(locale, "opsTheScheduledJobRuns")} locale={locale} />
        </div>
      ) : (
        <div className="nf-admin-dt-wrap">
          <table className="nf-admin-dt">
            <caption className="sr-only">Scheduled jobs, their schedule in Lagos time, last run, duration and status</caption>
            <thead>
              <tr>
                <th scope="col">{c.jobName}</th>
                <th scope="col">{c.schedule}</th>
                <th scope="col">{c.lastRun}</th>
                <th scope="col">{c.duration}</th>
                <th scope="col">{c.status}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.jobs.map((job) => {
                const status = jobStatus(job);
                return (
                  <tr key={job.name}>
                    <th scope="row" className="nf-admin-dt__name">
                      {jobTitle(job.name)}
                      <span className="nf-admin-dt__sub">Vercel Cron · {job.cron}</span>
                    </th>
                    <td>{job.schedule}</td>
                    <td className="nf-numeric">
                      {stamp(job.lastRunAt, locale)}
                      {job.lastRunAt && (
                        <span className="nf-admin-dt__sub">
                          {sinceLabel(job.lastRunAt, now, (d) => d.toISOString().slice(0, 10))}
                        </span>
                      )}
                    </td>
                    <td className="nf-numeric">{durationLabel(job.lastDurationMs)}</td>
                    <td>
                      <Badge tone={status.tone} solid={status.word === "Failed"}>
                        {word[status.word] ?? status.word}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <th scope="row" className="nf-admin-dt__name">
                  {c.databaseJobs}
                  <span className="nf-admin-dt__sub">pg_cron, {PG_CRON_JOBS.length} scheduled in the database</span>
                </th>
                <td colSpan={3} className="nf-admin-dt__muted">
                  {database
                    ? `Watched ${stamp(database.checkedAt, locale)}: ${database.failures} failed in the last day${database.recovered > 0 ? ` (${database.recovered} recovered since)` : ""}, ${database.neverRan} not yet run, ${database.stale} overdue. One row per job needs Request A5.`
                    : "The watch job has not reported yet. One row per job needs Request A5."}
                </td>
                <td>
                  {database ? (
                    database.failures - database.recovered > 0 || database.stale > 0 ? (
                      <Badge tone="error">{c.attention}</Badge>
                    ) : (
                      <Badge tone="success">{c.healthy}</Badge>
                    )
                  ) : (
                    <Badge tone="pending">{c.noRunYet}</Badge>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function AuditPanel({ audit, activity, locale, now, tiers }: OperationsProps) {
  return (
    <div className="nf-admin-grid nf-admin-grid--wide-left">
      <Panel id="ops-audit-chart" title={tx(locale, "opsRecordedActionsPerDay")}>
        {!activity ? (
          <PanelUnavailable what={tx(locale, "opsTheAuditActivity")} locale={locale} />
        ) : activity.total === 0 ? (
          <EmptyChart
            height={180}
            yLabels={niceTicks(10, 5).map((v) => String(v))}
            xLabels={activity.perDay.map((p, i) => (i % 7 === 0 ? p.day.slice(5) : ""))}
            note={{
              title: tx(locale, "opsNothingRecordedIn30Days"),
              fills: tx(locale, "opsEachDecisionAndEachScheduled"),
            }}
          />
        ) : (
          <>
            <AreaTimeChart
              label={`Audit log entries per day, last ${activity.windowDays} days`}
              points={activity.perDay.map((p) => {
                const d = new Date(`${p.day}T12:00:00Z`);
                return {
                  key: p.day,
                  tick: formatDate(d, locale, { day: "numeric", month: "short", timeZone: "UTC" }),
                  readout: formatDate(d, locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
                  value: p.count,
                  display: `${formatNumber(p.count, locale)} entries`,
                };
              })}
              yTicks={niceTicks(Math.max(...activity.perDay.map((p) => p.count))).map((v) => ({
                value: v,
                label: formatNumber(v, locale),
              }))}
              height={180}
              tickEvery={7}
            />
            <p className="nf-admin-panel__note">
              {formatNumber(activity.total, locale)} entries in {activity.windowDays} days
              {activity.capped ? ", counted up to the read's cap of 5,000, so the true total is higher" : ""}.
            </p>
          </>
        )}
      </Panel>
      <Panel id="ops-audit-kinds" title={tx(locale, "opsByKind")}>
        {!activity || activity.byKind.length === 0 ? (
          <CalmNote title={tx(locale, "opsNothingToGroupYet")} fills={tx(locale, "opsKindsAppearHereAsActions")} />
        ) : (
          <ul className="nf-admin-kinds">
            {activity.byKind.slice(0, 6).map((k) => (
              <li key={k.label}>
                <span>{entityTypeLabel(k.label)}</span>
                <b className="nf-numeric">{formatNumber(k.count, locale)}</b>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel id="ops-audit-rows" title={tx(locale, "opsLatestEntries")} action={<PanelLink href="/admin/audit">{tx(locale, "opsSearchTheLog")}</PanelLink>} className="nf-admin-grid__full">
        {audit === "unavailable" ? (
          <PanelUnavailable what={tx(locale, "opsTheAuditLog")} locale={locale} />
        ) : audit.length === 0 ? (
          <CalmNote title={tx(locale, "opsNothingRecordedYet")} fills={tx(locale, "opsEveryDecisionTakenOnThis2")} />
        ) : (
          <AlertList rows={auditRows(audit.slice(0, 12), now, locale, tiers)} />
        )}
      </Panel>
    </div>
  );
}

function NotificationsPanel({ activity, locale }: { activity: NotificationActivity | null; locale: Locale }) {
  return (
    <Panel id="ops-notifications" title={tx(locale, "opsNotificationsSent")}>
      {!activity ? (
        <NotWired
          title={tx(locale, "opsNotReadableByAnAdmin")}
          what={tx(locale, "opsEveryNotificationThePlatformSends")}
          request={tx(locale, "opsAdminsCannotReadTheNotifications")}
        />
      ) : activity.total === 0 ? (
        <CalmNote title={tx(locale, "opsNoNotificationsSentInThis")} fills={tx(locale, "opsEachNotificationThePlatformSends")} />
      ) : (
        <div className="nf-admin-dt-wrap">
          <table className="nf-admin-dt">
            <thead>
              <tr>
                <th scope="col">Kind</th>
                <th scope="col" className="nf-admin-dt__num">Sent</th>
                <th scope="col" className="nf-admin-dt__num">Read</th>
                <th scope="col">Last sent</th>
              </tr>
            </thead>
            <tbody>
              {activity.byKind.map((k) => (
                <tr key={k.kind}>
                  <th scope="row" className="nf-admin-dt__name">{entityTypeLabel(k.kind)}</th>
                  <td className="nf-admin-dt__num">{formatNumber(k.sent, locale)}</td>
                  <td className="nf-admin-dt__num">{formatNumber(k.read, locale)}</td>
                  <td>{stamp(k.lastSentAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
