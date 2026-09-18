import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { amenityLabel } from "@/components/app/filters/amenities";
import { ICON } from "@/components/app/Screen";

/**
 * The amenity tiles of 9E8B56ED: glass squares with a glyph and a word.
 *
 * Only what the lister stated. `limit` keeps the first row to the five the
 * render shows plus a "More" tile that jumps to the full list; with no limit
 * every amenity is drawn, which is what the Amenities section does.
 */
const AMENITY_ICON: Record<string, UiIconName> = {
  pool: "pool",
  wifi: "wifi",
  kitchen: "kitchen",
  parking: "parking",
  security: "verified",
  generator: "bolt",
  gym: "bolt",
  ac: "sparkle",
  tv: "picture",
  furnished: "home",
  balcony: "building-apartment",
  garden: "map",
  laundry: "sparkle",
  water: "sparkle",
  shower: "bath",
  breakfast: "utensils",
  workspace: "document",
  elevator: "arrow-up",
};

export function ListingAmenityTiles({
  amenities,
  limit,
  moreHref,
  moreLabel,
}: {
  amenities: string[];
  limit?: number;
  moreHref?: string;
  moreLabel?: string;
}) {
  if (amenities.length === 0) return null;
  const shown = limit ? amenities.slice(0, limit) : amenities;
  const remainder = amenities.length - shown.length;
  return (
    <ul className="nf-amenity-grid" data-testid="amenity-tiles">
      {shown.map((code) => (
        <li key={code} className="nf-amenity-tile">
          <UiIcon name={AMENITY_ICON[code] ?? "sparkle"} size={ICON.row} />
          <span>{amenityLabel(code)}</span>
        </li>
      ))}
      {remainder > 0 && moreHref && (
        <li>
          <a href={moreHref} className="nf-amenity-tile h-full">
            <UiIcon name="more" size={ICON.row} />
            <span>
              {moreLabel ?? "More"} (+{remainder})
            </span>
          </a>
        </li>
      )}
    </ul>
  );
}
