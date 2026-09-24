import { readPepDesk } from "@/lib/compliance/pep-queries";
import { eddCardView, when } from "@/lib/compliance/edd-view";
import { EddReviewCard } from "@/components/compliance/EddReviewCard";
import { PepFlagForm } from "@/components/compliance/PepFlagForm";
import { Panel } from "../../_review/parts";
import type { ComplianceLane, ComplianceLaneProps } from "./lane";

/**
 * SCUML item 20. POLITICALLY EXPOSED PERSONS.
 *
 * The lister's own answer (asked at verification and at payout account
 * setup), staff's own record, and a review of every transaction a PEP makes:
 * each review needs the source of funds recorded by one member of staff and
 * approved by a second (item 19). Read through `pep_desk`, staff only; a
 * failed read says the check could not run, never that nothing is waiting.
 */
async function PepLaneBody({ t, locale }: ComplianceLaneProps) {
  const l = t.compliancePep.lane;
  const desk = await readPepDesk();
  if (desk.state !== "ready") {
    return (
      <div className="nf-panel nf-panel--card nf-admin-card p-card-lg" role="alert" data-testid="pep-lane-unavailable">
        <p className="nf-h4">{t.compliance.desk.unavailableTitle}</p>
        <p className="nf-body mt-row text-content-2">{t.compliance.desk.unavailableBody}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-group" data-testid="pep-lane">
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{l.lede}</p>

      <Panel title={l.openTitle}>
        {desk.open.length === 0 ? (
          <div data-testid="pep-open-empty">
            <p className="nf-body-sm font-semibold">{l.openEmpty}</p>
            <p className="nf-caption mt-2xs text-[var(--nf-content-muted)]">{l.openEmptyBody}</p>
          </div>
        ) : (
          <ul className="grid gap-sm">
            {desk.open.map((review) => (
              <EddReviewCard key={review.id} view={eddCardView(review, desk.viewerId, t, locale)} copy={l} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={l.peopleTitle}>
        {desk.people.length === 0 ? (
          <p className="nf-body-sm" data-testid="pep-people-empty">
            {l.peopleEmpty}
          </p>
        ) : (
          <ul className="grid gap-xs" data-testid="pep-people">
            {desk.people.map((p) => (
              <li key={p.userId} className="nf-body-sm">
                {l.peopleRow
                  .replace("{name}", p.name)
                  .replace("{relation}", p.relation ? l.relation[p.relation] : "")
                  .replace("{role}", p.role ?? "")
                  .replace("{source}", p.source === "staff" ? l.flaggedBy : l.declared)
                  .replace("{date}", when(p.at, locale))}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={l.flagTitle}>
        <PepFlagForm copy={l} question={t.compliancePep.question} />
      </Panel>

      <Panel title={l.settledTitle}>
        {desk.settled.length === 0 ? (
          <p className="nf-body-sm">{l.settledEmpty}</p>
        ) : (
          <ul className="grid gap-sm">
            {desk.settled.map((review) => (
              <EddReviewCard key={review.id} view={eddCardView(review, desk.viewerId, t, locale)} copy={l} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export const pepLane: ComplianceLane = {
  key: "pep",
  items: [20],
  title: (t) => t.compliancePep.lane.tab,
  Lane: PepLaneBody,
};
