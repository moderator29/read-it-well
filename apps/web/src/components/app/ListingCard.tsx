import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Media placeholder.
 *
 * Real listing photography arrives with the media pipeline. Until then this
 * draws a deterministic gradient scene rather than pulling stock imagery, which
 * would misrepresent inventory and add an external asset dependency.
 */
const HUES: [string, string][] = [
  ["#4C1D95", "#1E1B4B"],
  ["#831843", "#1E1B4B"],
  ["#0C4A6E", "#111827"],
  ["#065F46", "#111827"],
  ["#7C2D12", "#1C1917"],
  ["#312E81", "#0F172A"],
];

const AMENITY_ICON: Record<string, UiIconName> = {
  pool: "pool",
  wifi: "wifi",
  kitchen: "kitchen",
  parking: "parking",
};

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

  return (
    <article className="nf-card nf-card--interactive group overflow-hidden">
      <Link href={`/listing/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {/* Media layer scales gently on hover; badges and scrim stay put. */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)` }}
          >
            {/* Skyline silhouette, so the placeholder still reads as a place. */}
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
          </div>

          {/* Gradient scrim keeps the location line legible on every hue. */}
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
            aria-hidden="true"
          />

          <div className="absolute left-3 top-3 flex gap-1.5">
            {listing.verified && (
              <span className="nf-badge nf-badge--success">
                <UiIcon name="verified" size={12} strokeWidth={2.1} />
                {t.common.verified}
              </span>
            )}
            {listing.instantBook && <span className="nf-badge nf-badge--warning">Instant</span>}
          </div>

          <p className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/90">
            <UiIcon name="location" size={13} className="shrink-0 text-white/70" />
            <span className="truncate">
              {listing.area}, {listing.city}
            </span>
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[0.9375rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
              {listing.title}
            </h3>
            <span className="nf-numeric flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold">
              <UiIcon name="star" size={14} className="text-[var(--nf-state-warning)]" />
              {listing.rating.toFixed(1)}
              <span className="font-normal text-[var(--nf-content-muted)]">
                ({listing.reviewCount})
              </span>
            </span>
          </div>

          <ul className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.75rem] text-[var(--nf-content-secondary)]">
            <li className="flex items-center gap-1.5">
              <UiIcon name="bed" size={15} />
              <span className="nf-numeric">{listing.bedrooms}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <UiIcon name="bath" size={15} />
              <span className="nf-numeric">{listing.bathrooms}</span>
            </li>
            {listing.amenities.slice(0, 2).map((a) =>
              AMENITY_ICON[a] ? (
                <li key={a} className="flex items-center gap-1.5">
                  <UiIcon name={AMENITY_ICON[a]!} size={15} />
                </li>
              ) : null,
            )}
          </ul>

          <p className="mt-3.5 flex items-baseline gap-1.5">
            <span className="nf-numeric text-[1.1875rem] font-bold tracking-tight text-[var(--nf-content-primary)]">
              {formatMoney(listing.priceMinor, locale, listing.currency)}
            </span>
            <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
              / {t.common.night}
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}
