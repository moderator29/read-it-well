import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, getDictionary, plural, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import {
  BOOKING_STATUSES,
  getBookingBoard,
  type AdminBookingRow,
} from "@/lib/admin/bookings-queries";
import { fill, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";
import {
  QueueFilters,
  queueNarrowed,
  readQueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";

/**
 * The chips, built from the enum rather than beside it.
 *
 * This was three hand-written literals under a comment asserting that
 * `booking_status` had three values. It has five: COMPLETED and NO_SHOW were
 * added when the booking loop finally got an end, and a hand-written list is
 * precisely the thing that does not notice. `BOOKING_STATUSES` is typed against
 * the generated enum and ordered by the life of a stay, and the words come from
 * `t.admin.common.status`, which is where every other status word on this
 * platform comes from, so the chip and the row it filters cannot disagree and a
 * Hausa operator gets Hausa.
 */
function statusFilters(ui: AdminUi): readonly QueueStatusOption[] {
  return BOOKING_STATUSES.map((value) => ({ value, label: ui.statusLabel(value) }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.bookings.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * Every stay on the platform, in three honest buckets.
 *
 * This screen exists because `bookings` carried an admin write policy from the
 * first RLS pass and had no surface behind it, which meant /cancellations was
 * publishing a promise nobody could keep: it told a guest that a person at
 * support cancels a paid stay and returns the money, and there was nowhere any
 * person could do it. The read path is here; the decision itself lives one
 * click in, on the stay's own page, because cancelling somebody's holiday is
 * not something to offer from a list.
 *
 * Nothing here is a queue. No badge, no waiting count, no "clear" state dressed
 * up as good news: a stay sitting in this list is not work anybody owes.
 */
function StayCard({
  stay,
  copy,
  ui,
  locale,
}: {
  stay: AdminBookingRow;
  copy: AdminCopy["bookings"];
  ui: AdminUi;
  locale: Locale;
}) {
  const place = [stay.area, stay.city].filter(Boolean).join(", ");

  /* The counted nouns sit at the root of the dictionary rather than inside the
     console's slice, because a night is a night on the guest surfaces too and
     four copies of "1 night" would drift. Read here rather than drilled through
     `StayGroup` as another prop: `getDictionary` is a lookup in a static object,
     so there is nothing to save by passing it down. */
  const counts = getDictionary(locale).counts;

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ui.StatusChip status={stay.status} />
        {stay.paidMinor > 0 ? (
          <ui.StatusChip
            label={fill(copy.settledChip, { amount: formatMoney(stay.paidMinor, locale) })}
            tone="success"
          />
        ) : (
          <ui.StatusChip label={copy.unpaidChip} tone="neutral" />
        )}
        {stay.refundedMinor > 0 && (
          <ui.StatusChip
            label={fill(copy.refundedChip, { amount: formatMoney(stay.refundedMinor, locale) })}
            tone="warning"
          />
        )}
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(copy.bookedWhen, { when: ui.when(stay.createdAt) })}
        </span>
      </div>

      <h3 className="mt-2.5 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
        {stay.listingTitle}
      </h3>
      <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        {place.length > 0 ? `${place} · ` : ""}
        {ui.day(stay.checkIn)} {"→"} {ui.day(stay.checkOut)}
      </p>
      <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        {stay.guestName ?? copy.unnamed}
        {" · "}
        {plural(stay.nights, counts.nights, locale)}
        {" · "}
        <span className="nf-numeric">{formatMoney(stay.totalMinor, locale)}</span>
      </p>

      <Link
        href={`/admin/bookings/${stay.id}`}
        className="nf-chip mt-3 inline-flex w-fit items-center gap-1.5"
      >
        {copy.open}
      </Link>
    </li>
  );
}

function Group({
  title,
  stays,
  copy,
  ui,
  locale,
}: {
  title: string;
  stays: AdminBookingRow[];
  copy: AdminCopy["bookings"];
  ui: AdminUi;
  locale: Locale;
}) {
  if (stays.length === 0) return null;
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="nf-h3 mb-3 text-[1rem]">{title}</h2>
      <ul className="nf-queue-list">
        {stays.map((stay) => (
          <StayCard key={stay.id} stay={stay} copy={copy} ui={ui} locale={locale} />
        ))}
      </ul>
    </section>
  );
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.bookings;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  /*
   * THE SHARED QUEUE FRAME, ON THE ONE QUEUE THAT ALREADY HAD HALF OF IT.
   *
   * This page carried the console's ONLY search input, hand-rolled, with no
   * status filter, no date range and no pagination, and the other eighteen
   * destinations carried none of it at all. The frame is
   * `_components/QueueFilters` now, so the next queue to grow a filter inherits
   * the same URL contract rather than inventing a second one.
   *
   * THE NARROWING IS IN THE QUERY, WHICH IT WAS NOT.
   *
   * The status chip and the date range used to be a `rows.filter(...)` over
   * whatever the unfiltered read had already returned, capped at 120 rows. At
   * zero rows that is indistinguishable from filtering properly, and at a
   * thousand it quietly answers "show me every cancelled stay in August" with
   * some of them. Both predicates are `.eq()` and `.gte()`/`.lte()` inside
   * `getBookingBoard` now, so the cap applies to the rows that matched rather
   * than to the rows that happened to be read first.
   */
  const params = await searchParams;
  const query = readQueueQuery(params);

  const board = await getBookingBoard({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });

  return (
    <div className="nf-console">
      <ui.QueueHeader title={copy.title} lede={copy.lede} />

      <QueueFilters
        base="/admin/bookings"
        query={query}
        common={common}
        /* The real enum, and only the real enum, so a chip here can never offer
           a value the column would refuse. All five of them: the board has a
           terminal good state now that an agent can record a stay as taken. */
        statuses={statusFilters(ui)}
        searchLabel={copy.searchLabel}
        searchPlaceholder={copy.searchPlaceholder}
      />

      {board.state !== "ok" ? (
        <ui.QueueUnavailable />
      ) : board.data.live.length === 0 &&
        board.data.past.length === 0 &&
        board.data.cancelled.length === 0 ? (
        <ui.QueueEmpty
          title={
            board.data.searched || queueNarrowed(query) ? copy.noMatchTitle : copy.emptyTitle
          }
          body={board.data.searched || queueNarrowed(query) ? copy.noMatchBody : copy.emptyBody}
          /* `bookings` has never held a row, so an unnarrowed empty queue here
             is "nothing has ever arrived", not "you have cleared everything".
             A narrowed one IS a result and keeps the ordinary treatment. */
          everHadRows={board.data.searched || queueNarrowed(query)}
        />
      ) : (
        <>
          <Group
            title={copy.groups.live}
            stays={board.data.live}
            copy={copy}
            ui={ui}
            locale={locale}
          />
          <Group
            title={copy.groups.past}
            stays={board.data.past}
            copy={copy}
            ui={ui}
            locale={locale}
          />
          <Group
            title={copy.groups.cancelled}
            stays={board.data.cancelled}
            copy={copy}
            ui={ui}
            locale={locale}
          />
        </>
      )}
    </div>
  );
}
