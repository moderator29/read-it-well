import type { ReactNode } from "react";
import type { MandateQueue, MandateRow } from "@/lib/admin/reads/listings";
import { Badge, Empty, Panel, ReadFailed, StatusBar } from "../_review/parts";

/**
 * Mandates: what an agent or a firm holds instead of ownership
 * (`listing_mandates`). Exact counts by review status, every pending mandate
 * with its principal, and the latest decisions with the refusal reason.
 *
 * READ ONLY ON PURPOSE. No action in `lib/admin` decides a
 * mandate yet, so the panel shows the queue and says what deciding needs
 * rather than drawing a button that would do nothing.
 * The principal's number is shown only inside the opened row: it is the
 * number a reviewer rings to confirm the instruction, and it goes nowhere else.
 */

const KIND: Record<string, string> = { letting: "Letting", sale: "Sale", management: "Management" };
const STATUS_WORD = { pending: "Waiting", approved: "Approved", rejected: "Rejected" } as const;
const TONE = { pending: "warning", approved: "success", rejected: "danger" } as const;
const COLS = "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr) 120px";

export function MandatesPanel({
  queue,
  day,
  today,
  consentFor,
}: {
  queue: MandateQueue | null;
  day: (iso: string | null) => string;
  today: string;
  /**
   * V-31: the principal's consent control for one mandate, drawn inside the
   * opened row under the number it is about. Optional, so the panel draws
   * exactly what it drew before when a caller does not pass it.
   */
  consentFor?: (row: MandateRow) => ReactNode;
}) {
  const rows = queue ? [...queue.pending, ...queue.decided] : [];
  return (
    <Panel flush title="Mandates" labelledBy="rv-mandates">
      <div style={{ padding: "0 var(--nf-space-md) var(--nf-space-sm)" }}>
        {queue ? (
          <StatusBar
            label="Mandates by decision"
            segments={[
              { key: "pending", label: "Waiting", value: queue.counts.pending, ink: "pending" },
              { key: "approved", label: "Approved", value: queue.counts.approved, ink: "success" },
              { key: "rejected", label: "Rejected", value: queue.counts.rejected, ink: "danger" },
            ]}
          />
        ) : (
          <ReadFailed what="The mandates" />
        )}
      </div>
      {queue && rows.length === 0 ? (
        <Empty
          title="No mandate has been filed"
          body="An agent or a firm listing a property they do not own files the owner's written instruction here, with the owner's name and a number to ring."
          cause="Deciding one needs an action Session A has not written yet (scope request AR-12); until then this desk shows the queue."
        />
      ) : rows.length > 0 ? (
        <div className="nf-rv-rows" style={{ ["--rv-cols" as string]: COLS }}>
          <div className="nf-rv-rows__head" aria-hidden="true">
            <span>Listing</span>
            <span>Kind</span>
            <span>Principal</span>
            <span>Signed</span>
            <span>Status</span>
          </div>
          {rows.map((row) => (
            <MandateLine key={row.id} row={row} day={day} today={today} consent={consentFor?.(row)} />
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function MandateLine({
  row,
  day,
  today,
  consent,
}: {
  row: MandateRow;
  day: (iso: string | null) => string;
  today: string;
  consent?: ReactNode;
}) {
  const expired = Boolean(row.expiresOn && row.expiresOn < today);
  return (
    <details className="nf-rv-rows__row">
      <summary>
        <span className="nf-rv-rows__cell nf-rv-rows__cell--wide">
          <span className="nf-rv-ref">{row.listingReference ?? row.listingTitle ?? "A listing"}</span>
          {row.listingReference && row.listingTitle ? (
            <span className="nf-rv-table__muted">{row.listingTitle}</span>
          ) : null}
        </span>
        <span className="nf-rv-rows__cell">
          {KIND[row.kind] ?? row.kind}
          {row.exclusive === null ? null : (
            <span className="nf-rv-table__muted" style={{ display: "block" }}>
              {row.exclusive ? "Exclusive" : "Open"}
            </span>
          )}
        </span>
        <span className="nf-rv-rows__cell">{row.principalName}</span>
        <span className="nf-rv-rows__cell nf-rv-table__muted">{row.signedOn ? day(row.signedOn) : "Not given"}</span>
        <span className="nf-rv-rows__cell">
          <Badge tone={TONE[row.status]}>{STATUS_WORD[row.status]}</Badge>
        </span>
      </summary>
      <div className="nf-rv-detail__body" style={{ display: "grid", gap: "var(--nf-space-xs)" }}>
        <p className="nf-rv-msg">
          Principal: {row.principalName}
          {row.principalPhone ? `, ${row.principalPhone}` : ", no number given"}. The call to this number
          is the check; the document is a photograph.
        </p>
        {consent}
        <p className="nf-rv-msg">
          {row.hasDocument ? "A mandate document is on file (open it on the verification desk)." : "No document was uploaded."}
          {row.expiresOn ? ` Expires ${day(row.expiresOn)}${expired ? ", which has passed" : ""}.` : ""}
        </p>
        {row.status === "rejected" && row.rejectionReason ? (
          <p className="nf-rv-msg" style={{ color: "var(--nf-state-error)" }}>
            Refused: {row.rejectionReason}
          </p>
        ) : null}
        {row.status === "pending" ? (
          <p className="nf-rv-panel__note">
            There is no decision for a mandate in the console yet: approving or refusing one needs an
            action Session A has not written (scope request AR-12).
          </p>
        ) : (
          <p className="nf-rv-panel__note">Decided {day(row.reviewedAt)}.</p>
        )}
      </div>
    </details>
  );
}
