import { formatMoney } from "@vallo/i18n/core";
import { readRiskDesk, type RiskPerson } from "@/lib/compliance/risk-queries";
import { eddCardView, when } from "@/lib/compliance/edd-view";
import { EddReviewCard } from "@/components/compliance/EddReviewCard";
import { RiskOverrideForm } from "@/components/compliance/RiskOverrideForm";
import { ApproveForm } from "@/components/compliance/ApproveForm";
import { ReopenEddButton } from "@/components/compliance/ReopenEddButton";
import { approveRiskOverride } from "@/lib/compliance/risk-actions";
import { Panel } from "../../_review/parts";
import type { ComplianceLane, ComplianceLaneProps } from "./lane";

/**
 * SCUML item 15. RISK CLASSIFICATION.
 *
 * Every customer's class, derived daily from the documented factors by the
 * one rule set (lib/compliance/risk-rules.ts) and kept as a dated history;
 * staff can set a class by hand with a reason; a high-risk lister cannot
 * publish or add a payout account until two people clear an EDD review, which
 * is decided here. Never shown to the person and not a public score (V-21).
 * A failed read says the check could not run, never that nobody is high risk.
 */
function personLines(p: RiskPerson, t: ComplianceLaneProps["t"], locale: ComplianceLaneProps["locale"]): string[] {
  const l = t.complianceRisk.lane;
  const reasons = l.reasons as Record<string, string>;
  const lines: string[] = [];
  const named = p.reasons.map((r) => reasons[r]).filter(Boolean);
  if (named.length > 0) lines.push(named.join(", "));
  lines.push(
    p.source === "override"
      ? l.overridden
          .replace("{who}", p.setByName ?? "")
          .replace("{date}", when(p.setAt, locale))
          .replace("{reason}", p.reason ?? "")
      : l.derived.replace("{date}", when(p.setAt, locale)),
  );
  if (p.factors) {
    const f = p.factors;
    lines.push(
      l.factors
        .replace("{pep}", f.pep ? l.yes : l.no)
        .replace("{sanctions}", f.sanctionsHit === null ? l.unknown : f.sanctionsHit ? l.yes : l.no)
        .replace("{lister}", f.lister ? l.yes : l.no)
        .replace("{rung}", f.identityRung === null ? l.none : String(f.identityRung))
        .replace("{volume}", formatMoney(f.volume90dMinor, locale))
        .replace("{reports}", String(f.openReports))
        .replace("{fraud}", String(f.upheldFraud)),
    );
  }
  const overdue = new Date(p.reviewDueAt).getTime() <= Date.now();
  lines.push((overdue ? l.overdue : l.due).replace("{date}", when(p.reviewDueAt, locale)));
  return lines;
}

async function RiskLaneBody({ t, locale }: ComplianceLaneProps) {
  const l = t.complianceRisk.lane;
  const desk = await readRiskDesk();
  if (desk.state !== "ready") {
    return (
      <div className="nf-panel nf-panel--card nf-admin-card p-card-lg" role="alert" data-testid="risk-lane-unavailable">
        <p className="nf-h4">{t.compliance.desk.unavailableTitle}</p>
        <p className="nf-body mt-row text-content-2">{t.compliance.desk.unavailableBody}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-group" data-testid="risk-lane">
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{l.lede}</p>
      <p className="nf-body-sm font-semibold" data-testid="risk-counts">
        {l.counts
          .replace("{high}", String(desk.counts.high))
          .replace("{medium}", String(desk.counts.medium))
          .replace("{low}", String(desk.counts.low))
          .replace("{due}", String(desk.counts.due))}
      </p>

      <Panel title={l.openTitle}>
        {desk.open.length === 0 ? (
          <p className="nf-body-sm" data-testid="risk-open-empty">
            {l.openEmpty}
          </p>
        ) : (
          <ul className="grid gap-sm">
            {desk.open.map((review) => (
              <EddReviewCard key={review.id} view={eddCardView(review, desk.viewerId, t, locale)} copy={t.compliancePep.lane} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={l.pendingTitle} note={l.pendingNote}>
        {desk.pending.length === 0 ? (
          <p className="nf-body-sm" data-testid="risk-pending-empty">
            {l.pendingEmpty}
          </p>
        ) : (
          <ul className="grid gap-sm" data-testid="risk-pending">
            {desk.pending.map((p) => (
              <li key={p.id} className="nf-panel nf-panel--card block p-card">
                <p className="nf-body-sm">
                  {l.pendingRow
                    .replace("{name}", p.name)
                    .replace("{from}", p.from ? l.class[p.from] : "")
                    .replace("{to}", l.class[p.to])
                    .replace("{who}", p.setByName)
                    .replace("{date}", when(p.setAt, locale))
                    .replace("{reason}", p.reason)}
                </p>
                <div className="mt-inline">
                  <ApproveForm
                    action={approveRiskOverride}
                    fieldName="id"
                    value={p.id}
                    label={l.approve}
                    doneLabel={l.approved}
                    own={p.setBy === desk.viewerId}
                    ownLine={l.ownProposal}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={l.peopleTitle}>
        {desk.people.length === 0 ? (
          <div data-testid="risk-people-empty">
            <p className="nf-body-sm font-semibold">{l.peopleEmpty}</p>
            <p className="nf-caption mt-2xs text-[var(--nf-content-muted)]">{l.peopleEmptyBody}</p>
          </div>
        ) : (
          <ul className="grid gap-sm" data-testid="risk-people">
            {desk.people.map((p) => (
              <li key={p.userId} className="nf-panel nf-panel--card block p-card">
                <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">
                  {p.name}: {l.class[p.riskClass]}
                  {p.riskClass === "high" ? ` · ${p.eddClear ? l.gateOpen : l.gateShut}` : ""}
                </p>
                {personLines(p, t, locale).map((line) => (
                  <p key={line} className="nf-caption mt-2xs text-[var(--nf-content-muted)]">
                    {line}
                  </p>
                ))}
                {p.riskClass === "high" && p.eddClear ? (
                  <div className="mt-inline">
                    <ReopenEddButton userId={p.userId} copy={l} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={l.overrideTitle}>
        <RiskOverrideForm copy={l} />
      </Panel>
    </div>
  );
}

export const riskLane: ComplianceLane = {
  key: "risk",
  items: [15],
  title: (t) => t.complianceRisk.lane.tab,
  Lane: RiskLaneBody,
};
