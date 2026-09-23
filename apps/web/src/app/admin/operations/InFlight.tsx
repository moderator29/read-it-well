import { PG_CRON_JOBS } from "@/lib/admin/reads/jobs";
import { formatDate, formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import { tx } from "@/app/admin/_components/shell-text";
import { MeterBar } from "@/components/agent/charts/MeterBar";
import type { InspectionActivity, InspectionState } from "@/lib/admin/reads/shapes";
import { Badge, CalmNote, NotWired, Panel, PanelUnavailable, type BadgeTone } from "../_components/panels";

/**
 * Operations > In flight: the platform's processes that belong to people
 * rather than to a desk queue, so an operator can see them move (closing
 * audit, section E). Read only.
 *
 * Inspections are read today (`getInspectionActivity`). Account deletions and
 * business transfers are readable only by their own people (Requests A12,
 * A13); the database's own jobs one by one need A5; the money watch's own
 * table needs admin-money's request 10. Each of those says so.
 */
const STATE_WORD: Record<InspectionState, { word: string; tone: BadgeTone; means: string }> = {
  REQUESTED: { word: "Requested", tone: "pending", means: "waiting on the lister" },
  PROPOSED: { word: "New time proposed", tone: "pending", means: "waiting on the requester" },
  CONFIRMED: { word: "Confirmed", tone: "info", means: "booked, not yet held" },
  COMPLETED: { word: "Completed", tone: "success", means: "held" },
  DECLINED: { word: "Declined", tone: "error", means: "the lister said no" },
  WITHDRAWN: { word: "Withdrawn", tone: "error", means: "the requester withdrew" },
};

const ORDER: InspectionState[] = ["REQUESTED", "PROPOSED", "CONFIRMED", "COMPLETED", "DECLINED", "WITHDRAWN"];

export function InFlight({ locale, inspections }: { locale: Locale; inspections: InspectionActivity | null }) {
  const c = getDictionary(locale).admin.shell.operations;
  return (
    <div className="nf-admin-stack">
      <div className="nf-admin-grid nf-admin-grid--wide-left">
        <Panel id="ops-inspections" title={c.inspections}>
          {!inspections ? (
            <PanelUnavailable what={tx(locale, "inflightTheInspections")} locale={locale} />
          ) : (
            <>
              <div className="nf-admin-dist" role="table" aria-label="Inspections by state">
                <div className="nf-admin-dist__row nf-admin-dist__row--head" role="row">
                  <span role="columnheader">State</span>
                  <span role="columnheader" className="nf-admin-dist__num">Count</span>
                  <span role="columnheader" className="nf-admin-dist__num">%</span>
                  <span role="columnheader" className="sr-only">Share</span>
                </div>
                {ORDER.map((state, i) => {
                  const count = inspections.byState[state];
                  const max = Math.max(...ORDER.map((s) => inspections.byState[s]), 0);
                  return (
                    <div key={state} className="nf-admin-dist__row" role="row">
                      <span className="nf-admin-dist__name" role="cell">
                        <Badge tone={STATE_WORD[state].tone}>{STATE_WORD[state].word}</Badge>
                        <span className="nf-admin-dt__sub">{STATE_WORD[state].means}</span>
                      </span>
                      <span className="nf-admin-dist__num nf-numeric" role="cell">{formatNumber(count, locale)}</span>
                      <span className="nf-admin-dist__num nf-numeric" role="cell">
                        {inspections.total > 0 ? `${Math.round((count / inspections.total) * 100)}%` : "0%"}
                      </span>
                      <span role="cell">
                        <MeterBar value={count} max={max} rank={i} />
                      </span>
                    </div>
                  );
                })}
              </div>
              {inspections.total === 0 && (
                <div className="nf-admin-dist__note">
                  <CalmNote
                    title={tx(locale, "inflightNoInspectionRequestedYet")}
                    fills={tx(locale, "inflightEveryInspectionIsCountedHere")}
                    creates={tx(locale, "inflightARenterAsksToView")}
                  />
                </div>
              )}
            </>
          )}
        </Panel>
        <Panel id="ops-inspections-recent" title={c.newestRequests}>
          {!inspections ? (
            <PanelUnavailable what={tx(locale, "inflightTheInspections")} locale={locale} />
          ) : inspections.recent.length === 0 ? (
            <CalmNote title={tx(locale, "inflightNothingRequestedYet")} fills={tx(locale, "inflightTheEightNewestInspectionRequests")} />
          ) : (
            <ul className="nf-admin-kinds">
              {inspections.recent.map((row) => (
                <li key={row.id}>
                  <span>
                    {row.listingTitle ?? "A listing"}
                    <span className="nf-admin-dt__sub">
                      {formatDate(new Date(row.slotAt ?? row.requestedAt), locale, {
                        timeZone: "Africa/Lagos",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {row.outcome ? ` · ${row.outcome}` : ""}
                    </span>
                  </span>
                  <Badge tone={STATE_WORD[row.state].tone}>{STATE_WORD[row.state].word}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="ops-deletions" title={c.accountDeletions}>
          <NotWired
            title={tx(locale, "inflightNotReadableByAnAdmin")}
            what={tx(locale, "inflightPeopleWhoAskedToClose")}
            request={tx(locale, "inflightOnlyTheAccountHolderMay")}
          />
        </Panel>
        <Panel id="ops-transfers" title={c.businessTransfers}>
          <NotWired
            title={tx(locale, "inflightNotReadableByAnAdmin")}
            what={tx(locale, "inflightBusinessesOfferedFromOneOwner")}
            request={tx(locale, "inflightOnlyTheTwoPartiesMay")}
          />
        </Panel>
        <Panel id="ops-db-jobs" title={tx(locale, "inflightDatabaseJobsOneByOne")}>
          <NotWired
            what={tx(locale, "inflightEachOfTheDatabaseJobs")
              .replace("{count}", String(PG_CRON_JOBS.length))
              .replace("{names}", PG_CRON_JOBS.map((j) => j.name).join(", "))}
            request={tx(locale, "inflightTheDatabaseDoesNotExpose")}
          />
        </Panel>
        <Panel id="ops-recon" title={tx(locale, "inflightMoneyReconciliationWatch")}>
          <NotWired
            what={tx(locale, "inflightTheMoneyReconcileSLast")}
            request={tx(locale, "inflightThatWatchIsNotReadable")}
          />
        </Panel>
      </div>
    </div>
  );
}
