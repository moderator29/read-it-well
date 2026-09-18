import type { Metadata } from "next";
import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingSubmissions, type ListingReviewView } from "@/lib/admin/queries";
import { ListingDecision } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";
import { QueueTable, shortRef, type QueueRowData } from "../_components/QueueTable";
import {
  QueueFilters,
  queueNarrowed,
  readQueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { Constants } from "@/lib/supabase/database.types";
import { PERIOD_SUFFIX, SALE_STATUS_LABEL, TENURE_LABEL } from "@/lib/listings/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.listings.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * The admission checklist, matched to its translation.
 *
 * `lib/admin/queries` builds each check as a label and a detail with no stable
 * key on it, so the only thing available to match on is the English label it
 * ships. That is what this table does, and an unmatched label falls through to
 * the English it came with rather than rendering blank. Giving `QualityCheck` a
 * key would let this table go: it belongs on the queries module, which is
 * outside this surface's scope.
 */
const CHECK_KEYS: Record<string, keyof AdminCopy["listings"]["checks"]> = {
  "Four photos or more": "photoCount",
  "Cover photo set": "cover",
  "Title in title case": "titleCase",
  "Area and city recorded": "place",
  "Price recorded in naira": "price",
  "Bedrooms and bathrooms recorded": "rooms",
  "Amenities chosen": "amenities",
  "Description of 40 words or more": "description",
  "No contact or payment details in the text": "clean",
};

/**
 * Listing review: the last gate before a property reaches guests.
 *
 * Two steps on purpose. Approve says the submission passes the admission
 * checklist; publish is the separate act that puts it into public search, where
 * the listings RLS policy makes PUBLISHED rows readable by anyone. Nothing goes
 * live by accident, and the reviewer sees the photos and the quality checklist
 * from HYBRID_INVENTORY section 5 before either step.
 */
function ListingCard({
  listing,
  copy,
  common,
  ui,
  locale,
}: {
  listing: ListingReviewView;
  copy: AdminCopy["listings"];
  common: AdminCommon;
  ui: AdminUi;
  locale: Locale;
}) {
  const decidable = listing.status !== "PUBLISHED" && listing.status !== "REJECTED";
  const failing = listing.checks.filter((check) => !check.pass).length;
  const f = copy.fields;

  return (
    <li className="nf-card p-md sm:p-lg">
      <div className="flex flex-wrap items-center gap-xs">
        <ui.StatusChip status={listing.status} />
        <ui.StatusChip label={copy.propertyType[listing.propertyType]} tone="neutral" />
        {failing > 0 && (
          <ui.StatusChip
            label={
              failing === 1
                ? copy.checklistLineOne
                : fill(copy.checklistLines, { count: failing })
            }
            tone="warning"
          />
        )}
        <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {fill(copy.submittedWhen, { when: ui.when(listing.submittedAt) })}
        </span>
      </div>

      <h3 className="mt-xs text-[var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
        {listing.title}
      </h3>
      <p className="mt-3xs text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
        {[listing.area, listing.city, listing.stateCode].filter(Boolean).join(", ") ||
          copy.locationMissing}
        {" · "}
        {formatMoney(listing.priceMinor, locale)}{" "}
        {/* Six possible units now, not two. The dictionary carries the yearly
            and nightly wordings it was written for; the four the rent-and-sale
            model added read in English rather than being forced into one of
            those two, because printing "per night" beside an asking price is
            worse than printing an untranslated phrase. */}
        {listing.pricePeriod === "year"
          ? copy.perYear
          : listing.pricePeriod === "night"
            ? copy.perNight
            : PERIOD_SUFFIX[listing.pricePeriod]}
        {listing.intent === "sale" && listing.tenure ? (
          <>
            {" · "}
            {TENURE_LABEL[listing.tenure]}
          </>
        ) : null}
      </p>

      {/*
        What a tenant actually has to find, itemised.

        The reviewer approving a listing is the last person who can catch a
        4.5m yearly rent that quietly costs seven million at the door, and
        until now this screen showed them one figure and no breakdown at all.
      */}
      {listing.moveIn && (
        <div className="mt-xs rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-sm">
          <p className="text-[var(--nf-text-overline)] font-semibold text-[var(--nf-content-primary)]">
            To move in: {formatMoney(listing.moveIn.totalMinor, locale)}
            <span className="ml-2xs font-normal text-[var(--nf-content-muted)]">
              {listing.moveIn.totalStated ? "as stated" : "summed from the parts"}
            </span>
          </p>
          <ul className="mt-2xs space-y-3xs">
            {listing.moveIn.parts.map((part) => (
              <li
                key={part.key}
                className="flex justify-between gap-sm text-[var(--nf-text-overline)] text-[var(--nf-content-secondary)]"
              >
                <span>{part.label}</span>
                <span className="nf-numeric">{formatMoney(part.minor, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {listing.photos.length > 0 && (
        <div className="nf-scroll-x -mx-2xs mt-sm px-2xs">
          <ul className="flex w-max gap-xs">
            {listing.photos.map((photo, index) => (
              <li key={photo}>
                {/* Plain img: these are reviewer thumbnails from the platform
                    storage bucket, not optimised marketing imagery, and a
                    signed URL cannot go through the optimiser at all. The
                    reasoning was written here already; the directive makes it
                    machine-readable so the rule stops reporting a decision
                    somebody has taken. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={fill(copy.photoAlt, { title: listing.title, number: index + 1 })}
                  loading="lazy"
                  className="h-24 w-32 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <ui.DetailSection title={copy.checklistTitle}>
        <ul className="mt-2xs">
          {listing.checks.map((check) => {
            const key = CHECK_KEYS[check.label];
            return (
              <ui.CheckRow
                key={check.label}
                label={key ? copy.checks[key] : check.label}
                pass={check.pass}
                detail={check.detail}
              />
            );
          })}
        </ul>
      </ui.DetailSection>

      <ui.DetailSection title={copy.submission}>
        <ui.DetailRow label={f.agent} value={listing.agentName} />
        {/* Guests and beds are no longer columns, so the dictionary's four-slot
            capacity sentence cannot be filled. Two facts stated plainly beat
            four with two of them invented. */}
        <ui.DetailRow
          label={f.capacity}
          value={`${listing.bedrooms} bedrooms, ${listing.bathrooms} bathrooms`}
        />
        {listing.intent === "sale" && (
          <ui.DetailRow
            label="Sale"
            value={[
              listing.tenure ? TENURE_LABEL[listing.tenure] : "No title stated",
              listing.saleStatus ? SALE_STATUS_LABEL[listing.saleStatus] : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
        <ui.DetailRow label={f.address} value={listing.address} />
        <ui.DetailRow
          label={f.amenities}
          value={fill(copy.amenitiesSelected, { count: listing.amenityCount })}
        />
        <ui.DetailRow label={f.description} value={listing.description} />
        {listing.reviewNotes && <ui.DetailRow label={f.lastNote} value={listing.reviewNotes} />}
        {listing.reviewedAt && (
          <ui.DetailRow label={f.lastReviewed} value={ui.when(listing.reviewedAt)} />
        )}
      </ui.DetailSection>

      {decidable ? (
        <ListingDecision
          listingId={listing.id}
          status={listing.status}
          title={listing.title}
          copy={copy}
          common={common}
        />
      ) : (
        <p className="mt-md text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {listing.status === "PUBLISHED" ? copy.liveInSearch : copy.closed} {common.inAuditLog}
        </p>
      )}
    </li>
  );
}

/** The chips, from `listing_status`. Eight values, straight off the enum. */
function statusFilters(ui: AdminUi): readonly QueueStatusOption[] {
  return Constants.public.Enums.listing_status.map((value) => ({
    value,
    label: ui.statusLabel(value),
  }));
}

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

  /* The shared queue frame. Search is over the title and the city, not the
     address: see the note on `getListingSubmissions`. No pager, for the same
     reason as the applications queue. */
  const params = await searchParams;
  const query = readQueueQuery(params);
  const narrowed = queueNarrowed(query);
  const listings = await getListingSubmissions({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });

  if (listings.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title={copy.title} lede={copy.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { waiting, decided } = listings.data;
  // Changes requested sits with the agent, not with us, so it stays visible in
  // the list but is not counted as work waiting on the console.
  const onUs = waiting.filter((listing) => listing.status !== "MORE_INFO_REQUIRED").length;

  return (
    <div className="nf-console">
      <ui.QueueHeader title={copy.title} lede={copy.lede} count={onUs} />

      <QueueFilters
        base="/admin/listings"
        query={query}
        common={common}
        statuses={statusFilters(ui)}
        searchPlaceholder="Search by title or city"
      />

      {waiting.length === 0 && decided.length === 0 && narrowed ? (
        /* A SEARCH THAT MATCHED NOTHING IS NOT A CLEARANCE. This drew the
           emerald tick, so "all clear" was shown over a queue that may hold
           hundreds of rows, none of them matching. The third state says what
           this actually is: the result of the operator's own filter. */
        <ui.QueueEmpty
          title={common.noMatchTitle}
          body={common.noMatchBody}
          state="no-match"
        />
      ) : waiting.length === 0 ? (
        narrowed ? null : (
          /* Earned only if something was actually reviewed. See F2-056. */
          <ui.QueueEmpty
            title={copy.emptyTitle}
            body={copy.emptyBody}
            everHadRows={decided.length > 0}
          />
        )
      ) : (
        <QueueTable
          label="Listing review"
          rows={waiting.map((listing) => ({
            ...listingRow(listing, ui),
            children: (
              <ul className="nf-queue-list">
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  copy={copy}
                  common={common}
                  ui={ui}
                  locale={locale}
                />
              </ul>
            ),
          }))}
        />
      )}

      {decided.length > 0 && (
        <section className="mt-xl">
          <h2 className="nf-h3 mb-sm text-[var(--nf-text-body)]">{common.recentlyDecided}</h2>
          <QueueTable
          label="Listing review"
          rows={decided.map((listing) => ({
            ...listingRow(listing, ui),
            children: (
              <ul className="nf-queue-list">
                <ListingCard
                    key={listing.id}
                    listing={listing}
                    copy={copy}
                    common={common}
                    ui={ui}
                    locale={locale}
                  />
              </ul>
            ),
          }))}
        />
        </section>
      )}
    </div>
  );
}

/** The dense row a listing takes in the console table. */
function listingRow(listing: ListingReviewView, ui: AdminUi): QueueRowData {
  return {
    id: listing.id,
    reference: shortRef("LST", listing.id),
    type: "Listing",
    icon: "house",
    title: listing.title,
    sub: [listing.area, listing.city].filter(Boolean).join(", "),
    detail: `${listing.bedrooms} bed, ${listing.bathrooms} bath`,
    detailSub: listing.agentName ?? undefined,
    status: listing.status,
    statusLabel: ui.statusLabel(listing.status),
    submitted: ui.when(listing.submittedAt ?? listing.createdAt),
  };
}
