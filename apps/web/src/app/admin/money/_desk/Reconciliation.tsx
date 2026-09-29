import { getDictionary, type Locale } from "@vallo/i18n";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { WATCHED_JOBS } from "@/lib/cron/freshness";
import type { ReconciliationHealth } from "@/lib/admin/reads/money-types";
import { cleanShare, reconciliationVerdict, type ReconciliationVerdict } from "@/lib/admin/reads/money-derive";
import { Ring } from "./charts";
import { Panel, Waiting } from "./Desk";
import { fill } from "../../_components/copy";

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

const VERDICT_TONE: Record<ReconciliationVerdict, "success" | "danger" | "warning" | "neutral"> = {
  healthy: "success",
  attention: "danger",
  quiet: "danger",
  never: "neutral",
};

export function ReconciliationPanel({
  health,
  now,
  when,
  variant,
  locale,
}: {
  health: ReconciliationHealth | null;
  now: number;
  when: (iso: string | null) => string;
  variant: "ring" | "check";
  /** The console's locale; English when omitted. */
  locale?: Locale;
}) {
  const t = getDictionary(locale ?? "en");
  const c = t.admin.money.reconciliation;
  const title = variant === "ring" ? c.titleRing : c.titleCheck;
  if (!health) {
    return (
      <Panel title={title}>
        <Waiting
          title={c.unreadTitle}
          body={c.unreadBody}
        />
      </Panel>
    );
  }

  const verdict = reconciliationVerdict(health, now, maxGapHours());
  const share = cleanShare(health);
  const badge = {
    word: verdict === "healthy" ? t.admin.shell.operations.healthy : c[verdict],
    tone: VERDICT_TONE[verdict],
  };
  const scope =
    health.runs === 0
      ? c.noRunYet
      : health.pageOnly
        ? fill(c.cleanOfLast, { clean: health.clean, runs: health.runs })
        : fill(c.cleanInDays, { clean: health.clean, runs: health.runs, days: health.windowDays });

  if (variant === "check") {
    const plate = verdict === "healthy" ? "" : verdict === "never" ? "nf-md-check--quiet" : "nf-md-check--bad";
    return (
      <Panel title={title}>
        <div className={`nf-md-check ${plate}`} aria-hidden="true">
          <UiIcon name={verdict === "healthy" ? "verified" : "info"} size={28} />
        </div>
        <div className="text-center">
          <StatusPill tone={badge.tone} size="sm">
            {badge.word}
          </StatusPill>
          <p className="mt-xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
            {fill(c.lastRunColon, { when: when(health.lastRunAt) })}
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
          label={share === null ? c.never : fill(c.sharePerCent, { share })}
          locale={locale}
        />
        <div className="min-w-0">
          <p className="nf-md-ring__label">{c.lastClean}</p>
          <p className="nf-md-ring__when">{health.lastCleanAt ? when(health.lastCleanAt) : c.noneRecorded}</p>
          <div className="mt-xs">
            <StatusPill tone={badge.tone} size="sm">
              {badge.word}
            </StatusPill>
          </div>
        </div>
      </div>
      <p className="nf-md-panel__foot">
        {scope} {fill(c.lastRunSentence, { when: when(health.lastRunAt) })}
      </p>
    </Panel>
  );
}
