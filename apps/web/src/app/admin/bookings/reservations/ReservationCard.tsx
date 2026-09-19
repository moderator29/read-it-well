import { plural, type PluralForms } from "@vallo/i18n";
import { BOOKING_STATUSES, type AdminReservationRow } from "@/lib/admin/bookings-queries";
import type { ReservationDecision } from "@/lib/admin/schema";
import type { AdminUi } from "../../_components/ui";
import type { QueueStatusOption } from "../../_components/QueueFilters";
import { ReservationDecisions } from "./ReservationDecisions";

/**
 * The reservation desk's rows, out of the page so the preview harness draws
 * the same card the desk draws. A page file may export only what Next allows,
 * which is why these live beside it rather than in it.
 */

/** The same five chips as the stays board: the table reuses the enum. */
export function reservationStatusFilters(ui: AdminUi): readonly QueueStatusOption[] {
  return BOOKING_STATUSES.map((value) => ({ value, label: ui.statusLabel(value) }));
}

/** Which decisions a row can take. The action re-proves it against the row. */
export function offersFor(row: AdminReservationRow): ReservationDecision[] {
  if (row.past) return [];
  if (row.status === "PENDING") return ["confirm", "decline"];
  if (row.status === "CONFIRMED") return ["cancel"];
  return [];
}

/**
 * One table, under the console's eye.
 *
 * A host answers a request from their own board and, when they do not, the
 * guest waits on a table nobody has said yes or no to. This card is where an
 * operator sees that and answers on the host's behalf, and where a confirmed
 * table can be called off by Vallo with a reason the guest reads.
 */
export function TableCard({
  row,
  ui,
  guestsWord,
}: {
  row: AdminReservationRow;
  ui: AdminUi;
  guestsWord: PluralForms;
}) {
  const guest = row.guestName ?? "A guest without a display name";
  return (
    <li className="nf-card p-md sm:p-lg">
      <div className="flex flex-wrap items-center gap-xs">
        <ui.StatusChip status={row.status} />
        {row.past && row.status !== "CANCELLED" && (
          <ui.StatusChip label="Time has passed" tone="neutral" />
        )}
        <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          Asked {ui.when(row.createdAt)}
        </span>
      </div>

      <h3 className="mt-xs text-[var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
        {row.placeName}
      </h3>
      <p className="mt-3xs text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
        {ui.when(row.reservedFor)}
        {" · "}
        {guest}
        {" · "}
        {plural(row.partySize, guestsWord, "en")}
      </p>
      {row.note && (
        <p className="mt-2xs text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {row.note}
        </p>
      )}
      {/* THE ID IS NEVER CLIPPED. It is what a guest quotes and what an operator
          pastes into the search box or a colleague's message. */}
      <p className="mt-xs font-mono text-[var(--nf-text-caption)] text-[var(--nf-content-muted)] [overflow-wrap:anywhere] [user-select:all]">
        {row.id}
      </p>

      <ReservationDecisions
        reservationId={row.id}
        guestName={guest}
        placeName={row.placeName}
        offers={offersFor(row)}
      />
    </li>
  );
}

/** One of the board's three groups. Renders nothing when the group is empty. */
export function ReservationGroup({
  title,
  rows,
  ui,
  guestsWord,
}: {
  title: string;
  rows: AdminReservationRow[];
  ui: AdminUi;
  guestsWord: PluralForms;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-xl first:mt-0">
      <h2 className="nf-h3 mb-sm text-[var(--nf-text-body)]">{title}</h2>
      <ul className="nf-queue-list">
        {rows.map((row) => (
          <TableCard key={row.id} row={row} ui={ui} guestsWord={guestsWord} />
        ))}
      </ul>
    </section>
  );
}
