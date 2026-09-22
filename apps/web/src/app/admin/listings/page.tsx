import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingSubmissions } from "@/lib/admin/queries";
import {
  getListingReviewTimes,
  getListingStatusCounts,
  getQueueRowExtras,
} from "@/lib/admin/reads/listings";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import { adminUi } from "../_components/ui";
import { QueueFilters, queueHref, queueNarrowed, readQueueQuery } from "../_components/QueueFilters";
import { LiveRefresh } from "../_review/LiveRefresh";
import { ListingsQueue } from "./ListingsQueue";
import { toQueueRow } from "./rows";
import { LISTING_TABS, isDecidedStatus, reviewHref } from "./tabs";
import "../_review/review.css";

/*
 * The card the preview harness photographs. It lived in this file and
 * `(dev)/preview/c1/listing-review` imports it from here, so it is re-exported
 * rather than moved out from under that import.
 */
export { ListingCard } from "./ListingCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.listings.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

const ROLE_WORD = { owner: "Owner", agent: "Agent", firm: "Firm" } as const;

/**
 * Listings: the review queue, C1D98B3C panel 1.
 *
 * WHAT IS LIVE. The rows, the tabs, the search, the date range and the pager,
 * all through `getListingSubmissions`, which pages the waiting bucket forty at
 * a time. A row opens the listing under review at `/admin/listings/[id]`, and
 * carries this page's query with it so that page reads the same slice and
 * knows which listing comes next.
 *
 * THE NUMBERS. Tab counts and the Queue health donut are exact per-status
 * counts (`getListingStatusCounts`, lib/admin/reads/listings.ts); the donut
 * counts real listings only and says how many examples it left out, because an
 * example listing must never pass as real supply. Average review time is the
 * median from the audit log's `listing.review` rows (`getListingReviewTimes`),
 * this week against last. Each row carries the lister's role and, where the
 * listing is an example, an Example tag (`getQueueRowExtras`). None of these is
 * computed from the rows on screen: a count of a page is not a count of a
 * queue.
 *
 * Every listing state has a tab. The render draws five; the founder asked for
 * every state to be covered, so Under review, Live and Suspended are here too.
 * The decided states (Live, Rejected, Suspended) come back as the ten most
 * recent from the read, and the page says so until AR-5 pages them.
 */
export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.listings;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const query = readQueueQuery(await searchParams);
  const status = LISTING_TABS.some((tab) => tab.status === query.status) ? query.status : undefined;
  const offset = query.offset ?? 0;
  const page = Math.floor(offset / QUEUE_PAGE_SIZE) + 1;

  const [read, counts, times] = await Promise.all([
    getListingSubmissions({
      ...(query.q ? { q: query.q } : {}),
      ...(status ? { status } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
      ...(offset ? { offset } : {}),
    }),
    getListingStatusCounts(),
    getListingReviewTimes(),
  ]);
  const total = (key: string) =>
    counts.state === "ok"
      ? (counts.data.real[key as keyof typeof counts.data.real] ?? 0) +
        (counts.data.examples[key as keyof typeof counts.data.examples] ?? 0)
      : null;
  const allCount =
    counts.state === "ok"
      ? LISTING_TABS.reduce((sum, tab) => sum + (total(tab.status) ?? 0), 0)
      : null;

  const base = "/admin/listings";
  const tabs = [
    {
      key: "all",
      label: "All",
      href: queueHref(base, query, { status: undefined, offset: undefined }),
      on: !status,
      count: allCount,
    },
    ...LISTING_TABS.map((tab) => ({
      key: tab.status,
      label: tab.label,
      href: queueHref(base, query, { status: tab.status, offset: undefined }),
      on: status === tab.status,
      count: total(tab.status),
    })),
  ];
  const hrefFor = (id: string) => reviewHref(id, query);

  if (read.state !== "ok") {
    return (
      <ListingsQueue
        title="Listings"
        sub="Review and manage all submitted listings."
        tabs={tabs}
        rows={[]}
        statusLabel={ui.statusLabel}
        counts={null}
        reviewTimes={null}
        page={page}
        hasNext={false}
        hrefForPage={() => base}
        empty={null}
        unavailable
      />
    );
  }

  const { waiting, decided, full } = read.data;
  const decidedTab = Boolean(status && isDecidedStatus(status));
  const main = decidedTab ? decided : waiting;
  const shownDecided = !status && offset === 0 ? decided : [];
  const extras = await getQueueRowExtras([...main, ...shownDecided].map((listing) => listing.id));
  const rowOf = (listing: (typeof main)[number]) => {
    const row = toQueueRow(listing, copy, locale, hrefFor);
    const extra = extras.state === "ok" ? extras.data.get(listing.id) : undefined;
    return {
      ...row,
      listerRole: extra?.role ? ROLE_WORD[extra.role] : null,
      isExample: extra ? extra.isDemo : null,
    };
  };
  const narrowed = queueNarrowed(query) || offset > 0;

  return (
    <>
      <LiveRefresh />
      <ListingsQueue
        title="Listings"
        sub="Review and manage all submitted listings."
        tabs={tabs}
        filters={
          <>
            <QueueFilters
              base={base}
              query={query}
              common={common}
              searchPlaceholder="Search by title or city"
            />
          </>
        }
        rows={main.map(rowOf)}
        decided={shownDecided.length > 0 ? shownDecided.map(rowOf) : undefined}
        decidedTitle={common.recentlyDecided}
        statusLabel={ui.statusLabel}
        counts={counts.state === "ok" ? counts.data.real : null}
        examples={
          counts.state === "ok"
            ? Object.values(counts.data.examples).reduce((sum, n) => sum + n, 0)
            : null
        }
        reviewTimes={times.state === "ok" ? times.data : null}
        page={decidedTab ? 1 : page}
        hasNext={decidedTab ? false : full}
        hrefForPage={(p) => queueHref(base, query, { offset: (p - 1) * QUEUE_PAGE_SIZE })}
        empty={
          narrowed
            ? { title: common.noMatchTitle, body: common.noMatchBody }
            : { title: copy.emptyTitle, body: copy.emptyBody }
        }
        capNote={
          decidedTab && main.length >= 10
            ? "These are the ten most recent. This tab cannot page further back until request AR-5 lands. Narrow by title, city or date to reach older ones."
            : null
        }
      />
    </>
  );
}
