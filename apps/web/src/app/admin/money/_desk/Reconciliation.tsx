import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { WATCHED_JOBS } from "@/lib/cron/freshness";
import type { ReconciliationHealth } from "@/lib/admin/reads/money-types";
import { cleanShare, reconciliationVerdict, type ReconciliationVerdict } from "@/lib/admin/reads/money-derive";
import { Ring } from "./charts";
import { Panel, Waiting } from "./Desk";

/**
 * RECONCILIATION, READ FROM WHERE THE JOB ACTUALLY WRITES ITS HISTORY.
 *
 * `/api/paystack/reconcile` records every run, clean or not, as a
 * `wallet.reconciliation.run` row in `audit_log` with `metadata.outcome` of
 * `clean` or `needs_attention` (`app/api/paystack/reconcile/outcome.ts`).
 * `getReconciliationHealth` in `lib/admin/reads/money.ts` reads every one in
 * the last seven days. The job's last HTTP reply lives in
 * `private.reconciliation_watch`, which no admin read can reach yet (a scope
 * request, because it needs a migration).
 *
 * The badge reports SILENCE FIRST, against the same allowance the platform's
 * own freshness watch uses for this job (`lib/cron/freshness.ts`), because a
 * job that stopped firing three weeks ago while every recorded run was clean
 * is exactly how this job failed before.
 */

const RECONCILE_JOB = "paystack-reconcile";

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
      : health.pageOnly
        ? `Clean in ${health.clean} of the last ${health.runs} recorded runs.`
        : `Clean in ${health.clean} of ${health.runs} runs in the last ${health.windowDays} days.`;

  if (variant === "check") {
    const plate = verdict === "healthy" ? "" : verdict === "never" ? "nf-md-check--quiet" : "nf-md-check--bad";
    return (
      <Panel title={title}>
        <div className={`nf-md-check ${plate}`} aria-hidden="true">
          <UiIcon name={verdict === "healthy" ? "verified" : "info"} size={26} />
        </div>
        <div className="text-center">
          <StatusPill tone={badge.tone} size="sm">
            {badge.word}
          </StatusPill>
          <p className="mt-xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
            Last run: {when(health.lastRunAt)}
          </p>
          <p className="nf-md-panel__foot">{scope}</p>
        </div>
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
