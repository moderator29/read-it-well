import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { formatMoneyDate } from "@/lib/money/dates";
import { lagosToday } from "@/lib/rent/schema";
import { dueClock, dueLabel, type ThresholdRow } from "@/lib/compliance/threshold-model";
import { readThresholdLane } from "@/lib/compliance/threshold-queries";
import { adminUi } from "../../_components/ui";
import { ApproveThreshold, DecideThreshold } from "./ThresholdControls";
import type { ComplianceLane, ComplianceLaneProps } from "./lane";

/**
 * SCUML ITEM 7: THRESHOLD REPORTS.
 *
 * Every settled transaction above ₦5,000,000 (individual) or ₦10,000,000
 * (corporate), and every run of smaller ones for one party that passes it
 * within a week, raised by the ledger monitor in
 * `20260924174000_scuml_item_7_threshold_reports.sql` with a due date seven
 * days after it took place. The officer files on goAML outside Vallo,
 * records the reference here, and a second member of staff approves
 * (SCUML item 19). Overdue items are marked; staff are notified three days and
 * one day before. Staff only: nothing here reaches the member.
 */
function clockPill(row: ThresholdRow, copy: Dictionary["complianceThreshold"]): { tone: StatusTone; label: string } {
  const clock = dueClock(row.dueAt, row.state);
  const label = dueLabel(clock, copy.due);
  const tone: StatusTone =
    clock.stage === "done" ? "success" : clock.stage === "overdue" || clock.stage === "1d" ? "danger" : clock.stage === "3d" ? "warning" : "neutral";
  return { tone, label };
}

async function Lane({ t, locale }: ComplianceLaneProps) {
  const copy = t.complianceThreshold;
  const desk = t.compliance.desk;
  const ui = adminUi(t, locale);
  const read = await readThresholdLane();
  if (read.state !== "ready") {
    // A read that did not run is a failure, never "nothing to report".
    return <ui.QueueAlarm title={desk.unavailableTitle} body={desk.unavailableBody} />;
  }
  /* A missed movement means the lane may be short: an alarm, never "nothing to report". */
  const faults =
    read.monitorFaults > 0 ? (
      <ui.QueueAlarm
        title={read.monitorFaults === 1 ? copy.faultsTitleOne : copy.faultsTitle.replace("{count}", String(read.monitorFaults))}
        body={copy.faultsBody}
      />
    ) : null;
  if (read.rows.length === 0) {
    return (
      <>
        <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.lede}</p>
        {faults ?? <ui.QueueEmpty title={copy.emptyTitle} body={copy.emptyBody} everHadRows={false} />}
      </>
    );
  }
  const today = lagosToday();
  const date = (value: string | null) => formatMoneyDate(value, locale) ?? "";
  return (
    <div className="grid gap-md" data-testid="threshold-lane">
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.lede}</p>
      {faults}
      <ul className="grid gap-md">
        {read.rows.map((row) => (
          <ThresholdCard key={row.id} row={row} copy={copy} locale={locale} viewerId={read.viewerId} today={today} date={date} />
        ))}
      </ul>
      {read.truncated && (
        <p className="nf-caption" role="note" data-testid="threshold-truncated">
          {copy.truncated}
        </p>
      )}
    </div>
  );
}

function ThresholdCard({
  row,
  copy,
  locale,
  viewerId,
  today,
  date,
}: {
  row: ThresholdRow;
  copy: Dictionary["complianceThreshold"];
  locale: Locale;
  viewerId: string;
  today: string;
  date: (value: string | null) => string;
}) {
  const pill = clockPill(row, copy);
  const decision = row.decision;
  return (
    <li className="nf-panel nf-panel--card grid gap-sm p-md" data-testid="threshold-event" data-state={row.state}>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="nf-h4 nf-numeric">{formatMoney(row.amountMinor, locale)}</p>
          <p className="nf-caption">
            {row.kind === "single"
              ? `${copy.kind.single} · ${copy.source[row.source ?? "none"]}`
              : copy.kind.structuring.replace("{count}", String(row.movements))}
            {row.direction && ` · ${copy.direction[row.direction]}`}
          </p>
        </div>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
      </div>
      <p className="nf-body-sm">
        {copy.party.replace("{name}", row.partyName ?? copy.unnamed).replace("{class}", copy.classes[row.partyClass])}
      </p>
      {row.counterpartyId && (
        <p className="nf-body-sm text-[var(--nf-content-secondary)]">
          {copy.counterparty
            .replace("{name}", row.counterpartyName ?? copy.unnamed)
            .replace("{class}", copy.classes[row.counterpartyClass ?? "individual"])}
        </p>
      )}
      <p className="nf-caption nf-numeric">
        {copy.threshold
          .replace("{class}", copy.classes[row.partyClass])
          .replace("{amount}", formatMoney(row.thresholdMinor, locale))}
        {" · "}
        {copy.occurred.replace("{date}", date(row.occurredAt))}
      </p>
      <p className="nf-caption font-semibold">{copy.state[row.state]}</p>
      {decision && (
        <p className="nf-caption">
          {decision.kind === "reported"
            ? copy.recorded.reported
                .replace("{date}", date(decision.reportedOn))
                .replace("{reference}", decision.reference ?? "")
                .replace("{when}", date(decision.decidedAt))
            : copy.recorded.notReportable.replace("{note}", decision.note ?? "")}
          {decision.verdict === "approved" && ` ${copy.recorded.approved.replace("{when}", date(decision.approvedAt))}`}
          {decision.verdict === "rejected" && ` ${copy.recorded.rejected.replace("{when}", date(decision.approvedAt))}`}
        </p>
      )}
      {row.state === "open" && <DecideThreshold eventId={row.id} today={today} copy={copy} />}
      {row.state === "awaiting_approval" && decision &&
        (decision.decidedBy === viewerId ? (
          <p className="nf-caption">{copy.approve.own}</p>
        ) : (
          <ApproveThreshold decisionId={decision.id} copy={copy} />
        ))}
    </li>
  );
}

export const ThresholdLane: ComplianceLane = {
  key: "threshold",
  items: [7],
  title: (t) => t.complianceThreshold.tab,
  Lane,
};
