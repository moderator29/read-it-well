import { formatMoney, type Locale } from "@vallo/i18n";
import type { ListingReviewView } from "@/lib/admin/queries";
import { PERIOD_SUFFIX } from "@/lib/listings/pricing";
import type { AdminCopy } from "../_components/copy";
import { ageShort } from "../_review/metrics";

/**
 * The listing, as one row of the queue table and one summary line of the
 * review page. Pure: it maps the view `getListingSubmissions` already returns
 * and reads nothing else.
 */

export type QueueRow = {
  id: string;
  href: string;
  /** The listing code once it is live, the id-derived stand-in before. */
  reference: string;
  typeLabel: string;
  thumb: string | null;
  address: string;
  lister: string | null;
  /** Owner, Agent or Firm, from `getQueueRowExtras`; null draws no tag. */
  listerRole: string | null;
  /** True for an example listing (`is_demo`), null when that could not be read. */
  isExample: boolean | null;
  /** The lister's badge tier, read from `public.person_badge`. */
  badge: "gold" | "platinum" | null;
  price: string;
  submittedAge: string;
  status: string;
};

/** The six hex characters the queue has always used before a code exists. */
export function standInReference(id: string): string {
  return `LST-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function referenceOf(listing: Pick<ListingReviewView, "id" | "reference">): string {
  return listing.reference ?? standInReference(listing.id);
}

export function periodWords(
  listing: Pick<ListingReviewView, "pricePeriod">,
  copy: Pick<AdminCopy["listings"], "perYear" | "perNight">,
): string {
  if (listing.pricePeriod === "year") return copy.perYear;
  if (listing.pricePeriod === "night") return copy.perNight;
  return PERIOD_SUFFIX[listing.pricePeriod];
}

export function priceLine(
  listing: Pick<ListingReviewView, "priceMinor" | "pricePeriod">,
  copy: Pick<AdminCopy["listings"], "perYear" | "perNight">,
  locale: Locale,
): string {
  const words = periodWords(listing, copy);
  return `${formatMoney(listing.priceMinor, locale)}${words ? ` ${words}` : ""}`;
}

export function placeLine(listing: Pick<ListingReviewView, "area" | "city">): string {
  return [listing.area, listing.city].filter(Boolean).join(", ");
}

export function toQueueRow(
  listing: ListingReviewView,
  copy: AdminCopy["listings"],
  locale: Locale,
  hrefFor: (id: string) => string,
  now: number = Date.now(),
): QueueRow {
  return {
    id: listing.id,
    href: hrefFor(listing.id),
    reference: referenceOf(listing),
    typeLabel: copy.propertyType[listing.propertyType],
    thumb: listing.photos[0] ?? null,
    address: placeLine(listing) || copy.locationMissing,
    lister: listing.agentName,
    listerRole: null,
    isExample: null,
    badge: null,
    price: priceLine(listing, copy, locale),
    submittedAge: ageShort(listing.submittedAt ?? listing.createdAt, now) ?? "Not recorded",
    status: listing.status,
  };
}
