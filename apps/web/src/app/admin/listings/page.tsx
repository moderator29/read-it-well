import type { Metadata } from "next";
import { formatMoney } from "@naijafinds/i18n";
import { getListingSubmissions, type ListingReviewView } from "@/lib/admin/queries";
import { ListingDecision } from "../_components/AdminActions";
import {
  CheckRow,
  DetailRow,
  DetailSection,
  QueueEmpty,
  QueueHeader,
  QueueUnavailable,
  StatusChip,
  formatWhen,
} from "../_components/ui";

export const metadata: Metadata = { title: "Listing review", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PROPERTY_LABEL: Record<ListingReviewView["propertyType"], string> = {
  apartment: "Apartment",
  hotel: "Hotel",
  home: "Home",
  villa: "Villa",
  shortlet: "Shortlet",
  rental: "Rental",
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
function ListingCard({ listing }: { listing: ListingReviewView }) {
  const decidable = listing.status !== "PUBLISHED" && listing.status !== "REJECTED";
  const failing = listing.checks.filter((check) => !check.pass).length;

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={listing.status} />
        <StatusChip label={PROPERTY_LABEL[listing.propertyType]} tone="neutral" />
        {failing > 0 && (
          <StatusChip
            label={failing === 1 ? "1 checklist line to look at" : `${failing} checklist lines to look at`}
            tone="warning"
          />
        )}
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          Submitted {formatWhen(listing.submittedAt)}
        </span>
      </div>

      <h3 className="mt-2.5 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
        {listing.title}
      </h3>
      <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        {[listing.area, listing.city, listing.stateCode].filter(Boolean).join(", ") ||
          "Location not given"}
        {" · "}
        {formatMoney(listing.priceMinor)}
        {listing.pricePeriod === "year" ? " per year" : " per night"}
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
                  alt={`${listing.title}, photo ${index + 1}`}
                  loading="lazy"
                  className="h-24 w-32 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <DetailSection title="Admission checklist">
        <ul className="mt-1">
          {listing.checks.map((check) => (
            <CheckRow
              key={check.label}
              label={check.label}
              pass={check.pass}
              detail={check.detail}
            />
          ))}
        </ul>
      </DetailSection>

      <DetailSection title="Submission">
        <DetailRow label="Agent" value={listing.agentName} />
        <DetailRow
          label="Capacity"
          value={`${listing.maxGuests} guests, ${listing.bedrooms} bedrooms, ${listing.beds} beds, ${listing.bathrooms} bathrooms`}
        />
        <DetailRow label="Address" value={listing.address} />
        <DetailRow label="Amenities" value={`${listing.amenityCount} selected`} />
        <DetailRow label="Description" value={listing.description} />
        {listing.reviewNotes && <DetailRow label="Last reviewer note" value={listing.reviewNotes} />}
        {listing.reviewedAt && (
          <DetailRow label="Last reviewed" value={formatWhen(listing.reviewedAt)} />
        )}
      </DetailSection>

      {decidable ? (
        <ListingDecision listingId={listing.id} status={listing.status} title={listing.title} />
      ) : (
        <p className="mt-4 text-[0.75rem] text-[var(--nf-content-muted)]">
          {listing.status === "PUBLISHED"
            ? "Live in search. The decision is in the audit log."
            : "Closed. The decision is in the audit log."}
        </p>
      )}
    </li>
  );
}

export default async function AdminListingsPage() {
  const listings = await getListingSubmissions();

  if (listings.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <QueueHeader title="Listing review" lede="Submissions waiting to be checked." />
        <QueueUnavailable />
      </div>
    );
  }

  const { waiting, decided } = listings.data;
  // Changes requested sits with the agent, not with us, so it stays visible in
  // the list but is not counted as work waiting on the console.
  const onUs = waiting.filter((listing) => listing.status !== "MORE_INFO_REQUIRED").length;

  return (
    <div className="mx-auto max-w-3xl">
      <QueueHeader
        title="Listing review"
        lede="Approve says the submission passes the admission checklist. Publish is the second, separate step that puts it into public search. Sending one back tells the agent exactly which line to fix."
        count={onUs}
      />

      {waiting.length === 0 ? (
        <QueueEmpty
          title="No listings waiting"
          body="Every submission has been dealt with. New ones appear here as agents submit them."
        />
      ) : (
        <ul className="space-y-3">
          {waiting.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">Recently decided</h2>
          <ul className="space-y-3">
            {decided.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
