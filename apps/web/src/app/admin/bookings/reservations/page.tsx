import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, plural, type PluralForms } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import {
  BOOKING_STATUSES,
  getReservationBoard,
  type AdminReservationRow,
} from "@/lib/admin/bookings-queries";
import type { ReservationDecision } from "@/lib/admin/schema";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import { adminUi, type AdminUi } from "../../_components/ui";
import {
  QueueFilters,
  QueuePager,
  queueNarrowed,
  readQueueQuery,
  type QueueStatusOption,
} from "../../_components/QueueFilters";
import { ReservationDecisions } from "./ReservationDecisions";

export const metadata: Metadata = {
  title: "Reservations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const BASE = "/admin/bookings/reservations";

/** The same five chips as the stays board: the table reuses the enum. */
function statusFilters(ui: AdminUi): readonly QueueStatusOption[] {
  return BOOKING_STATUSES.map((value) => ({ value, label: ui.statusLabel(value) }));
}

/** Which decisions a row can take. The action re-proves it against the row. */
function offersFor(row: AdminReservationRow): ReservationDecision[] {
  if (row.past) return [];
  if (row.status === "PENDING") return ["confirm", "decline"];
  if (row.status === "CONFIRMED") return ["cancel"];
  return [];
}

/**
 * Restaurant reservations, under the console's eye.
 *
 * A host answers a request from their own board and, when they do not, the
 * guest waits on a table nobody has said yes or no to. This queue is where
 * an operator sees that and answers on the host's behalf, and where a
 * confirmed table can be called off by Vallo with a reason the guest reads.
 * Requests come first because they are the only rows anybody is waiting on.
 */
function TableCard({
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

function Group({
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

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);
  const guestsWord = t.counts.guests;

  const params = await searchParams;
  const query = readQueueQuery(params);
  const board = await getReservationBoard({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.offset ? { offset: query.offset } : {}),
  });

  const back = (
    <Link href="/admin/bookings" className="nf-chip mb-md inline-flex w-fit items-center gap-2xs">
      All stays
    </Link>
  );

  if (board.state !== "ok") {
    return (
      <div className="nf-console">
        {back}
        <ui.QueueHeader title="Reservations" lede="Tables asked for at restaurants on Vallo." />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { requests, upcoming, past, full, waiting } = board.data;
  const shown = requests.length + upcoming.length + past.length;
  const narrowed = queueNarrowed(query) || (query.offset ?? 0) > 0;

  return (
    <div className="nf-console">
      {back}
      <ui.QueueHeader
        title="Reservations"
        lede="Every table asked for at a restaurant on Vallo. A request the restaurant has not answered can be answered here on its behalf, and a confirmed table can be called off with a reason the guest reads word for word. Nothing here moves money."
        count={waiting}
      />

      <QueueFilters
        base={BASE}
        query={query}
        common={common}
        statuses={statusFilters(ui)}
        searchLabel="Find a table"
        searchPlaceholder="Reservation id, or part of the restaurant's name"
      />
      {/* The date range narrows by when the table is FOR, not when it was
          asked for, because "which tables are on Saturday" is the question. */}
      <p className="nf-caption -mt-row mb-block">
        The dates narrow by when the table is for.
      </p>

      {shown === 0 ? (
        <ui.QueueEmpty
          title={narrowed ? common.noMatchTitle : "No tables yet"}
          body={
            narrowed
              ? common.noMatchBody
              : "Reservations appear here the moment a guest asks for a table. Nothing on this screen is waiting on you."
          }
          state={narrowed ? "no-match" : "never"}
        />
      ) : (
        <>
          <Group title="Waiting on the restaurant" rows={requests} ui={ui} guestsWord={guestsWord} />
          <Group title="Confirmed and ahead" rows={upcoming} ui={ui} guestsWord={guestsWord} />
          <Group title="Already over or cancelled" rows={past} ui={ui} guestsWord={guestsWord} />
        </>
      )}

      <QueuePager base={BASE} query={query} pageSize={QUEUE_PAGE_SIZE} full={full} count={shown} />
    </div>
  );
}
