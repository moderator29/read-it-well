import Link from "next/link";
import type { AdminCommon } from "./copy";

/**
 * The console's one queue frame: find a row, narrow to it, page through.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE CONSOLE HAD BEFORE THIS.
 *
 * Nineteen destinations. ONE search input across all of them, on
 * `/admin/bookings`. Zero status filters. Zero date ranges. Zero pagination.
 * No page read a filter parameter, applied a `.range()`, or offered a page
 * control, and `components/ui/Table.tsx` was used by the console exactly zero
 * times.
 *
 * At zero rows nobody notices, and every queue is at zero rows today. At a
 * thousand rows the console stops working, and `audit_log` already holds 482.
 * The console's whole job is to find one row among many and act on it, and it
 * could do that on one screen out of nineteen.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS A `<form method="get">` AND NOT A CLIENT COMPONENT.
 *
 * Because the answer belongs in the address bar. A filtered queue is then a
 * link an operator can send to the person who has to act on it, the back button
 * walks the narrowing backwards, a reload lands on the same rows, and the page
 * stays a server component that reads its own parameters. That is the same
 * contract discovery already runs on, and it is why the search on
 * `/admin/bookings` was right about the one thing it did.
 *
 * It also means this file has no hooks and no client boundary, so a queue page
 * keeps rendering its list on the server.
 *
 * ---------------------------------------------------------------------------
 * THE STATUS CHIPS COME FROM THE REAL ENUM, EVERY TIME.
 *
 * `statuses` is passed in by the page, from the same union the query filters
 * on. Nothing here invents a status vocabulary, and nothing here can offer a
 * chip the database would refuse: four admin surfaces were already printing
 * raw column values as chip labels, and a filter that offered a value the enum
 * does not hold would be the same defect pointed the other way.
 *
 * ---------------------------------------------------------------------------
 * PAGINATION IS A CURSOR AND IT IS HONEST ABOUT WHAT IT KNOWS.
 *
 * There is no total and no page count, because a queue read that has fetched
 * one page does not know how many there are and printing "Page 1 of 40" would
 * require a second count query on every load. Next and Previous move an
 * offset, and Next is only offered when the page came back full, which is the
 * one thing the read actually knows.
 */

export type QueueStatusOption = {
  /** The enum value, exactly as the column spells it. */
  value: string;
  /** What it is called on screen. */
  label: string;
};

export type QueueQuery = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  offset?: number;
};

/** Read the queue's own parameters out of a Next `searchParams` bag. */
export function readQueueQuery(
  params: Record<string, string | string[] | undefined>,
): QueueQuery {
  const one = (key: string): string | undefined => {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value && value.length > 0 ? value : undefined;
  };
  const offset = Number.parseInt(one("offset") ?? "", 10);
  return {
    ...(one("q") ? { q: one("q") } : {}),
    ...(one("status") ? { status: one("status") } : {}),
    ...(one("from") ? { from: one("from") } : {}),
    ...(one("to") ? { to: one("to") } : {}),
    /* A negative or unparseable offset is a hand-edited URL, not a page. */
    ...(Number.isFinite(offset) && offset > 0 ? { offset } : {}),
  };
}

/** The same query as a link, with one field changed. */
export function queueHref(base: string, query: QueueQuery, over: Partial<QueueQuery>): string {
  const next = { ...query, ...over };
  const search = new URLSearchParams();
  if (next.q) search.set("q", next.q);
  if (next.status) search.set("status", next.status);
  if (next.from) search.set("from", next.from);
  if (next.to) search.set("to", next.to);
  if (next.offset && next.offset > 0) search.set("offset", String(next.offset));
  const tail = search.toString();
  return tail.length > 0 ? `${base}?${tail}` : base;
}

/** True when anything at all is narrowing this queue. */
export function queueNarrowed(query: QueueQuery): boolean {
  return Boolean(query.q || query.status || query.from || query.to);
}

/**
 * What an empty queue says when it is empty BECAUSE of the filter.
 *
 * "No reports yet" under a status chip is a false statement: there may be
 * hundreds, none of them dismissed. A narrowed empty queue is a result and has
 * to read as one.
 *
 * It was an English constant in this file for one sprint, because the shared
 * console furniture had no keys and eighteen queues each inventing their own
 * pair was the worse of the two wrongs. The keys exist now, so the pair comes
 * from the dictionary and a Hausa operator reads a Hausa result.
 */
export function queueNoMatch(common: AdminCommon): { title: string; body: string } {
  return { title: common.noMatchTitle, body: common.noMatchBody };
}

export function QueueFilters({
  base,
  query,
  statuses,
  common,
  searchable = true,
  searchLabel,
  searchPlaceholder,
}: {
  /** The queue's own path, e.g. "/admin/bookings". */
  base: string;
  query: QueueQuery;
  /** The real enum for THIS queue. Omit where the queue has no status. */
  statuses?: readonly QueueStatusOption[];
  /**
   * The console's shared words.
   *
   * REQUIRED, AND IT USED TO BE FOUR ENGLISH LITERALS IN THIS FILE. "From",
   * "To", "Apply" and "Clear" were written here, and the search label and the
   * no-match pair were English defaults, so the one queue that had its own keys
   * read correctly in four languages and the frame around it did not. A control
   * that is half translated is worse than one that is not, because the half
   * that is translated is the half that tells the reader the rest is a bug.
   */
  common: AdminCommon;
  /**
   * False where the queue genuinely cannot be searched.
   *
   * Not a convenience. `/admin/kyc` is the case: the field a reviewer
   * recognises a row by is the subject's NAME, which is not on the document
   * row and is resolved afterwards through two different paths. A box that
   * searched one of those paths would quietly miss the rows filed under the
   * other, and a search an operator cannot tell is incomplete is worse than a
   * screen that does not offer one. The date range and the status chips still
   * work, so the frame is not all-or-nothing.
   */
  searchable?: boolean;
  /** Only where the queue's own noun genuinely beats "Search this queue". */
  searchLabel?: string;
  searchPlaceholder?: string;
}) {
  const narrowed = queueNarrowed(query);
  const f = common.filters;

  return (
    <div className="mb-block">
      <form method="get" action={base} className="flex flex-wrap items-end gap-row">
        {searchable && (
          <label className="min-w-0 flex-1">
            <span className="nf-label">{searchLabel ?? common.searchLabel}</span>
            <input
              type="search"
              name="q"
              defaultValue={query.q ?? ""}
              placeholder={searchPlaceholder ?? common.searchPlaceholder}
              className="nf-field mt-inline-tight w-full"
            />
          </label>
        )}

        {/* A DATE RANGE, because half of what an operator is asked is "what
            happened on Tuesday". Two native date inputs rather than a picker:
            they are keyboard-reachable, they are localised by the browser, and
            they are the one control a console does not need to invent. */}
        <label className="min-w-0">
          <span className="nf-label">{f.from}</span>
          <input
            type="date"
            name="from"
            defaultValue={query.from ?? ""}
            className="nf-field mt-inline-tight w-full"
          />
        </label>
        <label className="min-w-0">
          <span className="nf-label">{f.to}</span>
          <input
            type="date"
            name="to"
            defaultValue={query.to ?? ""}
            className="nf-field mt-inline-tight w-full"
          />
        </label>

        {/* The status travels with the search so a submit does not silently
            drop the chip the operator already chose. */}
        {query.status && <input type="hidden" name="status" value={query.status} />}

        <button type="submit" className="nf-chip nf-chip--active shrink-0">
          {f.apply}
        </button>
        {narrowed && (
          <Link href={base} className="nf-chip shrink-0">
            {f.clear}
          </Link>
        )}
      </form>

      {/* The status nav's own label and the four strings in `QueuePager` are
          still English. `t.admin.common.filters` gained from, to, apply and
          clear and has no key for these; they are named in the sprint report
          for the next dictionary pass rather than invented here, because a
          fifth private copy of console vocabulary is what this frame exists to
          stop. */}
      {statuses && statuses.length > 0 && (
        /* Links rather than a control, for the same reason the search is a GET:
           a narrowed queue has to be a URL. `aria-current` is what tells a
           screen reader which one is on, because a link whose meaning is "you
           are here" is otherwise silent about it. Tapping the active chip
           clears the status, which is the behaviour a segmented control has and
           the one people try first. */
        <nav aria-label="Filter by status" className="nf-scroll-x mt-row">
          <ul className="flex items-center gap-inline-tight">
            {statuses.map((option) => {
              const on = query.status === option.value;
              return (
                <li key={option.value}>
                  <Link
                    href={queueHref(base, query, {
                      status: on ? undefined : option.value,
                      offset: undefined,
                    })}
                    aria-current={on ? "true" : undefined}
                    className={`nf-chip whitespace-nowrap${on ? " nf-chip--active" : ""}`}
                  >
                    {option.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

/**
 * Next and Previous, and nothing it cannot stand behind.
 *
 * `full` is whether the page came back with as many rows as it asked for. That
 * is the only evidence a cursor read has that there is more, so it is the only
 * thing Next is offered on. No total, no page count, no "1 of 40": those need a
 * second count query per load and a console that is wrong about how much work
 * is waiting is worse than one that does not say.
 */
export function QueuePager({
  base,
  query,
  pageSize,
  full,
  count,
}: {
  base: string;
  query: QueueQuery;
  pageSize: number;
  full: boolean;
  /** Rows on this page, so the operator knows what they are looking at. */
  count: number;
}) {
  const offset = query.offset ?? 0;
  if (offset === 0 && !full) return null;

  return (
    <nav
      aria-label="Queue pages"
      className="mt-block flex flex-wrap items-center justify-between gap-row"
    >
      <p className="nf-caption">
        Showing {count === 0 ? 0 : offset + 1} to {offset + count}
      </p>
      <div className="flex items-center gap-inline-tight">
        {offset > 0 ? (
          <Link
            href={queueHref(base, query, { offset: Math.max(0, offset - pageSize) })}
            className="nf-chip"
          >
            Previous
          </Link>
        ) : null}
        {full ? (
          <Link href={queueHref(base, query, { offset: offset + pageSize })} className="nf-chip">
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
