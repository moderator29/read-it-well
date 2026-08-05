import type { Metadata } from "next";
import { formatMoney, getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingSubmissions, type ListingReviewView } from "@/lib/admin/queries";
import { ListingDecision } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";

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
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
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
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(copy.submittedWhen, { when: ui.when(listing.submittedAt) })}
        </span>
      </div>

      <h3 className="mt-2.5 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
        {listing.title}
      </h3>
      <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        {[listing.area, listing.city, listing.stateCode].filter(Boolean).join(", ") ||
          copy.locationMissing}
        {" · "}
        {formatMoney(listing.priceMinor, locale)}{" "}
        {listing.pricePeriod === "year" ? copy.perYear : copy.perNight}
      </p>

      {listing.photos.length > 0 && (
        <div className="nf-scroll-x -mx-1 mt-3 px-1">
          <ul className="flex w-max gap-2">
            {listing.photos.map((photo, index) => (
              <li key={photo}>
                {/* Plain img: these are reviewer thumbnails from the platform
                    storage bucket, not optimised marketing imagery. */}
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
        <ul className="mt-1">
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
        <ui.DetailRow
          label={f.capacity}
          value={fill(copy.capacity, {
            guests: listing.maxGuests,
            bedrooms: listing.bedrooms,
            beds: listing.beds,
            bathrooms: listing.bathrooms,
          })}
        />
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
        <p className="mt-4 text-[0.75rem] text-[var(--nf-content-muted)]">
          {listing.status === "PUBLISHED" ? copy.liveInSearch : copy.closed} {common.inAuditLog}
        </p>
      )}
    </li>
  );
}

export default async function AdminListingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.listings;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const listings = await getListingSubmissions();

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

      {waiting.length === 0 ? (
        <ui.QueueEmpty title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <ul className="nf-queue-list">
          {waiting.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              copy={copy}
              common={common}
              ui={ui}
              locale={locale}
            />
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">{common.recentlyDecided}</h2>
          <ul className="nf-queue-list">
            {decided.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                copy={copy}
                common={common}
                ui={ui}
                locale={locale}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
