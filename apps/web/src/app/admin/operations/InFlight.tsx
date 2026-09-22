import { formatDate, formatNumber, type Locale } from "@vallo/i18n";
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
  return (
    <div className="nf-admin-stack">
      <div className="nf-admin-grid nf-admin-grid--wide-left">
        <Panel id="ops-inspections" title="Inspections">
          {!inspections ? (
            <PanelUnavailable what="The inspections" />
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
                    title="No inspection requested yet"
                    fills="Every inspection is counted here by state, from the request to the visit."
                    creates="A renter asks to view a listing from its page; the lister confirms, proposes a time or declines."
                  />
                </div>
              )}
            </>
          )}
        </Panel>
        <Panel id="ops-inspections-recent" title="Newest requests">
          {!inspections ? (
            <PanelUnavailable what="The inspections" />
          ) : inspections.recent.length === 0 ? (
            <CalmNote title="Nothing requested yet" fills="The eight newest inspection requests appear here with their listing and state." />
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
        <Panel id="ops-deletions" title="Account deletions">
          <NotWired
            title="Not readable by an admin yet"
            what="People who asked to close their account, by state (scheduled, purging), with the date each purge is due."
            request="Only the account holder may read these rows today; Request A12 asks for an admin read. The purge job's own runs are on the Scheduled jobs tab."
          />
        </Panel>
        <Panel id="ops-transfers" title="Business transfers">
          <NotWired
            title="Not readable by an admin yet"
            what="Businesses offered from one owner to another and waiting on an answer, with when each offer expires."
            request="Only the two parties may read these rows today; Request A13 asks for an admin read."
          />
        </Panel>
        <Panel id="ops-db-jobs" title="Database jobs, one by one">
          <NotWired
            what="Each of the eight database jobs with its last run, outcome and failures in the last day: release stale holds, purge rate limits, escrow timeouts, reconcile payments, nightly badges, purge idempotency, announce completed stays, the daily note."
            request="The database does not expose its job table to the console; Request A5 asks for an admin read. The Scheduled jobs tab carries their summary."
          />
        </Panel>
        <Panel id="ops-recon" title="Money reconciliation watch">
          <NotWired
            what="The money reconcile's last request, its reply and its verdict, from the watch the database keeps."
            request="That watch is not readable by an admin; admin-money's request 10 asks for it. The reconcile's runs are on the Scheduled jobs tab."
          />
        </Panel>
      </div>
    </div>
  );
}
