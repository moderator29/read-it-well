import type { ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import type { StatusTone } from "@/components/ui/StatusPill";
import {
  Badge,
  DeltaLine,
  DeskHead,
  Donut,
  Empty,
  Kpi,
  Panel,
  ReadFailed,
  READ_FAILED,
  Tabs,
  type Segment,
  type TabItem,
} from "../_review/parts";
import { formatDuration, percentChange } from "../_review/metrics";
import { CalmNote } from "../_components/panels";
import type { ModerationSummary } from "../_review/contracts";

/**
 * Moderation, 01F7DFC7 panel 1: the reason tabs, Total reports and Over 24
 * hours, the table of reported and held items, the Report breakdown donut,
 * Queue health and the Community safety panel.
 *
 * Presentational. Every figure comes from `summary`, which is
 * `getModerationSummary` (lib/admin/reads/moderation.ts): exact counts and
 * complete fourteen-day series. When that read fails the panels say so and
 * draw nothing.
 */

export type ModerationRow = {
  id: string;
  icon: UiIconName;
  item: string;
  itemSub: string | null;
  reporter: string;
  reporterSub: string;
  reason: string;
  age: string;
  status: string;
  statusLabel: string;
  tone?: StatusTone;
  /** What opens under the row: the words, the links and the decision. */
  body: ReactNode;
};

export type ModerationDeskProps = {
  tabs: TabItem[];
  filters?: ReactNode;
  summary: ModerationSummary | null;
  /** The category words, for the breakdown legend. */
  categoryLabel: (category: string) => string;
  rows: ModerationRow[];
  empty: { title: string; body: string; cause?: string; link?: { href: string; label: string } };
  pager?: ReactNode;
  notes?: ReactNode;
  unavailable?: boolean;
};

const COLS = "minmax(0, 2.2fr) minmax(0, 1.3fr) minmax(0, 1.2fr) 64px 120px";
const RAMP = ["ramp1", "ramp2", "ramp3", "ramp4"];

/** The waiting reports by reason, biggest first, on the blue ramp. */
export function breakdownSegments(
  byCategory: Record<string, number>,
  label: (category: string) => string,
): Segment[] {
  return Object.entries(byCategory)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], index) => ({
      key,
      label: label(key),
      value,
      ink: RAMP[Math.min(index, RAMP.length - 1)] ?? "ramp4",
    }));
}

export function ModerationDesk(props: ModerationDeskProps) {
  const { tabs, filters, summary, categoryLabel, rows, empty, pager, notes, unavailable } = props;
  const s = summary;
  const heldTotal = s ? s.held.posts + s.held.stories + s.held.comments + s.held.bios + s.held.events : 0;
  const waitingReports = s ? s.openReports + s.reviewingReports : 0;
  const segments = s ? breakdownSegments(s.byCategory, categoryLabel) : [];

  return (
    <div className="nf-rv nf-rv--moderation">
      <DeskHead title="Moderation" sub="Review reported content and keep the platform safe." />
      <Tabs items={tabs} label="Reason" />
      {filters}

      <div className="nf-rv-split">
        <div className="nf-rv-stack">
          <div className="nf-rv-grid2">
            <Kpi
              label="Total reports"
              icon="flag"
              figure={s ? String(waitingReports) : null}
              delta={
                s
                  ? { pct: percentChange(s.newThisWeek, s.newLastWeek), upIsGood: false, vs: "new reports vs last week" }
                  : null
              }
              spark={s && s.newPerDay.some((n) => n > 0) ? s.newPerDay : null}
              hint={
                s
                  ? `Open or in review. ${s.newThisWeek} filed in the last seven days; ${heldTotal} more held by the safety scan.`
                  : READ_FAILED
              }
            />
            <div className="nf-panel nf-rv-panel nf-rv-kpi">
              <p className="nf-rv-kpi__label" style={{ color: "var(--nf-state-error)" }}>
                <UiIcon name="history" size={16} />
                Over 24 hours
              </p>
              {s ? (
                <>
                  <p className="nf-rv-kpi__figure">{s.olderThan24h.reports + s.olderThan24h.held}</p>
                  <p className="nf-rv-panel__note">
                    {s.olderThan24h.reports} {s.olderThan24h.reports === 1 ? "report" : "reports"} past the
                    24 hour promise, {s.olderThan24h.held} held {s.olderThan24h.held === 1 ? "item" : "items"} older
                    than a day.
                  </p>
                </>
              ) : (
                <>
                  <p className="nf-rv-kpi__figure nf-rv-kpi__figure--quiet">Could not be read</p>
                  <p className="nf-rv-panel__note">{READ_FAILED}</p>
                </>
              )}
            </div>
          </div>

          <Panel flush>
            {unavailable ? (
              <Empty kind="error" title="The queue could not be read" body={READ_FAILED} cause="Nothing has changed. Reload to try again." />
            ) : rows.length === 0 ? (
              <Empty {...empty} />
            ) : (
              <div className="nf-rv-rows" style={{ ["--rv-cols" as string]: COLS }}>
                <div className="nf-rv-rows__head" aria-hidden="true">
                  <span>Item</span>
                  <span>Reporter</span>
                  <span>Reason</span>
                  <span>Age</span>
                  <span>Status</span>
                </div>
                {rows.map((row) => (
                  <details key={row.id} className="nf-rv-rows__row">
                    <summary>
                      <span className="nf-rv-rows__cell nf-rv-rows__cell--wide nf-rv-person">
                        <span className="nf-rv-plate" aria-hidden="true">
                          <UiIcon name={row.icon} size={16} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span className="nf-rv-ref">{row.item}</span>
                          {row.itemSub ? <span className="nf-rv-table__muted">{row.itemSub}</span> : null}
                        </span>
                      </span>
                      <span className="nf-rv-rows__cell">
                        <span style={{ display: "block" }}>{row.reporter}</span>
                        <span className="nf-rv-table__muted" style={{ color: "var(--nf-brand-secondary)" }}>
                          {row.reporterSub}
                        </span>
                      </span>
                      <span className="nf-rv-rows__cell">{row.reason}</span>
                      <span className="nf-rv-rows__cell nf-rv-table__num">{row.age}</span>
                      <span className="nf-rv-rows__cell">
                        <Badge {...(row.tone ? { tone: row.tone } : { status: row.status })}>
                          {row.statusLabel}
                        </Badge>
                      </span>
                    </summary>
                    <div className="nf-rv-detail__body">{row.body}</div>
                  </details>
                ))}
              </div>
            )}
          </Panel>
          {notes}
          {pager ? (
            <div className="nf-panel nf-rv-panel" style={{ padding: "var(--nf-space-sm)" }}>
              {pager}
            </div>
          ) : null}
        </div>

        <aside className="nf-rv-stack" aria-label="Moderation health">
          <Panel title="Report breakdown" labelledBy="rv-breakdown">
            {!s ? (
              <ReadFailed what="These figures" />
            ) : segments.length === 0 ? (
              <>
                <Donut
                  segments={Object.keys(s.byCategory)
                    .filter((key) => key !== "uncategorised")
                    .map((key) => ({ key, label: categoryLabel(key), value: 0, ink: "ramp3" }))}
                  caption="waiting"
                  label="Reports waiting, by reason"
                />
                <p className="nf-rv-panel__note" style={{ marginTop: "var(--nf-space-sm)" }}>
                  No report is waiting. When one arrives, this ring splits by the reason the reporter
                  chose.
                </p>
              </>
            ) : (
              <Donut segments={segments} caption="waiting" label="Reports waiting, by reason" />
            )}
          </Panel>

          <Panel title="Queue health" labelledBy="rv-queue-health">
            {s ? (
              <dl className="nf-rv-money">
                <div>
                  <dt>Open reports</dt>
                  <dd>{s.openReports}</dd>
                </div>
                <div>
                  <dt>In review</dt>
                  <dd>{s.reviewingReports}</dd>
                </div>
                <div>
                  <dt>Held by the scan</dt>
                  <dd>{heldTotal}</dd>
                </div>
                <div className="nf-rv-money__total">
                  <dt>Median response time</dt>
                  <dd>{formatDuration(s.medianResponseMinutes.thisWeek) ?? "None closed"}</dd>
                </div>
                <DeltaLine
                  delta={{
                    pct: percentChange(s.medianResponseMinutes.thisWeek, s.medianResponseMinutes.lastWeek),
                    upIsGood: false,
                    vs: "vs last week",
                  }}
                />
                <p className="nf-rv-panel__note">
                  Filed to closed, over the {s.closedThisWeek}{" "}
                  {s.closedThisWeek === 1 ? "report" : "reports"} closed in the last seven days.
                </p>
              </dl>
            ) : (
              <ReadFailed what="These figures" />
            )}
          </Panel>

          <Panel title="Blocked terms" labelledBy="rv-blocked">
            <CalmNote
              kind="unwired"
              title="This list cannot be read from the console"
              fills="The scan holds words that match the platform's blocked terms. Session A's ledger records that the list ships empty until the founder approves one, so today only account numbers and payment language hold anything."
              creates="Reading the list here needs an admin read on public.blocked_terms, which has none: request AR-11."
            />
          </Panel>

          <Panel>
            <div className="nf-rv-safety">
              <UiIcon name="verified" size={32} />
              <strong>Community safety</strong>
              <p>
                Every report reaches a person. The reporter is told it arrived, and held words
                come back or come down with a reason the author reads word for word.
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
