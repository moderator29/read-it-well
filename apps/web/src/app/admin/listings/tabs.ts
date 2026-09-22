import type { ListingStatus } from "../_review/contracts";

/**
 * Every listing state the review desk shows, in the order a listing moves
 * through them. DRAFT is left out on purpose: a draft has not been submitted
 * and nothing about it is the console's to decide.
 */
export const LISTING_TABS: { status: Exclude<ListingStatus, "DRAFT">; label: string }[] = [
  { status: "SUBMITTED", label: "Waiting" },
  { status: "UNDER_REVIEW", label: "Under review" },
  { status: "MORE_INFO_REQUIRED", label: "More info needed" },
  { status: "APPROVED", label: "Approved" },
  { status: "PUBLISHED", label: "Live" },
  { status: "REJECTED", label: "Rejected" },
  { status: "SUSPENDED", label: "Suspended" },
];

/** The statuses `getListingSubmissions` returns in its decided bucket. */
const DECIDED: readonly string[] = ["PUBLISHED", "REJECTED", "SUSPENDED"];

export function isDecidedStatus(status: string): boolean {
  return DECIDED.includes(status);
}

type Query = { q?: string; status?: string; from?: string; to?: string; offset?: number };

/**
 * The listing under review, carrying the queue's query so that page reads the
 * same slice the reviewer was looking at and knows which listing is next.
 */
export function reviewHref(id: string, query: Query): string {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.status) search.set("status", query.status);
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  if (query.offset && query.offset > 0) search.set("offset", String(query.offset));
  const tail = search.toString();
  return `/admin/listings/${id}${tail ? `?${tail}` : ""}`;
}

/** The queue itself, with the same query. */
export function queueHrefFrom(query: Query): string {
  const tail = reviewHref("x", query).split("?")[1];
  return `/admin/listings${tail ? `?${tail}` : ""}`;
}

/**
 * The listing after `id` in the rows the queue showed, or null at the end.
 * Only the waiting rows are walked: a decided listing has no "next" to review.
 */
export function nextAfter(ids: readonly string[], id: string): string | null {
  const index = ids.indexOf(id);
  if (index < 0) return ids[0] ?? null;
  return ids[index + 1] ?? null;
}

/**
 * The desk's word for a status: the same word as its tab, so a row badge and
 * the tab that lists it never disagree ("Waiting" on both, not "Submitted"
 * on one). Falls back to the shared vocabulary for anything else.
 */
export function listingStatusWord(status: string, fallback: (status: string) => string): string {
  return LISTING_TABS.find((tab) => tab.status === status)?.label ?? fallback(status);
}
