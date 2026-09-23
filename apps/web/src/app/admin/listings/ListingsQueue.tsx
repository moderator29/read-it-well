import { PersonTier } from "@/app/admin/_components/PersonTier";
import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { RemoteImage } from "@/components/ui/RemoteImage";
import {
  Badge,
  DeskHead,
  Donut,
  Empty,
  Kpi,
  Pager,
  Panel,
  RoleTag,
  Tabs,
  type Segment,
  type TabItem,
} from "../_review/parts";
import { formatDuration, percentChange } from "../_review/metrics";
import type { ListingReviewTimes, ListingStatusCounts } from "../_review/contracts";
import type { QueueRow } from "./rows";

/**
 * The listings review queue, C1D98B3C panel 1: status tabs, the table of
 * submissions with a photo, the code, the type, the address, the lister, the
 * price, the age and the status, the Queue health donut and the Average review
 * time card, and the pager.
 *
 * Presentational only. The route hands it rows mapped from
 * `getListingSubmissions` and the exact counts and review times from
 * `lib/admin/reads/listings.ts`; a read that fails arrives as null and its
 * panel says so rather than drawing a number nobody measured.
 */

export type ListingsQueueProps = {
  title: string;
  sub: string;
  tabs: TabItem[];
  filters?: ReactNode;
  rows: QueueRow[];
  /** A second, shorter list under the table: the ten most recent decisions. */
  decided?: QueueRow[];
  decidedTitle?: string;
  statusLabel: (status: string) => string;
  counts: ListingStatusCounts | null;
  /** Example listings left out of the donut, said under it. */
  examples?: number | null;
  reviewTimes: ListingReviewTimes | null;
  page: number;
  hasNext: boolean;
  hrefForPage: (page: number) => string;
  empty: { title: string; body: string; cause?: string; link?: { href: string; label: string } } | null;
  /** Said under the table when the tab can only ever show a capped list. */
  capNote?: string | null;
  unavailable?: boolean;
  /** The mandates panel, under the queue. */
  mandates?: ReactNode;
};

/** Queue health: the four slices the render draws, from AR-1's exact counts. */
export function healthSegments(counts: ListingStatusCounts): Segment[] {
  return [
    { key: "waiting", label: "Waiting", value: counts.SUBMITTED + counts.UNDER_REVIEW, ink: "pending" },
    { key: "more", label: "More info needed", value: counts.MORE_INFO_REQUIRED, ink: "brand" },
    { key: "approved", label: "Approved, not yet live", value: counts.APPROVED, ink: "success" },
    { key: "rejected", label: "Rejected", value: counts.REJECTED, ink: "danger" },
  ];
}

export function ListingsQueue(props: ListingsQueueProps) {
  const {
    title,
    sub,
    tabs,
    filters,
    rows,
    decided,
    decidedTitle,
    statusLabel,
    counts,
    examples,
    reviewTimes,
    page,
    hasNext,
    hrefForPage,
    empty,
    capNote,
    unavailable,
    mandates,
  } = props;

  const median = reviewTimes?.thisWeek.medianMinutes ?? null;
  const delta = reviewTimes
    ? percentChange(reviewTimes.thisWeek.medianMinutes, reviewTimes.lastWeek.medianMinutes)
    : null;

  return (
    <div className="nf-rv nf-rv--listings">
      <DeskHead title={title} sub={sub} />
      <Tabs items={tabs} label="Listing status" />
      {filters}

      <div className="nf-rv-split">
        <div className="nf-rv-stack">
          <Panel flush>
            {unavailable ? (
              <Empty
                kind="error"
                title="The queue could not be read"
                body="The console could not reach the platform data just now. Nothing is shown rather than a queue that looks clear."
                cause="Nothing has changed. Reload to try again."
              />
            ) : rows.length === 0 && empty ? (
              <Empty {...empty} />
            ) : (
              <QueueTableView rows={rows} statusLabel={statusLabel} label={title} />
            )}
          </Panel>
          {capNote ? <p className="nf-rv-panel__note">{capNote}</p> : null}
          {hasNext || page > 1 ? (
            <div className="nf-panel nf-rv-panel" style={{ padding: "var(--nf-space-sm)" }}>
              <Pager page={page} hasNext={hasNext} hrefFor={hrefForPage} label="Queue pages" />
            </div>
          ) : null}

          {mandates}

          {decided && decided.length > 0 ? (
            <Panel flush title={decidedTitle} labelledBy="rv-decided">
              <QueueTableView rows={decided} statusLabel={statusLabel} label={decidedTitle ?? ""} />
            </Panel>
          ) : null}
        </div>

        <aside className="nf-rv-stack" aria-label="Queue health">
          <Panel title="Queue health" labelledBy="rv-health">
            {counts ? (
              <>
                <Donut segments={healthSegments(counts)} caption="real listings" label="Queue health" />
                {examples ? (
                  <p className="nf-rv-panel__note" style={{ marginTop: "var(--nf-space-sm)" }}>
                    {examples} example {examples === 1 ? "listing is" : "listings are"} left out. Examples
                    show how the product looks and are never counted as supply.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="nf-rv-msg">The counts could not be read just now. Nothing is drawn rather than a guess.</p>
            )}
          </Panel>

          <Kpi
            label="Average review time"
            icon="history"
            figure={reviewTimes ? (formatDuration(median) ?? "None yet") : null}
            delta={
              reviewTimes && delta !== null
                ? { pct: delta, upIsGood: false, vs: "vs last week" }
                : null
            }
            hint={
              reviewTimes
                ? reviewTimes.thisWeek.decisions === 0
                  ? "No decisions in the last seven days. The median appears with the first one."
                  : `Median, submitted to decided, over ${reviewTimes.thisWeek.decisions} ${reviewTimes.thisWeek.decisions === 1 ? "decision" : "decisions"} in the last seven days.`
                : "The review times could not be read just now."
            }
          />
        </aside>
      </div>
    </div>
  );
}

function QueueTableView({
  rows,
  statusLabel,
  label,
}: {
  rows: QueueRow[];
  statusLabel: (status: string) => string;
  label: string;
}) {
  return (
    <div className="nf-rv-scroll">
      <table className="nf-rv-table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">Listing</th>
            <th scope="col">Address</th>
            <th scope="col">Lister</th>
            <th scope="col">Price</th>
            <th scope="col" className="nf-rv-hide-sm">Submitted</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={row.href} className="nf-rv-cell-link" prefetch={false}>
                  {row.thumb ? (
                    <RemoteImage
                      src={row.thumb}
                      alt=""
                      width={44}
                      height={56}
                      sizes="44px"
                      loading="lazy"
                      className="nf-rv-thumb"
                    />
                  ) : (
                    <span className="nf-rv-thumb nf-rv-thumb--empty" aria-hidden="true">
                      <UiIcon name="house" size={20} />
                    </span>
                  )}
                  <span>
                    <span className="nf-rv-ref">
                      {row.reference}
                      {row.isExample ? <span className="nf-rv-example">Example</span> : null}
                    </span>
                    <span className="nf-rv-table__muted">{row.typeLabel}</span>
                  </span>
                </Link>
              </td>
              <td>{row.address}</td>
              <td>
                <span style={{ display: "block" }}>
                  {row.lister ?? "Not recorded"}
                  <PersonTier tier={row.badge ?? null} />
                </span>
                {row.listerRole ? <RoleTag>{row.listerRole}</RoleTag> : null}
              </td>
              <td className="nf-rv-table__num">{row.price}</td>
              <td className="nf-rv-table__num nf-rv-table__muted nf-rv-hide-sm">{row.submittedAge}</td>
              <td>
                <Badge status={row.status}>{statusLabel(row.status)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
