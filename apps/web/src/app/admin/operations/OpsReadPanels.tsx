import type { ReactNode } from "react";
import { formatDate, formatNumber, type Locale } from "@vallo/i18n";
import { tx } from "@/app/admin/_components/shell-text";
import { entityTypeLabel } from "@/lib/admin/audit-filter";
import {
  dbJobState,
  reconHealthy,
  type DbJobsRead,
  type DeletionsRead,
  type HeldEventsRead,
  type OpsRead,
  type OutboxRead,
  type ReconRead,
  type TransfersRead,
} from "@/lib/admin/reads/ops-panels-model";
import { Badge, CalmNote, Panel, PanelUnavailable, type BadgeTone } from "../_components/panels";

/**
 * The Operations panels that used to say "not readable by an admin yet", now
 * drawn from the staff reads of draft op01_operations_reads.sql. Each panel
 * has four states: the read (rows), calm and empty, failed (the function
 * exists and errored), and `missing` (the draft is not applied yet), which
 * keeps the panel's old note so merging before the SQL breaks nothing.
 * Counts that wait on staff sit in the panel head as a badge.
 */

const stamp = (iso: string | null, locale: Locale) =>
  iso ? formatDate(new Date(iso), locale, { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never";

const day = (iso: string | null, locale: Locale) =>
  iso ? formatDate(new Date(iso), locale, { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }) : "None";

function waitingBadge(n: number, word: string, locale: Locale): ReactNode {
  return n > 0 ? <Badge tone="pending">{`${formatNumber(n, locale)} ${word}`}</Badge> : null;
}

/** The shared frame: unavailable and missing are decided once, here. */
function Frame<T>({
  id,
  title,
  read,
  missing,
  what,
  locale,
  action,
  children,
}: {
  id: string;
  title: string;
  read: OpsRead<T> | undefined;
  missing: ReactNode;
  what: string;
  locale: Locale;
  action?: (data: T) => ReactNode;
  children: (data: T) => ReactNode;
}) {
  const state = read ?? { state: "missing" as const };
  return (
    <Panel id={id} title={title} action={state.state === "ok" && action ? action(state.data) : undefined}>
      {state.state === "missing" ? missing : state.state === "unavailable" ? <PanelUnavailable what={what} locale={locale} /> : children(state.data)}
    </Panel>
  );
}

const STATUS_TONE: Record<string, BadgeTone> = {
  SCHEDULED: "pending",
  PURGING: "pending",
  PURGED: "success",
  CANCELLED: "info",
  PENDING: "pending",
  ACCEPTED: "success",
  DECLINED: "error",
  WITHDRAWN: "info",
  EXPIRED: "info",
  SENDING: "pending",
  SENT: "success",
  FAILED: "error",
  DROPPED: "info",
};

const word = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function Counts({ counts, locale }: { counts: Record<string, number>; locale: Locale }) {
  const keys = Object.keys(counts).sort();
  if (keys.length === 0) return null;
  return (
    <ul className="nf-admin-kinds" aria-label="Counts by status">
      {keys.map((k) => (
        <li key={k}>
          <span>{word(k)}</span>
          <b className="nf-numeric">{formatNumber(counts[k] ?? 0, locale)}</b>
        </li>
      ))}
    </ul>
  );
}

export function DeletionsPanel({ read, title, missing, locale }: { read?: OpsRead<DeletionsRead>; title: string; missing: ReactNode; locale: Locale }) {
  return (
    <Frame id="ops-deletions" title={title} read={read} missing={missing} what="the account deletions" locale={locale} action={(d) => waitingBadge(d.waiting, "waiting", locale)}>
      {(d) => (
        <>
          <Counts counts={d.byStatus} locale={locale} />
          {d.rows.length === 0 ? (
            <CalmNote kind="clear" title="No deletion waiting" fills="Accounts whose owner asked to close them, until the 30 day wait ends and the purge runs." />
          ) : (
            <ul className="nf-admin-kinds" data-testid="ops-deletions-rows">
              {d.rows.map((row) => (
                <li key={`${row.memberRef}-${row.requestedAt}`}>
                  <span>
                    Account {row.memberRef}
                    <span className="nf-admin-dt__sub">
                      asked {day(row.requestedAt, locale)}, purge after {day(row.purgeAfter, locale)}
                      {row.attempts > 0 ? `, ${row.attempts} attempts` : ""}
                      {row.lastError ? `, last error: ${row.lastError}` : ""}
                    </span>
                  </span>
                  <Badge tone={row.lastError ? "error" : (STATUS_TONE[row.status] ?? "info")}>{word(row.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Frame>
  );
}

export function TransfersPanel({ read, title, missing, locale }: { read?: OpsRead<TransfersRead>; title: string; missing: ReactNode; locale: Locale }) {
  return (
    <Frame id="ops-transfers" title={title} read={read} missing={missing} what="the business transfers" locale={locale} action={(d) => waitingBadge(d.waiting, "offered", locale)}>
      {(d) => (
        <>
          <Counts counts={d.byStatus} locale={locale} />
          {d.rows.length === 0 ? (
            <CalmNote title="No business offered yet" fills="A business offered from one owner to another, until the other side accepts, declines or the offer expires." />
          ) : (
            <ul className="nf-admin-kinds" data-testid="ops-transfers-rows">
              {d.rows.map((row) => (
                <li key={row.id}>
                  <span>
                    {row.business ?? "A business"}
                    <span className="nf-admin-dt__sub">
                      {row.from ?? "An owner"} to {row.to ?? "a member"}, offered {day(row.offeredAt, locale)}
                      {row.status === "PENDING" ? `, expires ${day(row.expiresAt, locale)}` : ""}
                    </span>
                  </span>
                  <Badge tone={STATUS_TONE[row.status] ?? "info"}>{word(row.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Frame>
  );
}

const JOB_BADGE = {
  failed: { tone: "error", word: "Failed" },
  paused: { tone: "info", word: "Paused" },
  never: { tone: "pending", word: "No run in 7 days" },
  ok: { tone: "success", word: "Succeeded" },
} as const;

export function DbJobsPanel({ read, title, missing, locale }: { read?: OpsRead<DbJobsRead>; title: string; missing: ReactNode; locale: Locale }) {
  return (
    <Frame
      id="ops-db-jobs"
      title={title}
      read={read}
      missing={missing}
      what="the database jobs"
      locale={locale}
      action={(d) => (d.failing > 0 ? <Badge tone="error">{`${formatNumber(d.failing, locale)} failing`}</Badge> : null)}
    >
      {(d) =>
        !d.available || d.jobs.length === 0 ? (
          <CalmNote title="No database jobs listed" fills="The jobs pg_cron runs inside the database, with each one's last run." />
        ) : (
          <ul className="nf-admin-kinds" data-testid="ops-db-jobs-rows">
            {d.jobs.map((job) => {
              const state = dbJobState(job);
              return (
                <li key={job.name}>
                  <span>
                    {job.name}
                    <span className="nf-admin-dt__sub">
                      {job.schedule} · last {stamp(job.lastStart, locale)}
                      {job.failed24h > 0 ? ` · ${job.failed24h} failed in 24 hours` : ""}
                      {job.lastMessage ? ` · ${job.lastMessage}` : ""}
                    </span>
                  </span>
                  <Badge tone={JOB_BADGE[state].tone}>{JOB_BADGE[state].word}</Badge>
                </li>
              );
            })}
          </ul>
        )
      }
    </Frame>
  );
}

export function ReconPanel({ read, title, missing, locale }: { read?: OpsRead<ReconRead>; title: string; missing: ReactNode; locale: Locale }) {
  return (
    <Frame
      id="ops-recon"
      title={title}
      read={read}
      missing={missing}
      what="the money reconciliation watch"
      locale={locale}
      action={(d) => waitingBadge(d.openAlerts, "open alerts", locale)}
    >
      {(d) => (
        <>
          <ul className="nf-admin-kinds" data-testid="ops-recon-watch">
            <li>
              <span>
                Last call to the reconciler
                <span className="nf-admin-dt__sub">asked {stamp(d.lastRequestedAt, locale)}, judged {stamp(d.lastJudgedAt, locale)}</span>
              </span>
              <Badge tone={reconHealthy(d) ? "success" : "error"}>{d.lastVerdict ?? "No call yet"}</Badge>
            </li>
            {d.runs.map((run) => (
              <li key={`${run.action}-${run.at}`}>
                <span>
                  {entityTypeLabel(run.action.split(".")[0] ?? run.action)} reconciliation run
                  <span className="nf-admin-dt__sub">{stamp(run.at, locale)}</span>
                </span>
              </li>
            ))}
          </ul>
          {d.runs.length === 0 && <CalmNote title="No run recorded yet" fills="Each reconciliation run writes one record the day it happens." />}
        </>
      )}
    </Frame>
  );
}

export function EmailOutboxPanel({ read, missing, locale }: { read?: OpsRead<OutboxRead>; missing: ReactNode; locale: Locale }) {
  return (
    <Frame
      id="ops-email-outbox"
      title={tx(locale, "opsEmailOutbox")}
      read={read}
      missing={missing}
      what="the email outbox"
      locale={locale}
      action={(d) => waitingBadge(d.waiting, "waiting", locale)}
    >
      {(d) => (
        <>
          <Counts counts={d.byStatus} locale={locale} />
          {d.rows.length === 0 ? (
            <CalmNote kind="clear" title="Nothing waiting or failed" fills="Every email the platform queues is sent. Anything waiting, sending, failed or dropped is listed here." />
          ) : (
            <ul className="nf-admin-kinds" data-testid="ops-outbox-rows">
              {d.rows.map((row) => (
                <li key={row.id}>
                  <span>
                    {row.template.replace(/_/g, " ")}
                    <span className="nf-admin-dt__sub">
                      {stamp(row.createdAt, locale)} · {row.attempts} attempts
                      {row.lastError ? ` · ${row.lastError}` : ""}
                    </span>
                  </span>
                  <Badge tone={STATUS_TONE[row.status] ?? "info"}>{word(row.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Frame>
  );
}

const DECISION_WORD: Record<string, string> = { "moderation.release": "Released", "moderation.remove": "Removed" };

export function HeldEventsPanel({ read, missing, locale }: { read?: OpsRead<HeldEventsRead>; missing: ReactNode; locale: Locale }) {
  return (
    <Frame
      id="ops-held-events"
      title="Held events and decisions"
      read={read}
      missing={missing}
      what="the held events"
      locale={locale}
      action={(d) => waitingBadge(d.heldCount, "held", locale)}
    >
      {(d) => (
        <>
          {d.held.length === 0 ? (
            <CalmNote kind="clear" title="No event held" fills="Events the safety scan stopped before anyone saw them." />
          ) : (
            <ul className="nf-admin-kinds" data-testid="ops-held-rows">
              {d.held.map((row) => (
                <li key={row.id}>
                  <span>
                    {row.title}
                    <span className="nf-admin-dt__sub">
                      {row.host ?? "A host"} · held {stamp(row.createdAt, locale)}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </span>
                  </span>
                  <Badge tone="pending">Held</Badge>
                </li>
              ))}
            </ul>
          )}
          <h3 className="nf-admin-subhead">Decisions taken</h3>
          {d.decisions.length === 0 ? (
            <CalmNote title="No decision recorded" fills="Releasing or removing a held event is not built yet (request AR-10); each decision will be listed here once it is." />
          ) : (
            <ul className="nf-admin-kinds" data-testid="ops-decision-rows">
              {d.decisions.map((row) => (
                <li key={`${row.eventId}-${row.at}`}>
                  <span>
                    {row.title ?? "An event"}
                    <span className="nf-admin-dt__sub">
                      {row.by ?? "An admin"} · {stamp(row.at, locale)}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </span>
                  </span>
                  <Badge tone={row.action === "moderation.remove" ? "error" : "success"}>{DECISION_WORD[row.action] ?? row.action}</Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Frame>
  );
}
