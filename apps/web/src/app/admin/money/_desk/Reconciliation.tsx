import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { AdminRead } from "@/lib/admin/money-queries";
import type { AuditPage } from "@/lib/admin/audit-queries";
import { WATCHED_JOBS } from "@/lib/cron/freshness";
import type { ReconciliationHealth } from "./contracts";
import { cleanShare, reconciliationFromAudit, reconciliationVerdict, type ReconciliationVerdict } from "./derive";
import { Ring } from "./charts";
import { Panel, Waiting } from "./Desk";

/**
 * RECONCILIATION, READ FROM WHERE THE JOB ACTUALLY WRITES ITS HISTORY.
 *
 * `/api/paystack/reconcile` records every run, clean or not, as a
 * `wallet.reconciliation.run` row in `audit_log` through `recordMoneyAudit`,
 * with `metadata.outcome` of `clean` or `needs_attention`
 * (`app/api/paystack/reconcile/outcome.ts`). The existing `getAuditLog` reads
 * the newest page of those rows, and that is what this panel is drawn from
 * until scope request 8 lands a proper aggregate. The figures therefore cover
 * the runs on that page and the copy says so.
 *
 * The badge reports SILENCE FIRST, against the same allowance the platform's
 * own freshness watch uses for this job (`lib/cron/freshness.ts`), because a
 * job that stopped firing three weeks ago while every recorded run was clean
 * is exactly how this job failed before.
 */

const RECONCILE_JOB = "paystack-reconcile";

export function readReconciliation(read: AdminRead<AuditPage>): ReconciliationHealth | null {
  if (read.state !== "ok") return null;
  return reconciliationFromAudit(
    read.data.rows
      .filter((row) => row.action === "wallet.reconciliation.run")
      .map((row) => ({ createdAt: row.createdAt, metadata: row.metadata })),
  );
}

function maxGapHours(): number {
  return WATCHED_JOBS.find((job) => job.job === RECONCILE_JOB)?.maxGapHours ?? 3;
}

const VERDICT: Record<ReconciliationVerdict, { word: string; tone: "success" | "danger" | "warning" | "neutral" }> = {
  healthy: { word: "Healthy", tone: "success" },
  attention: { word: "Needs a person", tone: "danger" },
  quiet: { word: "Gone quiet", tone: "danger" },
  never: { word: "No runs recorded", tone: "neutral" },
};

export function ReconciliationPanel({
  health,
  now,
  when,
  variant,
}: {
  health: ReconciliationHealth | null;
  now: number;
  when: (iso: string | null) => string;
  variant: "ring" | "check";
}) {
  const title = variant === "ring" ? "Reconciliation health" : "Reconciliation check";
  if (!health) {
    return (
      <Panel title={title}>
        <Waiting
          title="The reconciliation history could not be read"
          body="This panel shows how many of the payment reconciliation runs came back clean and when the last clean one was. The audit log did not answer just now; nothing about the job itself is implied."
        />
      </Panel>
    );
  }

  const verdict = reconciliationVerdict(health, now, maxGapHours());
  const share = cleanShare(health);
  const badge = VERDICT[verdict];
  const scope =
    health.runs === 0
      ? "The job has not recorded a run yet."
      : `Clean in ${health.clean} of the last ${health.runs} recorded runs.`;

  if (variant === "check") {
    const plate = verdict === "healthy" ? "" : verdict === "never" ? "nf-md-check--quiet" : "nf-md-check--bad";
    return (
      <Panel title={title}>
        <div className={`nf-md-check ${plate}`} aria-hidden="true">
          <UiIcon name={verdict === "healthy" ? "verified" : "info"} size={26} />
        </div>
        <StatusPill tone={badge.tone} size="sm">
          {badge.word}
        </StatusPill>
        <p className="mt-xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
          Last run: {when(health.lastRunAt)}
        </p>
        <p className="nf-md-panel__foot">{scope}</p>
      </Panel>
    );
  }

  return (
    <Panel title={title}>
      <div className="nf-md-ring">
        <Ring
          percent={share}
          tone={verdict === "healthy" ? "good" : verdict === "never" ? "quiet" : "bad"}
          label={share === null ? "No runs recorded" : `${share} per cent of recorded runs clean`}
        />
        <div className="min-w-0">
          <p className="nf-md-ring__label">Last clean run</p>
          <p className="nf-md-ring__when">{health.lastCleanAt ? when(health.lastCleanAt) : "None recorded"}</p>
          <div className="mt-xs">
            <StatusPill tone={badge.tone} size="sm">
              {badge.word}
            </StatusPill>
          </div>
        </div>
      </div>
      <p className="nf-md-panel__foot">
        {scope} Last run {when(health.lastRunAt)}.
      </p>
    </Panel>
  );
}
