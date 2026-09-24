import type { Dictionary } from "@vallo/i18n";
import type { ClockBoard, ClockBoardRow } from "@/lib/after-gate/refunds";

/**
 * V-24. The refund clock on the money desk: refunds due inside the next 24
 * hours, and refunds past their due-by without a completed credit. The same
 * facts `private.alert_overdue_refunds` raises a high alert on every hour, in
 * a place an operator looks before the alert fires.
 *
 * Empty is the normal state and says so in words; a failed read says it could
 * not read, never that nothing is due.
 */
function List({ rows, empty, due }: { rows: ClockBoardRow[]; empty: string; due: string }) {
  if (rows.length === 0) return <p className="nf-body-sm text-[var(--nf-content-muted)]">{empty}</p>;
  return (
    <ul className="grid gap-xs">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-md">
          <a href={`/admin/bookings?q=${row.bookingId}`} className="nf-body-sm font-semibold text-[var(--nf-content-link)]">
            <span className="nf-numeric">{row.amount}</span>
          </a>
          <span className="nf-body-sm nf-numeric text-[var(--nf-content-secondary)]">{due.replace("{date}", row.due)}</span>
        </li>
      ))}
    </ul>
  );
}

export function RefundClock({ board, copy }: { board: ClockBoard; copy: Dictionary["afterTheGate"]["admin"] }) {
  return (
    <section className="nf-panel nf-panel--card mt-lg block p-md" data-testid="admin-refund-clock" aria-label={copy.dueSoonTitle}>
      {board.state === "unavailable" ? (
        <p className="nf-body-sm text-[var(--nf-content-muted)]" role="status">
          {copy.unavailable}
        </p>
      ) : (
        <div className="grid gap-lg md:grid-cols-2">
          <div>
            <h2 className="nf-h4 text-[var(--nf-state-error)]">{copy.overdueTitle}</h2>
            <div className="mt-xs">
              <List rows={board.overdue} empty={copy.overdueEmpty} due={copy.dueAt} />
            </div>
          </div>
          <div>
            <h2 className="nf-h4">{copy.dueSoonTitle}</h2>
            <div className="mt-xs">
              <List rows={board.dueSoon} empty={copy.dueSoonEmpty} due={copy.dueAt} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
