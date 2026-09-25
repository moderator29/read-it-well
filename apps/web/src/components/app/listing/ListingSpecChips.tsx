import { formatNumber, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import type { Listing } from "@/lib/listings/types";
import { ICON } from "@/components/app/Screen";

/**
 * The spec chips under the price (7B5335E0): beds, baths, floor area,
 * parking, backup power. Each one is a fact the lister stated; a fact they
 * did not state is not drawn, so the row is as long as the truth.
 */
export type SpecChip = { key: string; icon: UiIconName; label: string };

export function specChips(listing: Listing, t: Dictionary, locale: Locale): SpecChip[] {
  const chips: SpecChip[] = [];
  const copy = t.catalogue.detail;
  if (listing.bedrooms > 0) {
    chips.push({
      key: "beds",
      icon: "bed",
      label: plural(listing.bedrooms, t.units.beds, locale),
    });
  }
  if (listing.bathrooms > 0) {
    chips.push({
      key: "baths",
      icon: "bath",
      label: plural(listing.bathrooms, t.units.baths, locale),
    });
  }
  if (listing.sizeSqm !== undefined && listing.sizeSqm > 0) {
    chips.push({
      key: "size",
      icon: "grid",
      label: `${formatNumber(listing.sizeSqm, locale)} ${t.catalogue.card.sqm}`,
    });
  }
  if (listing.parkingSpaces !== undefined && listing.parkingSpaces > 0) {
    chips.push({ key: "parking", icon: "parking", label: copy.parking });
  }
  const backup = listing.utilities?.powerBackup;
  if (backup && backup !== "NONE") {
    chips.push({ key: "power", icon: "bolt", label: copy.generator });
  }
  if (listing.maxGuests !== undefined && listing.maxGuests > 0 && listing.pricePeriod === "night") {
    chips.push({
      key: "guests",
      icon: "user",
      label: plural(listing.maxGuests, t.units.guests, locale),
    });
  }
  return chips;
}

export function ListingSpecChips({ chips }: { chips: SpecChip[] }) {
  if (chips.length === 0) return null;
  /* Five or fewer share the width, as 7B5335E0 draws them; more scroll. */
  const fit = chips.length <= 5;
  return (
    <ul className={`nf-spec-row ${fit ? "nf-spec-row--fit" : "nf-scroll-x"}`} data-testid="spec-chips">
      {chips.map((chip) => (
        <li key={chip.key} className="nf-spec-tile">
          <UiIcon name={chip.icon} size={ICON.inline} />
          <span>{chip.label}</span>
        </li>
      ))}
    </ul>
  );
}
