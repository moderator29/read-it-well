import { PG_CRON_JOBS } from "@/lib/admin/reads/jobs";
import { formatDate, formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import { tx } from "@/app/admin/_components/shell-text";
import { MeterBar } from "@/components/agent/charts/MeterBar";
import type { InspectionActivity, InspectionState } from "@/lib/admin/reads/shapes";
import { Badge, CalmNote, NotWired, Panel, PanelLink, PanelUnavailable, type BadgeTone } from "../_components/panels";
import { NoShowDecide } from "./NoShowDecide";
import type { OpsReads } from "@/lib/admin/reads/ops-panels-model";
import { DbJobsPanel, DeletionsPanel, HeldEventsPanel, ReconPanel, TransfersPanel } from "./OpsReadPanels";

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
  NO_SHOW: { word: "No-show", tone: "error", means: "one side says the other did not come" },
};

const ORDER: InspectionState[] = ["REQUESTED", "PROPOSED", "CONFIRMED", "COMPLETED", "NO_SHOW", "DECLINED", "WITHDRAWN"];

/* The outcome a completed viewing carries, in words: the row printed the
   column's own value ("deal_done") beside the time. */
const OUTCOME_WORD: Record<string, string> = {
  inspected: "inspected",
  deal_done: "deal done",
  no_deal: "no deal",
};

export function InFlight({ locale, inspections, ops }: { locale: Locale; inspections: InspectionActivity | null; ops?: Partial<OpsReads> }) {
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
        <Panel
          id="ops-inspections-recent"
          title={c.newestRequests}
          action={<PanelLink href="/admin/bookings/visits">{getDictionary(locale).visitOps.admin.openCalendar}</PanelLink>}
        >
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
                      {row.outcome ? ` · ${OUTCOME_WORD[row.outcome] ?? row.outcome}` : ""}
                    </span>
                  </span>
                  <Badge tone={STATE_WORD[row.state].tone}>{STATE_WORD[row.state].word}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* No-shows: the disputes waiting on a decision, and the people said
          to have stayed away twice or more in 90 days (an overturned
          report does not count). */}
      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="ops-no-show-disputes" title="Disputed no-shows">
          {!inspections || !inspections.noShows ? (
            <PanelUnavailable what="the no-shows" locale={locale} />
          ) : inspections.noShows.disputes.length === 0 ? (
            <CalmNote
              title="No disputes waiting"
              fills="A viewing marked as a no-show that the other side says they came to."
            />
          ) : (
            <ul className="nf-admin-kinds" data-testid="ops-no-show-disputes">
              {inspections.noShows.disputes.map((row) => (
                <li key={row.inspectionId}>
                  <span>
                    {row.listingTitle ?? "A listing"}
                    <span className="nf-admin-dt__sub">
                      {row.absentRole === "requester" ? "Renter marked absent" : "Lister marked absent"} · disputed{" "}
                      {formatDate(new Date(row.disputedAt), locale, {
                        timeZone: "Africa/Lagos",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {row.disputeNote ? ` · "${row.disputeNote}"` : ""}
                    </span>
                  </span>
                  <NoShowDecide inspectionId={row.inspectionId} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel id="ops-no-show-repeats" title="Repeated no-shows">
          {!inspections || !inspections.noShows ? (
            <PanelUnavailable what="the no-shows" locale={locale} />
          ) : inspections.noShows.repeats.length === 0 ? (
            <CalmNote
              title="Nobody reported twice"
              fills="People marked as a no-show two or more times in 90 days, not counting a report taken off."
            />
          ) : (
            <ul className="nf-admin-kinds" data-testid="ops-no-show-repeats">
              {inspections.noShows.repeats.map((row) => (
                <li key={row.userId}>
                  <span>
                    {row.name ?? "A member"}
                    <span className="nf-admin-dt__sub">
                      last{" "}
                      {formatDate(new Date(row.lastAt), locale, { timeZone: "Africa/Lagos", day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <Badge tone="error">{`${formatNumber(row.count, locale)} no-shows`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="nf-admin-grid nf-admin-grid--halves">
        <DeletionsPanel
          read={ops?.deletions}
          title={c.accountDeletions}
          locale={locale}
          missing={
            <NotWired
              title={tx(locale, "inflightNotReadableByAnAdmin")}
              what={tx(locale, "inflightPeopleWhoAskedToClose")}
              request={tx(locale, "inflightOnlyTheAccountHolderMay")}
            />
          }
        />
        <TransfersPanel
          read={ops?.transfers}
          title={c.businessTransfers}
          locale={locale}
          missing={
            <NotWired
              title={tx(locale, "inflightNotReadableByAnAdmin")}
              what={tx(locale, "inflightBusinessesOfferedFromOneOwner")}
              request={tx(locale, "inflightOnlyTheTwoPartiesMay")}
            />
          }
        />
        <DbJobsPanel
          read={ops?.dbJobs}
          title={tx(locale, "inflightDatabaseJobsOneByOne")}
          locale={locale}
          missing={
            <NotWired
              what={tx(locale, "inflightEachOfTheDatabaseJobs")
                .replace("{count}", String(PG_CRON_JOBS.length))
                .replace("{names}", PG_CRON_JOBS.map((j) => j.name).join(", "))}
              request={tx(locale, "inflightTheDatabaseDoesNotExpose")}
            />
          }
        />
        <ReconPanel
          read={ops?.recon}
          title={tx(locale, "inflightMoneyReconciliationWatch")}
          locale={locale}
          missing={<NotWired what={tx(locale, "inflightTheMoneyReconcileSLast")} request={tx(locale, "inflightThatWatchIsNotReadable")} />}
        />
        <HeldEventsPanel
          read={ops?.held}
          locale={locale}
          missing={
            <NotWired
              title={tx(locale, "inflightNotReadableByAnAdmin")}
              what="Events the safety scan held, and the decisions taken on them."
              request="Needs the staff read in the pending Operations reads draft; deciding a held event is request AR-10."
            />
          }
        />
      </div>
    </div>
  );
}
