import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getBookingBoard, type AdminBookingRow } from "@/lib/admin/bookings-queries";
import { fill, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";

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
        {stay.nights === 1 ? copy.nightsOne : fill(copy.nights, { count: stay.nights })}
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
  const ui = adminUi(t, locale);

  const params = await searchParams;
  const raw = params["q"];
  const query = (Array.isArray(raw) ? raw[0] : raw) ?? "";

  const board = await getBookingBoard(query);

  return (
    <div className="nf-console">
      <ui.QueueHeader title={copy.title} lede={copy.lede} />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="nf-label">{copy.searchLabel}</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={copy.searchPlaceholder}
            className="nf-field mt-1 w-full"
          />
        </label>
        <button type="submit" className="nf-chip nf-chip--active shrink-0">
          {copy.search}
        </button>
        {query.length > 0 && (
          <Link href="/admin/bookings" className="nf-chip shrink-0">
            {copy.clearSearch}
          </Link>
        )}
      </form>

      {board.state !== "ok" ? (
        <ui.QueueUnavailable />
      ) : board.data.live.length === 0 &&
        board.data.past.length === 0 &&
        board.data.cancelled.length === 0 ? (
        <ui.QueueEmpty
          title={board.data.searched ? copy.noMatchTitle : copy.emptyTitle}
          body={board.data.searched ? copy.noMatchBody : copy.emptyBody}
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
