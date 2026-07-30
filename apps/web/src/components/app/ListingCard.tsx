import Image from "next/image";
import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Listing card media.
 *
 * The lead photo renders on top of a deterministic gradient scene. When the
 * photo cannot load (offline, CDN unreachable) the gradient and skyline
 * silhouette are already painted underneath, so the card degrades gracefully
 * instead of showing an empty tile.
 */
const HUES: [string, string][] = [
  ["#1E3A8A", "#172554"],
  ["#155E75", "#0F172A"],
  ["#0C4A6E", "#111827"],
  ["#334155", "#0F172A"],
  ["#1E40AF", "#1E1B4B"],
  ["#312E81", "#0F172A"],
];

const AMENITY_ICON: Record<string, UiIconName> = {
  pool: "pool",
  wifi: "wifi",
  kitchen: "kitchen",
  parking: "parking",
};

/**
 * Partner cards, per docs/HYBRID_INVENTORY.md section 4.
 *
 * Third-party stock never shows the verified badge and never opens in-platform
 * messaging, because there is no agent behind it and no inspection path. The
 * action always leaves the platform: a hotel is booked with the partner, a
 * restaurant links to directions and its own page and is never bookable here.
 * The links sit outside the card's own link so an anchor never nests inside one.
 */
function PartnerActions({ listing }: { listing: Listing }) {
  const partner = listing.partner;
  const book = listing.kind === "hotel" ? partner?.bookUrl : undefined;
  const directions = listing.kind === "restaurant" ? partner?.directionsUrl : undefined;
  const venue = listing.kind === "restaurant" ? partner?.venueUrl : undefined;
  const hasAction = Boolean(book ?? directions ?? venue);
  if (!hasAction && !partner?.attribution) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
      {book && (
        <a
          href={book}
          target="_blank"
          rel="noopener noreferrer"
          className="nf-btn nf-btn--glass h-9 px-3.5 text-[0.8125rem]"
        >
          Book
        </a>
      )}
      {directions && (
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="nf-btn nf-btn--glass h-9 px-3.5 text-[0.8125rem]"
        >
          Directions
        </a>
      )}
      {venue && (
        <a
          href={venue}
          target="_blank"
          rel="noopener noreferrer"
          className="nf-btn nf-btn--glass h-9 px-3.5 text-[0.8125rem]"
        >
          Menu
        </a>
      )}
      {partner?.attribution === "Google" && (
        <span className="ml-auto text-[0.6875rem] text-[var(--nf-content-muted)]">
          Powered by Google
        </span>
      )}
    </div>
  );
}

export function ListingCard({
  listing,
  locale,
  t,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
}) {
  const [from, to] = HUES[listing.hue % HUES.length] ?? HUES[0]!;
  const photo = listing.photos[0];
  // Restaurants and experiences price per head; everything else is nightly.
  const perHead = listing.kind === "restaurant" || listing.kind === "experience";
  const isPartner = listing.source === "partner";
  // Partner feeds place a venue by city without an area below it. Printing
  // "Lagos, Lagos" would read as a bug, so a repeated locality collapses to one.
  const where =
    listing.area && listing.area !== listing.city
      ? `${listing.area}, ${listing.city}`
      : (listing.area || listing.city);
  // A price is shown only when there is a real one. Partner restaurants come
  // with a price level rather than an amount, and a guessed naira figure is
  // worse than none.
  const hasPrice = listing.priceMinor > 0;

  return (
    <article className="nf-card nf-card--interactive group overflow-hidden">
      <Link href={`/listing/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {/* Media layer scales gently on hover; badges and scrim stay put. */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)` }}
          >
            {/* Skyline silhouette, so the fallback still reads as a place. */}
            <svg
              viewBox="0 0 400 300"
              className="absolute inset-0 h-full w-full opacity-60"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <path
                d="M0 300V190h34v-52h30v52h28v-84h44v84h26v-40h38v40h30v-66h40v66h34v-30h32v30h30v-46h34v46Z"
                fill="rgba(0,0,0,0.42)"
              />
              <circle cx="322" cy="62" r="26" fill="rgba(255,255,255,0.16)" />
            </svg>

            {photo && (
              <Image
                src={photo}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            )}
          </div>

          {/* Gradient scrim keeps the location line legible on every photo. */}
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
            aria-hidden="true"
          />

          <div className="absolute left-3 top-3 flex gap-1.5">
            {/* Only first-party inventory may carry the verified badge. */}
            {listing.verified && listing.source !== "partner" && (
              <span className="nf-badge nf-badge--success">
                <UiIcon name="verified" size={12} strokeWidth={2.1} />
                {t.common.verified}
              </span>
            )}
            {/* Neutral, never a trust signal: it states where the stock is from. */}
            {isPartner && (
              <span
                data-partner-tag
                className="nf-badge bg-black/45 text-white/90 backdrop-blur-sm"
              >
                Partner
              </span>
            )}
            {listing.kind === "rental" && (
              <span className="nf-badge nf-badge--brand">{t.nav.rent}</span>
            )}
            {listing.instantBook && <span className="nf-badge nf-badge--warning">Instant</span>}
          </div>

          <p className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/90">
            <UiIcon name="location" size={13} className="shrink-0 text-white/70" />
            <span className="truncate">{where}</span>
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
              {listing.title}
            </h3>
            {/* A rating is shown when one exists. Never a 0.0 stand-in. */}
            {listing.rating > 0 && (
              <span className="nf-numeric flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold">
                <UiIcon name="star" size={14} className="text-[var(--nf-state-warning)]" />
                {listing.rating.toFixed(1)}
                <span className="font-normal text-[var(--nf-content-muted)]">
                  ({listing.reviewCount})
                </span>
              </span>
            )}
          </div>

          <ul className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.75rem] text-[var(--nf-content-secondary)]">
            {listing.bedrooms > 0 && (
              <li className="flex items-center gap-1.5">
                <UiIcon name="bed" size={15} />
                <span className="nf-numeric">{listing.bedrooms}</span>
              </li>
            )}
            {listing.bathrooms > 0 && (
              <li className="flex items-center gap-1.5">
                <UiIcon name="bath" size={15} />
                <span className="nf-numeric">{listing.bathrooms}</span>
              </li>
            )}
            {listing.amenities.slice(0, 2).map((a) =>
              AMENITY_ICON[a] ? (
                <li key={a} className="flex items-center gap-1.5">
                  <UiIcon name={AMENITY_ICON[a]!} size={15} />
                </li>
              ) : null,
            )}
          </ul>

          {hasPrice && (
            <p className="mt-3.5 flex items-baseline gap-1.5">
              <span className="nf-numeric text-[1.1875rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
                {formatMoney(listing.priceMinor, locale, listing.currency)}
              </span>
              <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
                /{" "}
                {perHead ? "guest" : listing.pricePeriod === "year" ? t.common.year : t.common.night}
              </span>
            </p>
          )}
        </div>
      </Link>
      {isPartner && <PartnerActions listing={listing} />}
    </article>
  );
}
