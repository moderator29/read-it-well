import Link from "next/link";
import { formatMoney, type Locale } from "@vallo/i18n";
import {
  KIND_NOUN,
  activeFilterCount,
  clearedFilters,
  toSearchHref,
  WATER_LABEL,
  type DiscoveryQuery,
} from "@/lib/listings/search-params";
import { amenityLabel } from "./amenities";

/**
 * What is currently narrowing the results, and how to undo any of it.
 *
 * Each chip is a link to the same search minus one filter, so removing a
 * constraint is a normal navigation: shareable, reversible with the back
 * button, and legible to a screen reader as "remove" rather than as a mystery
 * cross. The cross itself is drawn geometry, not an icon, because the icon
 * tiers are for content and navigation.
 */
function RemoveChip({
  href,
  label,
  removes,
  testId,
}: {
  href: string;
  label: string;
  removes: string;
  testId: string;
}) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        prefetch
        data-testid={testId}
        className="nf-chip min-h-11 whitespace-nowrap py-1.5 pr-3 text-[0.8125rem]"
      >
        <span>{label}</span>
        <span className="sr-only">Remove {removes}</span>
        <span
          aria-hidden="true"
          className="relative block h-4 w-4 rounded-full bg-[var(--nf-surface-inset)]"
        >
          <span className="absolute left-1/2 top-1/2 h-[1.5px] w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
          <span className="absolute left-1/2 top-1/2 h-[1.5px] w-2 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
        </span>
      </Link>
    </li>
  );
}

export function ActiveFilters({
  query,
  locale,
}: {
  query: DiscoveryQuery;
  locale: Locale;
}) {
  const chips: React.ReactNode[] = [];

  if (query.q) {
    chips.push(
      <RemoveChip
        key="q"
        testId="active-q"
        href={toSearchHref({ ...query, q: undefined })}
        label={`“${query.q}”`}
        removes="this search text"
      />,
    );
  }

  if (query.kind) {
    const noun = KIND_NOUN[query.kind];
    chips.push(
      <RemoveChip
        key="kind"
        testId="active-kind"
        href={toSearchHref({ ...query, kind: undefined })}
        label={noun.many.charAt(0).toUpperCase() + noun.many.slice(1)}
        removes="this category"
      />,
    );
  }

  if (query.minMinor !== undefined || query.maxMinor !== undefined) {
    const label =
      query.minMinor === undefined
        ? `Up to ${formatMoney(query.maxMinor ?? 0, locale)}`
        : query.maxMinor === undefined
          ? `${formatMoney(query.minMinor, locale)} and above`
          : `${formatMoney(query.minMinor, locale)} to ${formatMoney(query.maxMinor, locale)}`;
    chips.push(
      <RemoveChip
        key="price"
        testId="active-price"
        href={toSearchHref({ ...query, minMinor: undefined, maxMinor: undefined })}
        label={label}
        removes="this price range"
      />,
    );
  }

  if (query.bedrooms !== undefined) {
    chips.push(
      <RemoveChip
        key="beds"
        testId="active-beds"
        href={toSearchHref({ ...query, bedrooms: undefined })}
        label={`${query.bedrooms}+ bedrooms`}
        removes="the bedroom minimum"
      />,
    );
  }

  if (query.bathrooms !== undefined) {
    chips.push(
      <RemoveChip
        key="baths"
        testId="active-baths"
        href={toSearchHref({ ...query, bathrooms: undefined })}
        label={`${query.bathrooms}+ bathrooms`}
        removes="the bathroom minimum"
      />,
    );
  }

  if (query.guests !== undefined) {
    chips.push(
      <RemoveChip
        key="guests"
        testId="active-guests"
        href={toSearchHref({ ...query, guests: undefined })}
        label={`${query.guests}+ guests`}
        removes="the party size"
      />,
    );
  }

  for (const code of query.amenities) {
    chips.push(
      <RemoveChip
        key={`amenity-${code}`}
        testId={`active-amenity-${code}`}
        href={toSearchHref({
          ...query,
          amenities: query.amenities.filter((c) => c !== code),
        })}
        label={amenityLabel(code)}
        removes={amenityLabel(code)}
      />,
    );
  }

  if (query.instantBook) {
    chips.push(
      <RemoveChip
        key="instant"
        testId="active-instant"
        href={toSearchHref({ ...query, instantBook: false })}
        label="Instant book"
        removes="instant book only"
      />,
    );
  }

  if (query.verifiedOnly) {
    chips.push(
      <RemoveChip
        key="verified"
        testId="active-verified"
        href={toSearchHref({ ...query, verifiedOnly: false })}
        label="Verified only"
        removes="verified only"
      />,
    );
  }

  if (query.powerBackup) {
    chips.push(
      <RemoveChip
        key="power-backup"
        testId="active-power-backup"
        href={toSearchHref({ ...query, powerBackup: false })}
        label="Backup power"
        removes="the backup power requirement"
      />,
    );
  }

  if (query.powerBandA) {
    chips.push(
      <RemoveChip
        key="power-band-a"
        testId="active-power-band-a"
        href={toSearchHref({ ...query, powerBandA: false })}
        label="Band A feeder"
        removes="the Band A requirement"
      />,
    );
  }

  /* One chip per source, each removing only itself, because these are
     alternatives: dropping "tanker" from "borehole or tanker" leaves a search
     that still means something, and a single lumped chip would make undoing
     one of them impossible without clearing both. */
  for (const source of query.waterSupply) {
    chips.push(
      <RemoveChip
        key={`water-${source}`}
        testId={`active-water-${source.toLowerCase()}`}
        href={toSearchHref({
          ...query,
          waterSupply: query.waterSupply.filter((v) => v !== source),
        })}
        label={WATER_LABEL[source]}
        removes={WATER_LABEL[source]}
      />,
    );
  }

  if (chips.length === 0) return null;

  return (
    <div className="nf-scroll-x -mx-5 mt-3 md:-mx-8">
      <ul
        aria-label="Active filters"
        data-testid="active-filters"
        className="flex items-center gap-2 px-5 md:px-8"
      >
        {chips}
        {activeFilterCount(query) > 0 && (
          <li className="shrink-0">
            <Link
              href={toSearchHref(clearedFilters(query))}
              prefetch
              data-testid="active-clear-all"
              className="inline-flex min-h-11 items-center px-2 text-[0.8125rem] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
            >
              Clear all
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
